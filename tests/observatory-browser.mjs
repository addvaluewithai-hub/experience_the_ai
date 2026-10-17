import assert from 'node:assert/strict';

const LIFEOS = 'https://lifeos-test.supabase.co';
const LAUNCH = '22222222-aaaa-4bbb-8ccc-000000000000';
const COURSE = '33333333-aaaa-4bbb-8ccc-000000000000';

/** Waits until entrance animations end, so a screenshot shows the room as a person sees it. */
const settle = (page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );

/**
 * The observatory against a LifeOS answered here, which really changes: the person pauses,
 * adds and deletes from the cards, and Orion archives a goal only after the person confirms.
 */
export async function checkObservatory(page, url) {
  const goals = [
    {
      id: LAUNCH,
      title: 'Launch agency outreach',
      status: 'active',
      why: 'Independence.',
      starts_on: '2026-07-20',
      target_date: '2026-08-30',
    },
    {
      id: COURSE,
      title: 'Arabic English course',
      status: 'backlog',
      created_at: '2026-08-01T09:00:00Z',
    },
    {
      id: '55555555-aaaa-4bbb-8ccc-000000000000',
      title: 'Win the first $20,000 in signed contracts',
      status: 'active',
      starts_on: '2026-09-01',
      target_date: '2027-01-31',
    },
    {
      id: '66666666-aaaa-4bbb-8ccc-000000000000',
      title: 'Build the first habit app for my daughter',
      status: 'active',
      created_at: '2026-09-15T09:00:00Z',
    },
    {
      id: '77777777-aaaa-4bbb-8ccc-000000000000',
      title: 'Relocate to Lisbon',
      status: 'backlog',
      target_date: '2027-06-01',
      created_at: '2026-08-10T09:00:00Z',
    },
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
  const count = (state) => sky.locator(`.obs-count.obs-${state} dd`);
  await sky.getByRole('button', { name: 'Launch agency outreach, active, 40%' }).waitFor();
  assert.deepEqual(
    [await count('active').textContent(), await count('backlog').textContent()],
    ['3', '2'],
  );
  await settle(page);
  await page.screenshot({ path: 'test-results/observatory.png' });

  // The person pauses a goal from its drawer; the sky follows LifeOS.
  await sky.getByRole('button', { name: 'Launch agency outreach, active, 40%' }).click();
  await sky.getByText('Target passed Aug 30, 2026').waitFor();
  await settle(page);
  await page.screenshot({ path: 'test-results/observatory-drawer.png' });
  await sky.getByRole('button', { name: 'Pause' }).click();
  await sky.getByRole('button', { name: 'Launch agency outreach, paused, 40%' }).waitFor();
  assert.deepEqual(calls.at(-1), {
    name: 'lifeos_set_goal_status',
    body: { p_goal_id: LAUNCH, p_status: 'paused' },
  });
  assert.equal(await sky.getByRole('button', { name: /^Delete/ }).count(), 0, 'no delete here');

  // A new goal, waiting; then one archived with a second tap.
  await sky.getByRole('button', { name: '+ New goal' }).click();
  await sky.getByLabel('Title').fill('Speak Spanish');
  await sky.getByRole('button', { name: 'Add goal' }).click();
  await sky.getByRole('button', { name: 'Speak Spanish, backlog, 0%' }).waitFor();
  assert.equal(calls.at(-1).body.p_status, 'backlog');
  await sky.getByRole('button', { name: 'Arabic English course, backlog, 0%' }).click();
  await sky.getByRole('button', { name: 'Archive' }).click();
  assert.equal(calls.at(-1).name, 'lifeos_create_goal', 'one tap only arms it');
  await sky.getByRole('button', { name: 'Tap again to archive' }).click();
  await sky.getByRole('navigation', { name: 'Completed and archived' }).waitFor();
  assert.deepEqual(calls.at(-1).body, { p_goal_id: COURSE, p_status: 'archived' });
  await sky.getByRole('button', { name: 'Close' }).click();

  // The timeline: each goal from its start to its target, today in gold.
  await sky.getByRole('tab', { name: 'Timeline' }).click();
  await sky.getByRole('button', { name: /^Win the first \$20,000.*target Jan 31, 2027/ }).waitFor();
  await sky.getByText('Today').waitFor();
  await settle(page);
  await page.screenshot({ path: 'test-results/observatory-timeline.png' });
  await sky.getByRole('tab', { name: 'Sky' }).click();

  // Orion asks; nothing happens until the person confirms on the card.
  await page.getByRole('button', { name: 'Type instead of talking' }).click();
  await page.getByRole('textbox', { name: 'Type here… Orion' }).fill('Archive the launch');
  await page.keyboard.press('Enter');
  const card = page.getByRole('alertdialog', { name: "Change a goal's state" });
  await card.getByText('goal: Launch agency outreach').waitFor();
  await settle(page);
  await page.screenshot({ path: 'test-results/observatory-confirm.png' });
  assert.deepEqual(calls.at(-1).body, { p_goal_id: COURSE, p_status: 'archived' }, 'not yet');
  await card.getByRole('button', { name: 'Confirm' }).click();
  await page.getByText('Done. It rests in the archive.').last().waitFor();
  assert.deepEqual(calls.at(-1).body, { p_goal_id: LAUNCH, p_status: 'archived' });
  assert.deepEqual(agent.at(-1).turns.at(-1).results[0].response, {
    ok: true,
    status: 'archived',
  });
  await sky
    .getByRole('navigation', { name: 'Completed and archived' })
    .getByRole('button', { name: 'Launch agency outreach' })
    .waitFor();
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
