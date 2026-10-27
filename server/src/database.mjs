import { createClient } from '@libsql/client';
export async function database(
  url = process.env.DATABASE_URL || 'file:brainpal.db',
) {
  if (/^postgres(?:ql)?:\/\//.test(url)) {
    const { postgresDatabase } = await import('./postgres.mjs');
    return postgresDatabase(url);
  }
  if (process.env.VERCEL && url.startsWith('file:')) {
    throw new Error(
      'Vercel requires a persistent DATABASE_URL, not a local file.',
    );
  }
  const db = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  await db.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS friendships(a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(a,b));
    CREATE TABLE IF NOT EXISTS invites(code TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL, accepted INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS stats(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL, count INTEGER NOT NULL, splits TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY(user_id,day));
    CREATE TABLE IF NOT EXISTS quotas(bucket TEXT NOT NULL, day TEXT NOT NULL, used INTEGER NOT NULL, PRIMARY KEY(bucket,day));
  `);
  return db;
}
export async function quota(db, bucket, limit) {
  const result = await db.execute({
    sql: 'INSERT INTO quotas(bucket,day,used) VALUES(?,?,1) ON CONFLICT(bucket,day) DO UPDATE SET used=quotas.used+1 WHERE quotas.used < ? RETURNING used',
    args: [bucket, new Date().toISOString().slice(0, 10), limit],
  });
  if (!result.rows.length) {
    throw Object.assign(
      new Error('Daily request limit reached. Local detection continues.'),
      { status: 429 },
    );
  }
}
