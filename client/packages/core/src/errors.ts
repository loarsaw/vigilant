export class VigilantApiError extends Error {
  /** HTTP status code returned by the server */
  status: number;
  /** Parsed JSON body (or raw text) of the error response, if any */
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "VigilantApiError";
    this.status = status;
    this.body = body;
  }
}

export class VigilantNetworkError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "VigilantNetworkError";
    this.cause = cause;
  }
}
