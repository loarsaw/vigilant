import { useCallback, useEffect, useRef, useState } from "react";
import {
  VigilantApiError,
  VigilantNetworkError,
  type ApplyPayload,
  type ApplyResponse,
  type ListPositionsParams,
  type Position,
} from "vigilant-jobs-client";
import { useVigilantClient } from "./context";

type AsyncError = VigilantApiError | VigilantNetworkError | Error;

export interface UsePositionsResult {
  positions: Position[];
  loading: boolean;
  error: AsyncError | null;
  refetch: () => void;
}

/** Fetch the list of open positions. Public route, no auth needed. */
export function usePositions(params?: ListPositionsParams): UsePositionsResult {
  const client = useVigilantClient();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AsyncError | null>(null);
  // Avoids re-fetching every render when the caller passes a fresh object literal.
  const paramsKey = JSON.stringify(params ?? {});

  const fetchPositions = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    client
      .listPositions(params)
      .then((data) => {
        if (!cancelled) setPositions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, paramsKey]);

  useEffect(() => fetchPositions(), [fetchPositions]);

  return { positions, loading, error, refetch: fetchPositions };
}

export interface UsePositionResult {
  position: Position | null;
  loading: boolean;
  error: AsyncError | null;
  refetch: () => void;
}

/** Fetch a single position by id. Public route, no auth needed. */
export function usePosition(id: string | number | null | undefined): UsePositionResult {
  const client = useVigilantClient();
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<AsyncError | null>(null);

  const fetchPosition = useCallback(() => {
    if (id === null || id === undefined) {
      setPosition(null);
      setLoading(false);
      return () => {};
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    client
      .getPosition(id)
      .then((data) => {
        if (!cancelled) setPosition(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, id]);

  useEffect(() => fetchPosition(), [fetchPosition]);

  return { position, loading, error, refetch: fetchPosition };
}

export interface UseApplyResult {
  apply: (positionId: string | number, payload: ApplyPayload) => Promise<ApplyResponse | undefined>;
  loading: boolean;
  error: AsyncError | null;
  data: ApplyResponse | null;
  reset: () => void;
}

/**
 * Submit an application. Doesn't run automatically — call `apply()` from
 * a submit handler, e.g.:
 *
 * const { apply, loading, error, data } = useApply();
 * <form onSubmit={async (e) => { e.preventDefault(); await apply(positionId, values); }}>
 */
export function useApply(): UseApplyResult {
  const client = useVigilantClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AsyncError | null>(null);
  const [data, setData] = useState<ApplyResponse | null>(null);
  // Guards against setting state after unmount if a submit is in flight.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const apply = useCallback(
    async (positionId: string | number, payload: ApplyPayload) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.apply(positionId, payload);
        if (mountedRef.current) setData(result);
        return result;
      } catch (err) {
        if (mountedRef.current) setError(err as AsyncError);
        return undefined;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setLoading(false);
  }, []);

  return { apply, loading, error, data, reset };
}
