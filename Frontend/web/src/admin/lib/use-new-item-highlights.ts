import { useCallback, useEffect, useMemo, useState } from "react";

type HighlightItem = {
  id: string;
  createdAtMs: number;
  actionable: boolean;
};

type HighlightState = {
  baselineAt: number;
  seenIds: string[];
};

const STORAGE_PREFIX = "smart-credit:admin:new-items:";

// ADMIN: Load seen items - reads which records this browser has already opened.
function readState(key: string): HighlightState | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HighlightState>;
    if (!Number.isFinite(parsed.baselineAt)) return null;
    return {
      baselineAt: Number(parsed.baselineAt),
      seenIds: Array.isArray(parsed.seenIds)
        ? parsed.seenIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function writeState(key: string, state: HighlightState) {
  window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(state));
}

export function toEpochMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const timestamp = value as {
      _seconds?: number;
      seconds?: number;
      toDate?: () => Date;
    };
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().getTime();
    }
    const seconds = timestamp._seconds ?? timestamp.seconds;
    return typeof seconds === "number" ? seconds * 1000 : 0;
  }
  return 0;
}

export function useNewItemHighlights(
  key: string,
  items: HighlightItem[],
  ready: boolean,
) {
  const [state, setState] = useState<HighlightState | null>(() =>
    readState(key),
  );

  useEffect(() => {
    // ADMIN: Start new item tracking - saves the time of the first page visit.
    if (!ready || state) return;
    const initial = { baselineAt: Date.now(), seenIds: [] };
    writeState(key, initial);
    setState(initial);
  }, [key, ready, state]);

  const newIds = useMemo(() => {
    // ADMIN: Find new items - highlights only new, pending, and unseen records.
    if (!state) return new Set<string>();
    const seen = new Set(state.seenIds);
    return new Set(
      items
        .filter(
          (item) =>
            item.actionable &&
            item.createdAtMs > state.baselineAt &&
            !seen.has(item.id),
        )
        .map((item) => item.id),
    );
  }, [items, state]);

  const markSeen = useCallback(
    (id: string) => {
      // ADMIN: Mark item as seen - removes the highlight after the admin opens it.
      setState((current) => {
        if (!current || current.seenIds.includes(id)) return current;
        const next = {
          ...current,
          seenIds: [...current.seenIds, id].slice(-250),
        };
        writeState(key, next);
        return next;
      });
    },
    [key],
  );

  return {
    isNew: (id: string) => newIds.has(id),
    markSeen,
    newCount: newIds.size,
  };
}
