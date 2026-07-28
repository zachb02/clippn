import { query } from "./db";

/**
 * Clippn has no accounts. Each local clone is a single-user instance, so
 * there is exactly one profile row, created on first use and reused for
 * every project/asset/connection from then on -- there is no login to
 * derive an id from.
 */
const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function getOrCreateLocalUserId(): Promise<string> {
  await query(
    `insert into profiles (id, display_name)
     values ($1, 'Local user')
     on conflict (id) do nothing`,
    [LOCAL_USER_ID]
  );
  return LOCAL_USER_ID;
}
