import assert from 'node:assert/strict';

/** Browser: one start control, spoken companion rig, game events and local progress on desktop/mobile. */
export async function cubeFlightFlow(page, url) {
  const originalSize = page.viewportSize();
  page.on('pageerror', (error) =>
    console.error('Cube cold pageerror:', error.stack || error.message),
  );
  page.on('console', (message) => {
    if (message.type() === 'error') console.error('Cube console error:', message.text());
  });
  await page.goto(`${url}/#/room/cube-flight`);
  await page.waitForTimeout(700);
  console.log(
    'Cube cold navigation:',
    await page.evaluate(() => ({
      url: location.href,
      text: document.body.innerText.slice(0, 450),
    })),
  );
  await page.locator('[data-world="cube-flight"]').waitFor();
  await page.locator('.cf-avatar svg').waitFor();
  assert.equal(await page.locator('.dock').count(), 0, 'there is no chat dock');
  assert.equal(await page.locator('.immersive-captions').count(), 0, 'no spoken subtitles');
  assert.equal(await page.locator('.immersive-exit').count(), 0, 'no home icon');
  assert.equal(await page.locator('.cf-status').count(), 0, 'no NEW CUBE or challenge tags');
  assert.equal(await page.locator('.cf-intro .cf-go').count(), 1, 'one start button');
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: /ابدئي مع لومي/ }).click();
  assert.equal(await page.getByText(/جدول 3 · اكتشفي الرابط/).count(), 1);
  // A lesson cannot be skipped: explain → choose a group link → hidden recall → success.
  for (let i = 0; i < 3; i++) {
    const fact = await page.locator('.cf-teach-equation .cf-big-cube').allTextContents();
    const a = Number(fact[0]);
    const b = Number(fact[1]);
    assert.equal(a * b, Number(fact[2]), 'worked example has the correct product');
    assert.ok((await page.locator('.cf-lesson-row i').count()) > 0);
    await page.getByRole('button', { name: /فهمت المجموعات/ }).click();
    assert.equal(await page.locator('.cf-bridge').count(), 1);
    if (i === 0) {
      const invalid = b === 7 ? 1 : 3;
      await page.getByRole('button', { name: `${invalid} مجموعة` }).click();
      assert.equal(await page.locator('.cf-bridge').count(), 1, 'wrong bridge cannot skip fact');
    }
    const extra = b === 9 || b === 10 ? 1 : b >= 11 ? b - 10 : b >= 6 ? b - 5 : 1;
    await page.getByRole('button', { name: `${extra} مجموعة` }).click();
    await page.locator('.cf-lesson-recall').waitFor();
    assert.equal(await page.locator('.cf-lesson-grid').count(), 0, 'groups are hidden in recall');
    if (i === 0) {
      await page.getByRole('textbox', { name: 'الناتج' }).fill('999');
      await page.getByRole('button', { name: /تأكيد/ }).click();
      await page.locator('.cf-lesson-demo').waitFor();
      await page.getByRole('button', { name: /فهمت المجموعات/ }).click();
      await page.getByRole('button', { name: `${extra} مجموعة` }).click();
    }
    await page.getByRole('textbox', { name: 'الناتج' }).fill(String(a * b));
    await page.getByRole('button', { name: /تأكيد/ }).click();
    await page.locator('.cf-lesson-success').waitFor();
    assert.equal(await page.locator('.cf-lesson-success').count(), 1, 'success pauses for the child');
    await page.locator('.cf-lesson-next').click();
  }
  await page.locator('.cf-lesson').waitFor({ state: 'detached' });
  const cubes = page.locator('.cf-equation .cf-big-cube');
  const factors = await cubes.allTextContents();
  assert.equal(factors.length, 3);
  const cubeSize = await cubes.first().boundingBox();
  assert.ok(cubeSize && cubeSize.width >= 70, 'large tactile cubes');
  await page
    .getByRole('textbox', { name: 'الناتج' })
    .fill(String(Number(factors[0]) * Number(factors[1])));
  await page.getByRole('button', { name: /تأكيد/ }).click();
  await page.locator('.cf-result-flash.memory').waitFor();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('experience_the_ai:cube-flight:facts:v1') || 'null'),
  );
  assert.ok(saved?.facts?.length > 0, 'math memory persists to browser storage');

  await page.getByRole('button', { name: /التحدي اللي بعده/ }).click();
  await page.getByRole('button', { name: /تلميح/ }).click();
  await page.getByText('✧ مفتاح الذاكرة').waitFor();
  await page.getByRole('button', { name: /شوفي المجموعات/ }).click();
  assert.ok((await page.locator('.cf-array i').count()) > 0);
  await page.screenshot({ path: 'test-results/cube-flight.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator('.cf-avatar svg').waitFor();
  await page.getByRole('button', { name: /ابدئي مع لومي/ }).click();
  for (let i = 0; i < 3; i++) {
    const fact = await page.locator('.cf-teach-equation .cf-big-cube').allTextContents();
    const a = Number(fact[0]);
    const b = Number(fact[1]);
    const extra = b === 9 || b === 10 ? 1 : b >= 11 ? b - 10 : b >= 6 ? b - 5 : 1;
    await page.getByRole('button', { name: /فهمت المجموعات/ }).click();
    await page.getByRole('button', { name: `${extra} مجموعة` }).click();
    await page.getByRole('textbox', { name: 'الناتج' }).fill(String(a * b));
    await page.getByRole('button', { name: /تأكيد/ }).click();
    await page.locator('.cf-lesson-next').click();
  }
  const phone = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    cube: document.querySelector('.cf-big-cube')?.getBoundingClientRect().width || 0,
    keypad: document.querySelector('.cf-key')?.getBoundingClientRect().height || 0,
  }));
  assert.ok(phone.document <= phone.viewport + 2, 'no mobile horizontal overflow');
  assert.ok(phone.cube >= 55 && phone.keypad >= 44, 'touch-sized cubes and controls');
  await page.screenshot({ path: 'test-results/cube-flight-mobile.png', fullPage: true });
  if (originalSize) await page.setViewportSize(originalSize);
  await page.goto(url);
}
