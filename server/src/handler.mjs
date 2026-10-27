import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { evaluate, sanitizeEvidence, geminiModel } from './evaluator.mjs';
import { database, quota } from './database.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const failure = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const positive = (x, max) => Number.isSafeInteger(x) && x >= 0 && x <= max;
let sharedDb;
export function createHandler({
  getDb = () => (sharedDb ||= database()),
  evaluator = evaluate,
} = {}) {
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, value) => {
      res.statusCode = status;
      res.end(JSON.stringify(value));
    };
    try {
      const path = new URL(req.url, 'https://brainpal.invalid').pathname;
      if (path === '/api/health' && req.method === 'GET') {
        return send(200, {
          ok: true,
          provider: 'gemini',
          model: geminiModel(),
          aiConfigured: Boolean(process.env.GEMINI_API_KEY),
        });
      }
      const isPost = req.method === 'POST';
      if (!['POST', 'GET'].includes(req.method)) {
        return send(405, { error: 'Method not allowed.' });
      }
      let body = {};
      if (isPost) {
        if (
          !String(req.headers['content-type'] || '').startsWith(
            'application/json',
          )
        ) {
          throw failure('Expected application/json.', 415);
        }
        let size = 0,
          raw = '';
        if (req.body && typeof req.body === 'object') {
          body = req.body;
          if (JSON.stringify(body).length > 16384) {
            throw failure('Request too large.', 413);
          }
        } else {
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 16384) {
              throw failure('Request too large.', 413);
            }
            raw += chunk.toString();
          }
          try {
            body = JSON.parse(raw || '{}');
          } catch {
            throw failure('Invalid JSON.');
          }
        }
      }
      const db = await getDb();
      if (path === '/api/register' && isPost) {
        if (process.env.VERCEL && !process.env.RATE_LIMIT_SALT) {
          throw failure('Configure RATE_LIMIT_SALT on the server.', 503);
        }
        const ip = process.env.VERCEL
          ? String(req.headers['x-vercel-forwarded-for'] || '').split(',')[0]
          : req.socket?.remoteAddress || 'local';
        await quota(
          db,
          `register:${hash(
            (process.env.RATE_LIMIT_SALT || 'local-development') + ip,
          )}`,
          5,
        );
        await quota(db, 'register:global', 100);
        const name =
          typeof body.name === 'string' ? body.name.trim().slice(0, 40) : '';
        if (!name) {
          throw failure('A display name is required.');
        }
        const id = randomUUID(),
          deviceToken = randomBytes(32).toString('base64url');
        await db.execute({
          sql: 'INSERT INTO users VALUES(?,?,?,?)',
          args: [id, name, hash(deviceToken), Date.now()],
        });
        return send(201, { id, name, deviceToken });
      }
      const token = String(req.headers.authorization || '').replace(
        /^Bearer /,
        '',
      );
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
        throw failure('Device authentication required.', 401);
      }
      const result = await db.execute({
        sql: 'SELECT id,name FROM users WHERE token_hash=?',
        args: [hash(token)],
      });
      const user = result.rows[0];
      if (!user) {
        throw failure(
          'Device authentication expired. Reconnect your backend.',
          401,
        );
      }
      const uid = String(user.id);
      if (path === '/api/me' && req.method === 'GET') {
        return send(200, {
          id: uid,
          name: user.name,
          aiConfigured: Boolean(process.env.GEMINI_API_KEY),
        });
      }
      await quota(db, `request:${uid}`, 5000);
      if (path === '/api/evaluate' && isPost) {
        const evidence = sanitizeEvidence(body.evidence);
        if (!process.env.GEMINI_API_KEY && evaluator === evaluate) {
          throw failure(
            'Set GEMINI_API_KEY on the server to enable Gemini.',
            503,
          );
        }
        const deviceLimit = Math.max(
          1,
          Math.min(500, Number(process.env.AI_DAILY_DEVICE_LIMIT) || 60),
        );
        const globalLimit = Math.max(
          1,
          Math.min(10000, Number(process.env.AI_DAILY_GLOBAL_LIMIT) || 500),
        );
        await quota(db, `ai:${uid}`, deviceLimit);
        await quota(db, 'ai:global', globalLimit);
        const verdict = await evaluator(evidence);
        return send(200, verdict);
      }
      if (path === '/api/sync' && isPost) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(body.day) ||
          !positive(body.count, 100000) ||
          !Array.isArray(body.splits) ||
          body.splits.length > 6
        ) {
          throw failure('Invalid daily stats.');
        }
        const splits = body.splits.map(s => {
          if (
            typeof s.app !== 'string' ||
            !positive(s.count, 100000) ||
            !positive(s.millis, 86400000)
          ) {
            throw failure('Invalid app split.');
          }
          return { app: s.app.slice(0, 100), count: s.count, millis: s.millis };
        });
        if (splits.reduce((n, s) => n + s.count, 0) !== body.count) {
          throw failure('App splits do not match the daily total.');
        }
        await db.execute({
          sql: 'INSERT INTO stats VALUES(?,?,?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET count=excluded.count,splits=excluded.splits,updated=excluded.updated',
          args: [uid, body.day, body.count, JSON.stringify(splits), Date.now()],
        });
        return send(200, { ok: true });
      }
      if (path === '/api/invite' && isPost) {
        await quota(db, `invite:${uid}`, 20);
        const code = randomBytes(4).toString('hex').toUpperCase();
        const expires = Date.now() + 7 * 86400000;
        await db.execute({
          sql: 'INSERT INTO invites(code,owner,expires) VALUES(?,?,?)',
          args: [code, uid, expires],
        });
        return send(201, { code, expires });
      }
      if (path === '/api/invite/accept' && isPost) {
        await quota(db, `accept:${uid}`, 30);
        const code = String(body.code || '').toUpperCase();
        if (!/^[0-9A-F]{8}$/.test(code)) {
          throw failure('Enter an 8-character invite code.');
        }
        const tx = await db.transaction('write');
        try {
          const invite = (
            await tx.execute({
              sql: 'SELECT owner FROM invites WHERE code=? AND expires>? AND accepted=0',
              args: [code, Date.now()],
            })
          ).rows[0];
          if (!invite || invite.owner === uid) {
            throw failure(
              'This invite is expired, already used, or belongs to you.',
            );
          }
          const pair = [uid, String(invite.owner)].sort();
          await tx.execute({
            sql: 'INSERT OR IGNORE INTO friendships(a,b) VALUES(?,?)',
            args: pair,
          });
          await tx.execute({
            sql: 'UPDATE invites SET accepted=1 WHERE code=?',
            args: [code],
          });
          await tx.commit();
        } catch (e) {
          await tx.rollback();
          throw e;
        } finally {
          tx.close();
        }
        return send(200, { ok: true });
      }
      if (path === '/api/friends' && req.method === 'GET') {
        // Device-local days may differ across timezones: only expose stats for the requester's synced day.
        const own = (
          await db.execute({
            sql: 'SELECT day FROM stats WHERE user_id=? ORDER BY updated DESC LIMIT 1',
            args: [uid],
          })
        ).rows[0];
        const day = own?.day || new Date().toISOString().slice(0, 10);
        const rows = (
          await db.execute({
            sql: 'SELECT u.id,u.name,s.count,s.updated,s.day FROM friendships f JOIN users u ON u.id=CASE WHEN f.a=? THEN f.b ELSE f.a END LEFT JOIN stats s ON s.user_id=u.id AND s.day=? WHERE f.a=? OR f.b=?',
            args: [uid, day, uid, uid],
          })
        ).rows;
        return send(200, {
          friends: rows.map(r => ({
            id: r.id,
            name: r.name,
            count: r.count == null ? null : Number(r.count),
            syncedAt: r.updated == null ? null : Number(r.updated),
            day: r.day || null,
          })),
        });
      }
      if (path === '/api/account/delete' && isPost) {
        await db.batch(
          [
            {
              sql: 'DELETE FROM friendships WHERE a=? OR b=?',
              args: [uid, uid],
            },
            { sql: 'DELETE FROM invites WHERE owner=?', args: [uid] },
            { sql: 'DELETE FROM stats WHERE user_id=?', args: [uid] },
            {
              sql: 'DELETE FROM quotas WHERE bucket LIKE ?',
              args: [`%:${uid}`],
            },
            { sql: 'DELETE FROM users WHERE id=?', args: [uid] },
          ],
          'write',
        );
        return send(200, { ok: true });
      }
      return send(404, { error: 'Unknown endpoint.' });
    } catch (error) {
      // Never log evidence, authorization headers, or upstream bodies.
      const status = Number(error.status) || 500;
      return send(status, {
        error:
          status < 500
            ? error.message
            : status === 503
            ? error.message
            : 'Service unavailable. Local detection continues.',
      });
    }
  };
}
export default createHandler();
