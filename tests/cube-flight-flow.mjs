import assert from 'node:assert/strict';

/** Browser regression for the new room: real SVG avatar, keypad and a scaffolded revisit. */
export async function cubeFlightFlow(page, url) {
  await page.goto(`${url}/#/room/cube-flight`);
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
