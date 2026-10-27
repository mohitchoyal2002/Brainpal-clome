import pg from 'pg';

const schema = `
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS friendships(a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(a,b));
CREATE TABLE IF NOT EXISTS invites(code TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires BIGINT NOT NULL, accepted BIGINT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS stats(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL, count BIGINT NOT NULL, splits TEXT NOT NULL, updated BIGINT NOT NULL, PRIMARY KEY(user_id,day));
CREATE TABLE IF NOT EXISTS quotas(bucket TEXT NOT NULL, day TEXT NOT NULL, used BIGINT NOT NULL, PRIMARY KEY(bucket,day));
`;

function statement(input) {
  let sql = typeof input === 'string' ? input : input.sql;
  const args = typeof input === 'string' ? [] : input.args || [];
  // These statements are internal constants. All request values remain bound parameters.
  const ignore = /^INSERT OR IGNORE INTO /i.test(sql);
  if (ignore)
    sql =
      sql.replace(/^INSERT OR IGNORE INTO /i, 'INSERT INTO ') +
      ' ON CONFLICT DO NOTHING';
  let parameter = 0;
  sql = sql.replace(/\?/g, () => '$' + ++parameter);
  return { sql, args };
}

function executor(connection) {
  return async input => {
    const { sql, args } = statement(input);
    return connection.query(sql, args);
  };
}

/** Match the small libSQL interface used by the API, with real Postgres transactions. */
export async function createPostgresDatabase(pool) {
  // Each schema statement is idempotent; no user tables outside this database are touched.
  for (const sql of schema
    .split(';')
    .map(s => s.trim())
    .filter(Boolean))
    await pool.query(sql);
  const execute = executor(pool);
  const transaction = async () => {
    const client = await pool.connect();
    let released = false;
    try {
      await client.query('BEGIN');
    } catch (error) {
      client.release();
      throw error;
    }
    return {
      execute: executor(client),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      close: () => {
        if (!released) {
          released = true;
          client.release();
        }
      },
    };
  };
  return {
    execute,
    transaction,
    batch: async statements => {
      const tx = await transaction();
      try {
        const results = [];
        for (const sql of statements) results.push(await tx.execute(sql));
        await tx.commit();
        return results;
      } catch (error) {
        await tx.rollback();
        throw error;
      } finally {
        tx.close();
      }
    },
    close: () => pool.end(),
  };
}

export async function postgresDatabase(url) {
  const parsed = new URL(url);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol))
    throw new Error('Invalid Postgres connection URL.');
  if (!parsed.searchParams.has('sslmode'))
    parsed.searchParams.set('sslmode', 'verify-full');
  const pool = new pg.Pool({
    connectionString: parsed.toString(),
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: true,
  });
  try {
    return await createPostgresDatabase(pool);
  } catch (error) {
    await pool.end();
    throw error;
  }
}
