import { Injectable } from '@nestjs/common';

export type CachedResult<T> = {
  value: T;
  generatedAt: string;
  cacheAgeSeconds: number;
};

type CacheEntry<T> = {
  value: T;
  generatedAt: number;
  expiresAt: number;
};

@Injectable()
export class AdminQueryCacheService {
  private readonly values = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Promise<CacheEntry<unknown>>>();

  async remember<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs = 60_000,
  ): Promise<CachedResult<T>> {
    const now = Date.now();
    const cached = this.values.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) return this.result(cached, now);

    let request = this.pending.get(key) as Promise<CacheEntry<T>> | undefined;
    if (!request) {
      request = loader().then((value) => {
        const generatedAt = Date.now();
        const entry: CacheEntry<T> = {
          value,
          generatedAt,
          expiresAt: generatedAt + ttlMs,
        };
        this.values.set(key, entry);
        return entry;
      });
      this.pending.set(key, request as Promise<CacheEntry<unknown>>);
      void request.then(
        () => this.pending.delete(key),
        () => this.pending.delete(key),
      );
    }

    return this.result(await request, Date.now());
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.values.clear();
      return;
    }
    for (const key of this.values.keys()) {
      if (key.startsWith(prefix)) this.values.delete(key);
    }
  }

  private result<T>(entry: CacheEntry<T>, now: number): CachedResult<T> {
    return {
      value: entry.value,
      generatedAt: new Date(entry.generatedAt).toISOString(),
      cacheAgeSeconds: Math.max(
        0,
        Math.floor((now - entry.generatedAt) / 1000),
      ),
    };
  }
}
