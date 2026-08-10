import { VigilantApiError, VigilantNetworkError } from "./errors";
import type {
  ApplyPayload,
  ApplyResponse,
  ListPositionsParams,
  Position,
  VigilantClientConfig,
} from "./types";

export class VigilantClient {
  private baseUrl: string;
  private token: string | null;
  private getToken?: VigilantClientConfig["getToken"];
  private fetchImpl: typeof fetch;
  private extraHeaders: Record<string, string>;

  constructor(config: VigilantClientConfig) {
    if (!config.baseUrl) {
      throw new Error("VigilantClient: `baseUrl` is required");
    }
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.token = config.token ?? null;
    this.getToken = config.getToken;
    this.extraHeaders = config.headers ?? {};

    const runtimeFetch = config.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
    if (!runtimeFetch) {
      throw new Error(
        "VigilantClient: no `fetch` available in this environment. Pass `fetchImpl` explicitly."
      );
    }
    this.fetchImpl = runtimeFetch;
  }

  /** Update the static token used for future .requests. */
  setToken(token: string | null): void {
    this.token = token;
  }

  private async resolveToken(): Promise<string | null | undefined> {
    if (this.getToken) return this.getToken();
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.resolveToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.extraHeaders,
      ...(options.headers as Record<string, string> | undefined),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, { ...options, headers });
    } catch (err) {
      throw new VigilantNetworkError(
        `Network request to ${path} failed: ${(err as Error)?.message ?? "unknown error"}`,
        err
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const body = isJson
      ? await res.json().catch(() => null)
      : await res.text().catch(() => null);

    if (!res.ok) {
      const message =
        body && typeof body === "object" && "message" in (body as Record<string, unknown>)
          ? String((body as Record<string, unknown>).message)
          : `Request to ${path} failed with status ${res.status}`;
      throw new VigilantApiError(message, res.status, body);
    }

    return body as T;
  }

  private buildQuery(params?: Record<string, unknown>): string {
    if (!params) return "";
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return "";
    const search = new URLSearchParams();
    for (const [key, value] of entries) search.set(key, String(value));
    return `?${search.toString()}`;
  }

  /** GET /api/v1/public/positions — public, no auth required. */
  listPositions(params?: ListPositionsParams): Promise<Position[]> {
    const query = this.buildQuery(params as Record<string, unknown>);
    return this.request<Position[]>(`/api/v1/public/positions${query}`, { method: "GET" });
  }

  /** GET /api/v1/public/positions/:id — public, no auth required. */
  getPosition(id: string | number): Promise<Position> {
    return this.request<Position>(`/api/v1/public/positions/${encodeURIComponent(id)}`, {
      method: "GET",
    });
  }

  /**
   * POST /api/v1/positions/:position_id/apply
   * Submits an application for a position.
   */
  apply(positionId: string | number, payload: ApplyPayload): Promise<ApplyResponse> {
    return this.request<ApplyResponse>(
      `/api/v1/positions/${encodeURIComponent(positionId)}/apply`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }
}
