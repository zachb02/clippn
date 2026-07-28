import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * Direct local Postgres access. Clippn has no hosted backend: every clone
 * runs its own local database, so there is no per-request auth/session to
 * broker through -- this is a plain connection pool, not a multi-tenant
 * client.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
