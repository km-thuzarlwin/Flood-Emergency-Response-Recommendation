/**
 * API error model. Every failure path returns an explicit status + machine code
 * + human detail — never a guessed or partial success (NFR-1 / doc 5 §12.3).
 */

export type ApiErrorCode =
  | "invalid_request" // 422 — missing/invalid field, unknown township_id
  | "incomplete_assessment" // 422 — Prolog could not prove severity
  | "not_found" // 404
  | "conflict" // 409 — illegal lifecycle transition
  | "prolog_unavailable" // 503 — reasoning service unreachable/malformed
  | "internal_error"; // 500

const STATUS: Record<ApiErrorCode, number> = {
  invalid_request: 422,
  incomplete_assessment: 422,
  not_found: 404,
  conflict: 409,
  prolog_unavailable: 503,
  internal_error: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: err.code, detail: err.message, ...(err.details ? { details: err.details } : {}) },
      { status: err.status },
    );
  }
  // Unexpected — do not leak internals, do not pretend success.
  console.error("[ferrs] unhandled error:", err);
  return Response.json(
    { error: "internal_error", detail: "An unexpected error occurred." },
    { status: 500 },
  );
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}
