import { createSSEConnection } from '@/lib/axios';
import { useEffect, useRef } from 'react';



interface UseSSEOptions<T> {
  path?: string;
  type: string;
  handler: (payload: T) => void;
  enabled?: boolean;
}

export function useSSE<T = unknown>({
  path = '/events',
  type,
  handler,
  enabled = true,
}: UseSSEOptions<T>) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const close = createSSEConnection(
      path,
      (msgType, payload) => {
        if (msgType === type) {
          handlerRef.current(payload as T);
        }
      }
    );

    return close;
  }, [path, type, enabled]);
}