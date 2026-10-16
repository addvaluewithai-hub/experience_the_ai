import assert from 'node:assert/strict';

const LIFEOS = 'https://lifeos-test.supabase.co';
const LAUNCH = '22222222-aaaa-4bbb-8ccc-000000000000';
const COURSE = '33333333-aaaa-4bbb-8ccc-000000000000';

/**
 * The observatory against a LifeOS answered here, which really changes: the person pauses,
 * adds and deletes from the cards, and Orion archives a goal only after the person confirms.
 */
export async function checkObservatory(page, url) {
  const goals = [
    { id: LAUNCH, title: 'Launch agency outreach', status: 'active', why: 'Independence.' },
    { id: COURSE, title: 'Arabic English course', status: 'backlog' },
  ];
  const calls = [];
  const agent = [];
  const status = (route) =>
    route.fulfill({ json: { ai: true, lifeos: { url: LIFEOS, key: 'sb_publishable_test' } } });
  const lifeos = async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? JSON.parse(request.postData()) : {};
    if (path === '/auth/v1/token')
      return route.fulfill({
        json: {
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { email: 'me@example.com' },
        },
      });
    if (path === '/rest/v1/lifeos_goals')
      return route.fulfill({
        json: goals.map((g) => ({
          ...g,
          lifeos_goal_tasks:
            g.id === LAUNCH ? [{ id: 't1', title: 'Pick 50', status: 'ready' }] : [],
          lifeos_goal_milestones: [],
          lifeos_goal_rooms: null,
        })),
      });
    if (path === '/rest/v1/lifeos_goal_progress')
      return route.fulfill({ json: [{ goal_id: LAUNCH, computed_progress: '0.4' }] });
    if (path.startsWith('/rest/v1/rpc/')) {
      const name = path.slice('/rest/v1/rpc/'.length);
      calls.push({ name, body });
      const goal = goals.find((g) => g.id === body.p_goal_id);
      if (name === 'lifeos_set_goal_status') goal.status = body.p_status;
      if (name === 'lifeos_delete_empty_goal') goals.splice(goals.indexOf(goal), 1);
      if (name === 'lifeos_create_goal') {
        const id = '44444444-aaaa-4bbb-8ccc-000000000000';
        goals.push({ id, title: body.p_title, status: body.p_status, why: body.p_why });
        return route.fulfill({ json: id });
      }
      return route.fulfill({ json: name === 'lifeos_set_goal_status' ? body.p_status : null });
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ status: 404, json: { message: 'unexpected' } });
  };
  // Orion asks to archive the launch goal, then speaks once the result comes back.
  const chairman = (route) => {
    const body = JSON.parse(route.request().postData());
    agent.push(body);
    const last = body.turns.at(-1);
    if (last.role === 'user')
      return route.fulfill({
        json: {
          parts: [
            { text: 'Then we archive it.' },
            {
              functionCall: {
                name: 'set_goal_status',
                args: { goal: LAUNCH, status: 'archived' },
              },
            },
          ],
        },
      });
    return route.fulfill({ json: { parts: [{ text: 'Done. It rests in the archive.' }] } });
  };
  await page.route('**/api/status', status);
  await page.route(`${LIFEOS}/**`, lifeos);
  await page.route('**/api/agent', chairman);
  await page.goto(url + '/#/room/life-hub');
  await page.reload();
  await page.getByRole('button', { name: 'Connect your life' }).click();
  const sheet = page.getByRole('dialog', { name: 'Your life, connected.' });
  await sheet.getByLabel('Email').fill('me@example.com');
  await sheet.getByLabel('Password').fill('secret');
  await sheet.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: /The Observatory/ }).click();
  await page.waitForURL(/#\/room\/life-hub\/observatory$/);
  const sky = page.locator('.observatory');
  await sky.getByText('1 active · 0 paused · 1 waiting').waitFor();
  await page.screenshot({ path: 'test-results/observatory.png' });

  // The person pauses a goal from its card; the sky follows LifeOS.
  await sky.getByRole('button', { name: 'Launch agency outreach, active, 40%' }).click();
  await sky.getByRole('button', { name: 'Pause' }).click();
  await sky.getByRole('button', { name: 'Launch agency outreach, paused, 40%' }).waitFor();
  assert.deepEqual(calls.at(-1), {
    name: 'lifeos_set_goal_status',
    body: { p_goal_id: LAUNCH, p_status: 'paused' },
  });

  // A new goal, waiting; then an empty one deleted with a second tap.
  await sky.getByRole('button', { name: '+ New goal' }).click();
  await sky.getByLabel('Title').fill('Speak Spanish');
  await sky.getByRole('button', { name: 'Add goal' }).click();
  await sky.getByRole('button', { name: 'Speak Spanish, backlog, 0%' }).waitFor();
  assert.equal(calls.at(-1).body.p_status, 'backlog');
  await sky.getByRole('button', { name: 'Arabic English course, backlog, 0%' }).click();
  await sky.getByRole('button', { name: 'Delete' }).click();
  assert.equal(calls.at(-1).name, 'lifeos_create_goal', 'one tap only arms it');
  await sky.getByRole('button', { name: 'Tap again to delete' }).click();
  await sky.getByText('0 active · 1 paused · 1 waiting').waitFor();
  assert.deepEqual(calls.at(-1), {
    name: 'lifeos_delete_empty_goal',
    body: { p_goal_id: COURSE },
  });

  // Orion asks; nothing happens until the person confirms on the card.
  await page.getByRole('button', { name: 'Type instead of talking' }).click();
  await page.getByRole('textbox', { name: 'Type here… Orion' }).fill('Archive the launch');
  await page.keyboard.press('Enter');
  const card = page.getByRole('alertdialog', { name: "Change a goal's state" });
  await card.getByText('goal: Launch agency outreach').waitFor();
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
  await page.screenshot({ path: 'test-results/observatory-confirm.png' });
  assert.equal(calls.at(-1).name, 'lifeos_delete_empty_goal', 'not before the tap');
  await card.getByRole('button', { name: 'Confirm' }).click();
  await page.getByText('Done. It rests in the archive.').last().waitFor();
  assert.deepEqual(calls.at(-1).body, { p_goal_id: LAUNCH, p_status: 'archived' });
  assert.deepEqual(agent.at(-1).turns.at(-1).results[0].response, {
    ok: true,
    status: 'archived',
  });
  await sky.getByRole('navigation', { name: 'Completed and archived' }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/observatory-390.png' });
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto(url + '/#/room/life-hub');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Connect your life' }).waitFor();
  for (const [pattern, handler] of [
    ['**/api/status', status],
    [`${LIFEOS}/**`, lifeos],
    ['**/api/agent', chairman],
  ])
    await page.unroute(pattern, handler);
  await page.goto(url);
  await page.reload();
}
