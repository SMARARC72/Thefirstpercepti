/**
 * Phase 21 / OPS-502 — Database client singleton.
 *
 * Uses porsager's `postgres` SDK pointed at POSTGRES_URL (Supabase pooled
 * connection string set by the Vercel↔Supabase integration).
 *
 * Critical Supabase pooler note: the transaction-mode pooler (port 6543)
 * does NOT support prepared statements. We set `prepare: false` to disable
 * them. Without this, queries fail with "prepared statement does not exist".
 *
 * Connection-pool discipline: module-level singleton so warm serverless
 * invocations reuse the connection across calls in the same Lambda instance.
 */
import postgres from "postgres";

function makeSql() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "POSTGRES_URL is not set. The Vercel↔Supabase integration should set this " +
      "automatically. Check Vercel dashboard → Settings → Environment Variables."
    );
  }
  return postgres(url, {
    prepare: false,        // required for Supabase transaction pooler (port 6543)
    max: 1,                // serverless: 1 connection per Lambda instance
    idle_timeout: 20,      // close idle conns after 20s
    connect_timeout: 10,   // fail fast on connect issues
  });
}

// Module-level singleton. Re-used across warm invocations.
export const sql = makeSql();
