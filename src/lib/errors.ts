/** Error types shared by validators and API routes (pure module, safe anywhere). */
export type ApiStatus = 400 | 401 | 402 | 403 | 404 | 409 | 410 | 413 | 415 | 422 | 429 | 502 | 503;

/** Expected, user-facing error (its message is safe to show). */
export class ApiError extends Error {
  constructor(public status: ApiStatus, message: string) {
    super(message);
  }
}

/** Invalid user input (always 400). */
export class ValidationError extends ApiError {
  constructor(message: string) {
    super(400, message);
  }
}
