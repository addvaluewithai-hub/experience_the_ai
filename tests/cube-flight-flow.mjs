import assert from 'node:assert/strict';

/** Real-browser smoke: full-screen room, original Lumi SVG, game inputs and a memory scaffold. */
export async function cubeFlightFlow(page, url) {
  page.on('pageerror', console.error);
  page.on('console', (message) => {
    if (message.type() === 'error') console.error('Cube browser console:', message.text());
  });
  await page.goto(`${url}/#/room/cube-flight`);
  await page.waitForTimeout(600);
  await page.locator('[data-world="cube-flight"]').waitFor();
  await page.locator('.cf-avatar svg').waitFor();
  assert.equal(await page.locator('.dock').count(), 0, 'Lumi lives in-game, not in side chat');
  await page.getByRole('button', { name: /ابدئي اللعب/ }).click();
  const cubes = page.locator('.cf-equation .cf-big-cube');
  const factors = await cubes.allTextContents();
  assert.equal(factors.length, 3);
  const cubeSize = await cubes.first().boundingBox();
  assert.ok(cubeSize && cubeSize.width >= 70, 'game has large, tactile number cubes');
  const product = Number(factors[0]) * Number(factors[1]);
  await page.getByRole('textbox', { name: 'الناتج' }).fill(String(product));
  await page.getByRole('button', { name: /تأكيد/ }).click();
  await page.getByText(/دي طلعت من الذاكرة/).waitFor();
  await page.getByRole('button', { name: /التحدي اللي بعده/ }).click();
  await page.getByRole('button', { name: /تلميح/ }).click();
  await page.getByText('✧ مفتاح الذاكرة').waitFor();
  await page.getByRole('button', { name: /شوفي المجموعات/ }).click();
  assert.ok((await page.locator('.cf-array i').count()) > 0);
  await page.screenshot({ path: 'test-results/cube-flight.png', fullPage: true });
  await page.goto(url);
}
