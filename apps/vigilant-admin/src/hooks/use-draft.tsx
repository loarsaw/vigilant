import { useEffect, useRef, useState } from "react";
import { UseDraftPersistenceOptions } from "./types";

export function useDraftPersistence<T>({
  key,
  data,
  enabled,
  debounceMs = 400,
}: UseDraftPersistenceOptions<T>) {
  const [hasDraft, setHasDraft] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(key);
      setHasDraft(!!raw);
    } catch {
      setHasDraft(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {}
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, enabled, key, debounceMs]);

  const loadDraft = (): T | null => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(key);
    } catch {}
    setHasDraft(false);
  };

  return { hasDraft, loadDraft, clearDraft };
}
