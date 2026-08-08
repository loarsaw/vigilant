/**
 * A job position as returned by GET /api/v1/public/positions
 * and GET /api/v1/public/positions/:id.
 *
 * The exact field set depends on your backend DTO — this is a
 * reasonable superset based on the route names. Extend/adjust
 * to match your real `ListPositions` / `GetPositionByID` response
 * once you have it, or just rely on the index signature below.
 */
export interface Position {
  id: string | number;
  title: string;
  description?: string;
  department?: string;
  location?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  // Allows any extra fields your backend actually sends without
  // breaking consumers — remove this once the DTO is locked down.
  [key: string]: unknown;
}

export interface ListPositionsParams {
  active?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Payload sent to POST /api/v1/positions/:position_id/apply.
 * Adjust required fields once you confirm the real request shape.
 */
export interface ApplyPayload {
  name?: string;
  email?: string;
  phone?: string;
  resume_url?: string;
  cover_letter?: string;
  [key: string]: unknown;
}

export interface ApplyResponse {
  application_id?: string | number;
  status?: string;
  [key: string]: unknown;
}

export interface VigilantClientConfig {
  /** e.g. "https://api.yourapp.com" — no trailing slash needed */
  baseUrl: string;
  /**
   * Static bearer token, used if set and getToken is not provided.
   * Leave unset for fully anonymous usage (fetch + apply are open).
   */
  token?: string | null;
  /**
   * Called before each request to resolve a fresh token.
   * Takes priority over the static `token` option if both are set.
   */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  /** Override fetch (useful for SSR, testing, or custom runtimes) */
  fetchImpl?: typeof fetch;
  /** Extra headers merged into every request */
  headers?: Record<string, string>;
}
