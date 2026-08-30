/**
 * Runs once when the Next.js server starts. We use it to warm the DB pool in the
 * background — the Supabase pooler is a region away and the first connection
 * takes ~6s, which we'd rather pay at boot than on the first user click.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    void import("./lib/db").then(({ warmup }) => warmup());
  }
}
