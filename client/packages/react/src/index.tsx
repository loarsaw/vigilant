export { VigilantProvider, useVigilantClient } from './context';
export type { VigilantProviderProps } from './context';
export { usePositions, usePosition, useApply } from './hooks';
export type {
  UsePositionsResult,
  UsePositionResult,
  UseApplyResult,
} from './hooks';

export {
  VigilantClient,
  VigilantApiError,
  VigilantNetworkError,
} from 'vigilant-jobs-client';
export type {
  Position,
  ListPositionsParams,
  ApplyPayload,
  ApplyResponse,
  VigilantClientConfig,
} from 'vigilant-jobs-client';
