import assert from 'node:assert/strict';

const LIFEOS = 'https://lifeos-test.supabase.co';
const GOAL = '11111111-aaaa-4bbb-8ccc-000000000000';
const goals = [
  {
    id: GOAL,
    title: 'Launch agency outreach',
    why: 'So the agency stands on its own.',
    target_date: '2026-08-30',
    status: 'active',
    lifeos_goal_milestones: [
      { id: 'm1', title: 'Build the list', status: 'completed', chapter_order: 1 },
      { id: 'm2', title: 'Send the first 100', status: 'active', chapter_order: 2 },
    ],
    lifeos_goal_tasks: [
      { id: 't1', title: 'Write the first email', status: 'completed', task_order: 1 },
      { id: 't2', title: 'Pick 50 agencies', status: 'ready', priority: 'high', task_order: 2 },
    ],
    lifeos_goal_rooms: {
      lifeos_room_agents: [
        {
          persona_key: 'strategist',
          name: 'Alex',
          role: 'Strategist',
          is_primary: true,
          is_active: true,
        },
      ],
    },
  },
];

/**
 * Signing in to LifeOS and walking into a goal room, with Supabase answered here: the status
 * names a LifeOS project, the password grant returns a session, PostgREST returns one goal.
 */
export async function checkGoalRooms(page, url) {
  const asked = [];
  const status = (route) =>
    route.fulfill({ json: { ai: false, lifeos: { url: LIFEOS, key: 'sb_publishable_test' } } });
  const lifeos = async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    asked.push({ path, auth: request.headers().authorization, body: request.postData() });
    if (path === '/auth/v1/token')
      return route.fulfill({
        json: {
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { email: 'me@example.com' },
        },
      });
    if (path === '/rest/v1/lifeos_goals') return route.fulfill({ json: goals });
    if (path === '/rest/v1/lifeos_goal_progress')
      return route.fulfill({ json: [{ goal_id: GOAL, computed_progress: '0.5' }] });
    if (path === '/rest/v1/rpc/lifeos_open_goal_room')
      return route.fulfill({ json: { goal_id: GOAL } });
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ status: 404, json: { message: 'unexpected' } });
  };
  await page.route('**/api/status', status);
  await page.route(`${LIFEOS}/**`, lifeos);
  await page.goto(url + '/#/room/life-hub');
  await page.reload();

  await page.getByRole('button', { name: 'Connect your life' }).click();
  const sheet = page.getByRole('dialog', { name: 'Your life, connected.' });
  await sheet.getByLabel('Email').fill('me@example.com');
  await sheet.getByLabel('Password').fill('secret');
  await page.screenshot({ path: 'test-results/lifeos-sign-in.png' });
  await sheet.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Your goals are here').waitFor();
  const door = page.getByRole('button', { name: 'Launch agency outreach, 50%, enter room' });
  await door.waitFor();
  await page.screenshot({ path: 'test-results/life-atrium-goals.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/life-atrium-goals-390.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(asked.find((a) => a.path === '/rest/v1/lifeos_goals').auth, 'Bearer access-1');
  assert.deepEqual(JSON.parse(asked[0].body), { email: 'me@example.com', password: 'secret' });

  await door.click();
  await page.waitForURL(new RegExp(`#/room/life-hub/g-${GOAL}$`));
  const room = page.locator('.goal-room');
  await room.getByRole('heading', { name: 'Launch agency outreach' }).waitFor();
  await room.getByText('So the agency stands on its own.').waitFor();
  assert.equal(await room.getByRole('progressbar').getAttribute('aria-valuenow'), '50');
  await room.getByText('Send the first 100').waitFor();
  await room.getByText('Pick 50 agencies').waitFor();
  assert.equal(await room.getByText('Write the first email').count(), 0, 'done actions leave Next');
  await page.getByText('Alex').first().waitFor();
  assert.ok(
    asked.some((a) => a.path === '/rest/v1/rpc/lifeos_open_goal_room'),
    'visit recorded',
  );
  await page.screenshot({ path: 'test-results/goal-room.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/goal-room-390.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto(url + '/#/room/life-hub');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Connect your life' }).waitFor();
  assert.equal(await page.getByRole('navigation', { name: 'Your goals' }).count(), 0);
  await page.unroute('**/api/status', status);
  await page.unroute(`${LIFEOS}/**`, lifeos);
  await page.goto(url);
  await page.reload();
}
