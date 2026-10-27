import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { database, quota } from '../src/database.mjs';
import { createPostgresDatabase } from '../src/postgres.mjs';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../src/handler.mjs';
import {
  evaluationRequest,
  evaluate,
  parseVerdict,
  sanitizeEvidence,
} from '../src/evaluator.mjs';

const evidence = {
  appPackage: 'com.instagram.android',
  resourceIds: ['clips_viewer_view_pager', 'clips_caption_component'],
  markers: ['reels'],
  knownShortVideoSurface: false,
  obstructed: false,
  verticalScroll: true,
  deltaY: 800,
  deltaX: 0,
  pageIndex: 1,
};
const geminiReply = (value, finishReason = 'STOP') => ({
  candidates: [
    { finishReason, content: { parts: [{ text: JSON.stringify(value) }] } },
  ],
});
const positiveReply = {
  surface: 'short_video',
  confidence: 'high',
  transitionSupported: true,
};

test('Gemini uses direct structured output and excludes arbitrary screen text', async () => {
  const safe = sanitizeEvidence({
    ...evidence,
    rawText: 'private message',
    apiKey: 'untrusted',
    markers: ['reels', 'private text'],
  });
  assert.equal(safe.rawText, undefined);
  assert.deepEqual(safe.markers, ['reels']);
  const body = evaluationRequest(safe);
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.equal(
    JSON.parse(body.contents[0].parts[0].text).appPackage,
    evidence.appPackage,
  );
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-only-placeholder';
  try {
    const answer = await evaluate(safe, async (url, options) => {
      assert.equal(
        url,
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      );
      assert.equal(options.headers['x-goog-api-key'], 'test-only-placeholder');
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(
        JSON.stringify(JSON.parse(options.body)).includes('private message'),
        false,
      );
      return { ok: true, json: async () => geminiReply(positiveReply) };
    });
    assert.equal(answer.surfaceAccepted, true);
    assert.equal(answer.confidence, 'high');
    assert.equal(answer.provider, 'gemini');
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test('Reject unsupported apps, oversized evidence and malformed model output', () => {
  assert.throws(() =>
    sanitizeEvidence({ ...evidence, appPackage: 'com.bank' }),
  );
  assert.throws(() => sanitizeEvidence({ ...evidence, deltaY: Infinity }));
  assert.throws(() =>
    sanitizeEvidence({ ...evidence, resourceIds: Array(66).fill('a') }),
  );
  assert.throws(() =>
    parseVerdict(
      { answers: { shortVideo: { type: 'boolean', probability: 1 } } },
      evidence,
    ),
  );
  assert.throws(() =>
    parseVerdict(geminiReply(positiveReply, 'MAX_TOKENS'), evidence),
  );
  assert.throws(() =>
    parseVerdict(geminiReply({ ...positiveReply, confidence: 0.99 }), evidence),
  );
  assert.throws(() =>
    parseVerdict(
      {
        candidates: [
          { finishReason: 'STOP', content: { parts: [{ text: 'not JSON' }] } },
        ],
      },
      evidence,
    ),
  );
});

test('Model approval is conservative and cannot override native evidence', () => {
  assert.equal(
    parseVerdict(geminiReply(positiveReply), evidence).surfaceAccepted,
    true,
  );
  assert.equal(
    parseVerdict(
      geminiReply({ ...positiveReply, confidence: 'medium' }),
      evidence,
    ).surfaceAccepted,
    false,
  );
  assert.equal(
    parseVerdict(geminiReply(positiveReply), { ...evidence, obstructed: true })
      .surfaceAccepted,
    false,
  );
  assert.equal(
    parseVerdict(geminiReply(positiveReply), { ...evidence, resourceIds: [] })
      .surfaceAccepted,
    false,
  );
  assert.equal(
    parseVerdict(geminiReply(positiveReply), {
      ...evidence,
      deltaY: 0,
      deltaX: 800,
    }).transitionSupported,
    false,
  );
  assert.equal(
    parseVerdict(geminiReply(positiveReply), {
      ...evidence,
      verticalScroll: false,
    }).transitionSupported,
    false,
  );
});

test('Free-quota and credential errors stop without paid fallback or secret leakage', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-only-placeholder';
  let calls = 0;
  try {
    await assert.rejects(
      () =>
        evaluate(evidence, async () => {
          calls++;
          return { ok: false, status: 429 };
        }),
      { status: 429 },
    );
    assert.equal(calls, 1);
    await assert.rejects(
      () => evaluate(evidence, async () => ({ ok: false, status: 403 })),
      error =>
        error.status === 503 &&
        !error.message.includes('test-only-placeholder'),
    );
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(
      () =>
        evaluate(evidence, async () => {
          throw new Error('Must not call');
        }),
      { status: 503 },
    );
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
for (const dialect of ['SQLite', 'Postgres']) {
  test(`${dialect} backend: identity, invites, stats isolation, Gemini, deletion and quotas`, async t => {
    const dir = await mkdtemp(join(tmpdir(), 'brainpal-test-'));
    let db;
    if (dialect === 'SQLite') db = await database(`file:${dir}/test.db`);
    else {
      const engine = await PGlite.create();
      const query = (sql, args) => engine.query(sql, args);
      db = await createPostgresDatabase({
        query,
        connect: async () => ({ query, release() {} }),
        end: () => engine.close(),
      });
    }
    let evaluations = 0;
    const server = createServer(
      createHandler({
        getDb: async () => db,
        evaluator: async state => {
          evaluations++;
          assert.equal(state.rawText, undefined);
          return {
            surfaceAccepted: true,
            confidence: 'high',
            transitionSupported: true,
            provider: 'gemini',
          };
        },
      }),
    );
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    t.after(async () => {
      await new Promise(resolve => server.close(resolve));
      await db.close();
      await rm(dir, { recursive: true, force: true });
    });
    const call = async (path, body, token) => {
      const response = await fetch(url + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await call('/api/friends')).status, 401);
    const alice = (await call('/api/register', { name: 'Alice' })).body;
    const bob = (await call('/api/register', { name: 'Bob' })).body;
    const eve = (await call('/api/register', { name: 'Eve' })).body;
    assert.notEqual(alice.deviceToken, bob.deviceToken);
    assert.equal(
      (await call('/api/me', undefined, alice.deviceToken)).body.name,
      'Alice',
    );
    const day = new Date().toISOString().slice(0, 10);
    const stats = {
      day,
      count: 3,
      splits: [{ app: evidence.appPackage, count: 3, millis: 5000 }],
    };
    assert.equal(
      (await call('/api/sync', stats, alice.deviceToken)).status,
      200,
    );
    assert.equal(
      (await call('/api/sync', { ...stats, count: 8 }, bob.deviceToken)).status,
      400,
    );
    assert.equal(
      (await call('/api/friends', undefined, eve.deviceToken)).body.friends
        .length,
      0,
    );
    const invite = (await call('/api/invite', {}, alice.deviceToken)).body;
    assert.equal(
      (
        await call(
          '/api/invite/accept',
          { code: invite.code },
          alice.deviceToken,
        )
      ).status,
      400,
    );
    assert.equal(
      (await call('/api/invite/accept', { code: invite.code }, bob.deviceToken))
        .status,
      200,
    );
    assert.equal(
      (await call('/api/invite/accept', { code: invite.code }, eve.deviceToken))
        .status,
      400,
    );
    const friends = (await call('/api/friends', undefined, bob.deviceToken))
      .body.friends;
    assert.equal(friends.length, 1);
    assert.equal(friends[0].name, 'Alice');
    assert.equal(friends[0].count, 3);
    assert.equal(
      (
        await call(
          '/api/evaluate',
          { evidence: { ...evidence, rawText: 'ignored' } },
          bob.deviceToken,
        )
      ).status,
      200,
    );
    assert.equal(evaluations, 1);
    assert.equal(
      (
        await call(
          '/api/evaluate',
          { evidence: { ...evidence, appPackage: 'com.bank' } },
          bob.deviceToken,
        )
      ).status,
      400,
    );
    assert.equal(evaluations, 1);
    await quota(db, 'test-quota', 1);
    await assert.rejects(() => quota(db, 'test-quota', 1), { status: 429 });
    assert.equal(
      (await call('/api/account/delete', {}, alice.deviceToken)).status,
      200,
    );
    assert.equal(
      (await call('/api/me', undefined, alice.deviceToken)).status,
      401,
    );
    assert.equal(
      (await call('/api/friends', undefined, bob.deviceToken)).body.friends
        .length,
      0,
    );
  });
}
