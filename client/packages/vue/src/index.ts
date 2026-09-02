export { createVigilantPlugin, provideVigilantClient, useVigilantClient } from "./plugin";
export { usePositions, usePosition, useApply } from "./composables";
export type { UsePositionsResult, UsePositionResult, UseApplyResult } from "./composables";

// Re-export the underlying client + types for convenience so most apps
// only need to depend on this one package.
export {
  VigilantClient,
  VigilantApiError,
  VigilantNetworkError,
} from "vigilant-jobs-client";
export type {
  Position,
  ListPositionsParams,
  ApplyPayload,
  ApplyResponse,
  VigilantClientConfig,
} from "vigilant-jobs-client";
