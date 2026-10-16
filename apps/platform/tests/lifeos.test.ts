import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { loadGoals } from '../src/lifeos/goals.ts';
import { SignedOut, supabase } from '../src/lifeos/supabase.ts';

const config = { url: 'https://abc123.supabase.co', key: 'sb_publishable_x' };
const realFetch = globalThis.fetch;
afterEach(() => (globalThis.fetch = realFetch));

type Seen = { url: string; method: string; auth: string | null; body?: unknown };
/** Answers each request with the next reply and records what was asked. */
function server(...replies: [number, unknown][]) {
  const seen: Seen[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    seen.push({
      url,
      method: init.method ?? 'GET',
      auth: headers.get('authorization'),
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const [status, body] = replies[seen.length - 1] ?? [500, {}];
    return Response.json(body, { status });
  }) as typeof fetch;
  return seen;
}
const signedIn = (expiresIn: number) => ({
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  user: { email: 'me@example.com' },
});

test('signing in uses the password grant and every read carries the person’s token', async () => {
  const seen = server([200, signedIn(3600)], [200, [{ id: 'g' }]]);
  const db = supabase(config);
  await db.signIn('me@example.com', 'secret');
  assert.equal(db.email, 'me@example.com');
  assert.deepEqual(await db.get('lifeos_goals?select=id'), [{ id: 'g' }]);
  assert.equal(seen[0].url, `${config.url}/auth/v1/token?grant_type=password`);
  assert.deepEqual(seen[0].body, { email: 'me@example.com', password: 'secret' });
  assert.equal(seen[0].auth, `Bearer ${config.key}`);
  assert.equal(seen[1].url, `${config.url}/rest/v1/lifeos_goals?select=id`);
  assert.equal(seen[1].auth, 'Bearer access-1');
});

test('a wrong password says so; an expired token refreshes once; a refused one signs out', async () => {
  server([400, { error: 'invalid_grant' }]);
  await assert.rejects(supabase(config).signIn('me@example.com', 'nope'), /do not match/);

  const seen = server(
    [200, signedIn(30)],
    [200, { ...signedIn(3600), access_token: 'access-2' }],
    [200, []],
    [200, []],
  );
  const db = supabase(config);
  await db.signIn('me@example.com', 'secret');
  await Promise.all([db.get('a'), db.get('b')]);
  assert.equal(seen.filter((s) => s.url.includes('grant_type=refresh_token')).length, 1);
  assert.equal(seen.at(-1)!.auth, 'Bearer access-2');

  server([200, signedIn(3600)], [401, { message: 'JWT expired' }]);
  const later = supabase(config);
  await later.signIn('me@example.com', 'secret');
  await assert.rejects(later.get('lifeos_goals'), SignedOut);
  assert.equal(later.email, null);
});

test('the goals source reads active goals with their plan, progress and companion', async () => {
  const seen = server(
    [200, signedIn(3600)],
    [
      200,
      [
        {
          id: 'g1',
          title: 'Launch',
          lifeos_goal_milestones: [{ id: 'm1' }],
          lifeos_goal_tasks: [{ id: 't1' }, { id: 't2' }],
          lifeos_goal_rooms: {
            lifeos_room_agents: [
              { persona_key: 'coach', is_primary: true, is_active: false },
              { persona_key: 'tutor', is_primary: true, is_active: true },
            ],
          },
        },
        { id: 'g2', title: 'Course', lifeos_goal_rooms: null },
      ],
    ],
    [200, [{ goal_id: 'g1', computed_progress: '0.1667' }]],
  );
  const db = supabase(config);
  await db.signIn('me@example.com', 'secret');
  const goals = await loadGoals(db);
  assert.ok(seen[1].url.includes('status=eq.active'));
  assert.ok(seen[2].url.endsWith('goal_id=in.(g1,g2)'));
  assert.equal(goals[0].progress, 0.1667);
  assert.equal((goals[0].agent as { persona_key: string }).persona_key, 'tutor');
  assert.equal((goals[0].tasks as unknown[]).length, 2);
  assert.equal(goals[1].progress, null);
  assert.equal(goals[1].agent, null);
  assert.ok(!('lifeos_goal_rooms' in goals[0]));
});
