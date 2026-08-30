import postgres from "postgres";
import { env } from "./env";

/**
 * Lazily-created, single postgres.js client per process.
 *
 * Lazy: the client is built on first use, never at import time — so `next build`
 * can evaluate route modules without a real DATABASE_URL, and tests that import
 * this module don't open a pool.
 *
 * Single: Next.js hot-reload would otherwise open a new pool on every edit and
 * exhaust the Supabase pooler.
 *
 * postgres.js is used directly rather than an ORM: the FERRS query surface is
 * small, and the atomic reservation (doc 2 §11 / NFR-3) is clearest as an
 * explicit `sql.begin(...)` with `SELECT ... FOR UPDATE`.
 *
 * Note: `numeric` and `int8` come back as strings from postgres.js — cast in the
 * query (e.g. `distance::float8`) where a JS number is needed.
 */
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

function createClient(): postgres.Sql {
  const client = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connection: { application_name: "ferrs-web" },
    // Supabase transaction pooler (port 6543): named prepared statements are not
    // supported. All FERRS multi-statement work is inside a single sql.begin()
    // transaction, which the transaction pooler pins to one server connection —
    // so FOR UPDATE and pg_advisory_xact_lock still behave correctly.
    prepare: false,
    ssl: "require",
  });
  if (process.env.NODE_ENV !== "production") globalForDb.sql = client;
  return client;
}

function getClient(): postgres.Sql {
  return (globalForDb.sql ??= createClient());
}

/**
 * Tagged-template SQL client. Usage is identical to a normal postgres.js handle:
 *   await sql`select 1`
 *   await sql.begin(async (tx) => { ... })
 */
export const sql: postgres.Sql = new Proxy(function () {} as unknown as postgres.Sql, {
  apply(_target, _thisArg, args: unknown[]) {
    return (getClient() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop: string | symbol) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});
