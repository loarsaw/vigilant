import { isRef, ref, unref, watch, type Ref } from "vue";
import {
  VigilantApiError,
  VigilantNetworkError,
  type ApplyPayload,
  type ApplyResponse,
  type ListPositionsParams,
  type Position,
} from "vigilant-jobs-client";
import { useVigilantClient } from "./plugin";

type AsyncError = VigilantApiError | VigilantNetworkError | Error;

export interface UsePositionsResult {
  positions: Ref<Position[]>;
  loading: Ref<boolean>;
  error: Ref<AsyncError | null>;
  refetch: () => void;
}

/** Fetch the list of open positions. Public route, no auth needed. */
export function usePositions(params?: ListPositionsParams): UsePositionsResult {
  const client = useVigilantClient();
  const positions = ref<Position[]>([]) as Ref<Position[]>;
  const loading = ref(true);
  const error = ref<AsyncError | null>(null) as Ref<AsyncError | null>;

  const fetchPositions = () => {
    loading.value = true;
    error.value = null;
    client
      .listPositions(params)
      .then((data) => {
        positions.value = data;
      })
      .catch((err) => {
        error.value = err;
      })
      .finally(() => {
        loading.value = false;
      });
  };

  fetchPositions();

  return { positions, loading, error, refetch: fetchPositions };
}

export interface UsePositionResult {
  position: Ref<Position | null>;
  loading: Ref<boolean>;
  error: Ref<AsyncError | null>;
  refetch: () => void;
}

/**
 * Fetch a single position by id. Public route, no auth needed.
 * `id` can be a plain value or a Ref — passing a Ref lets the composable
 * automatically refetch when it changes (e.g. driven by a route param).
 */
export function usePosition(id: string | number | Ref<string | number>): UsePositionResult {
  const client = useVigilantClient();
  const position = ref<Position | null>(null) as Ref<Position | null>;
  const loading = ref(true);
  const error = ref<AsyncError | null>(null) as Ref<AsyncError | null>;

  const fetchPosition = () => {
    const currentId = unref(id);
    loading.value = true;
    error.value = null;
    client
      .getPosition(currentId)
      .then((data) => {
        position.value = data;
      })
      .catch((err) => {
        error.value = err;
      })
      .finally(() => {
        loading.value = false;
      });
  };

  fetchPosition();

  if (isRef(id)) {
    watch(id, () => fetchPosition());
  }

  return { position, loading, error, refetch: fetchPosition };
}

export interface UseApplyResult {
  apply: (positionId: string | number, payload: ApplyPayload) => Promise<ApplyResponse | undefined>;
  loading: Ref<boolean>;
  error: Ref<AsyncError | null>;
  data: Ref<ApplyResponse | null>;
  reset: () => void;
}

/**
 * Submit an application. Doesn't run automatically — call `apply()` from
 * a submit handler, e.g.:
 *
 * const { apply, loading, error, data } = useApply();
 * async function onSubmit() { await apply(positionId, form.value); }
 */
export function useApply(): UseApplyResult {
  const client = useVigilantClient();
  const loading = ref(false);
  const error = ref<AsyncError | null>(null) as Ref<AsyncError | null>;
  const data = ref<ApplyResponse | null>(null) as Ref<ApplyResponse | null>;

  const apply = async (positionId: string | number, payload: ApplyPayload) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await client.apply(positionId, payload);
      data.value = result;
      return result;
    } catch (err) {
      error.value = err as AsyncError;
      return undefined;
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    error.value = null;
    data.value = null;
    loading.value = false;
  };

  return { apply, loading, error, data, reset };
}
