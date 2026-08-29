/**
 * Runtime environment access. Fail loudly on a missing critical var rather than
 * limping along with `undefined` (NFR-1: fail-safe over confident-but-wrong).
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy web/.env.example to web/.env and fill it in.`,
    );
  }
  return value;
}

export const PROLOG_DEFAULT_URL = "http://localhost:4321";

export const env = {
  /** Supabase Session-pooler connection string. */
  get DATABASE_URL(): string {
    return required("DATABASE_URL");
  },
  /** Base URL of the FERRS Prolog reasoning service (Phase 2). */
  get FERRS_PROLOG_URL(): string {
    return process.env.FERRS_PROLOG_URL?.trim() || PROLOG_DEFAULT_URL;
  },
};
