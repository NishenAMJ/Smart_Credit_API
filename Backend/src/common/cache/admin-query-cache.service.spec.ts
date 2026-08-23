import { AdminQueryCacheService } from './admin-query-cache.service';

describe('AdminQueryCacheService', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(1_000));
  afterEach(() => jest.useRealTimers());

  it('deduplicates concurrent loads and expires after the TTL', async () => {
    const cache = new AdminQueryCacheService();
    const loader = jest.fn(async () => ({ total: loader.mock.calls.length }));

    const [first, second] = await Promise.all([
      cache.remember('dashboard', loader, 60_000),
      cache.remember('dashboard', loader, 60_000),
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(second.value).toEqual(first.value);

    jest.setSystemTime(62_000);
    await cache.remember('dashboard', loader, 60_000);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not retain rejected loads', async () => {
    const cache = new AdminQueryCacheService();
    const loader = jest
      .fn<Promise<number>, []>()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(2);

    await expect(cache.remember('report', loader)).rejects.toThrow('failed');
    await expect(cache.remember('report', loader)).resolves.toMatchObject({
      value: 2,
    });
  });
});
