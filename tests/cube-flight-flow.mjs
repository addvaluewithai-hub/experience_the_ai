import assert from 'node:assert/strict';

/** Browser regression for the new room: real SVG avatar, keypad and a scaffolded revisit. */
export async function cubeFlightFlow(page, url) {
  page.on('pageerror', (err) => console.error('Cube Flight page error:', err.stack || err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning')
      console.log('Cube console:', msg.text());
  });
  for (const mode of ['cube_debug_no_avatar', 'cube_debug_no_board']) {
    await page.goto(`${url}/?${mode}#/room/cube-flight`);
    await page.waitForTimeout(700);
    console.log(
      'Cube isolate',
      mode,
      await page.evaluate(() => ({
        active: Boolean(document.querySelector('[data-world="cube-flight"]')),
        root: document.querySelector('#root')?.textContent?.slice(0, 100),
      })),
    );
  }
  await page.goto(`${url}/#/room/cube-flight`);
  await page.waitForTimeout(900);
  console.log(
    'Cube Flight root debug:',
    await page.evaluate(() => ({
      rootText: document.querySelector('#root')?.textContent?.slice(0, 250),
      hash: location.hash,
    })),
  );
  await page.locator('[data-world="cube-flight"]').waitFor();
  await page.locator('.cf-avatar svg').waitFor();
  assert.equal(await page.locator('.dock').count(), 0, 'no side chat, only game and voice overlay');
  await page.getByRole('button', { name: /ابدئي اللعب/ }).click();
  const factors = await page.locator('.cf-equation .cf-big-cube').allTextContents();
  assert.equal(factors.length, 3);
  const product = Number(factors[0]) * Number(factors[1]);
  await page.getByRole('textbox', { name: 'الناتج' }).fill(String(product));
  await page.getByRole('button', { name: /اتأكدّي/ }).click();
  await page.getByText(/دي طلعت من الذاكرة/).waitFor();
  await page.getByRole('button', { name: /التحدي اللي بعده/ }).click();
  await page.getByRole('button', { name: /تلميح/ }).click();
  await page.getByText('✧ مفتاح الذاكرة').waitFor();
  await page.getByRole('button', { name: /شوفي المجموعات/ }).click();
  assert.ok((await page.locator('.cf-array i').count()) > 0);
  await page.screenshot({ path: 'test-results/cube-flight.png', fullPage: true });
}
