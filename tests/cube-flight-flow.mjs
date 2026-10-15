import assert from 'node:assert/strict';

/** Browser regression for the new room: real SVG avatar, keypad and a scaffolded revisit. */
export async function cubeFlightFlow(page, url) {
  await page.goto(`${url}/#/room/cube-flight`);
  await page.locator('[data-world="cube-flight"]').waitFor();
  await page.locator('.cf-avatar svg').waitFor();
  await page.getByRole('button', { name: /يلا نطير ونلعب/ }).click();
  const factors = await page.locator('.cf-equation .cf-cube').allTextContents();
  assert.equal(factors.length, 3);
  const product = Number(factors[0]) * Number(factors[1]);
  await page.getByRole('textbox', { name: 'الناتج' }).fill(String(product));
  await page.getByRole('button', { name: /اتأكدّي/ }).click();
  await page.getByText(/الإجابة طلعت من غير مساعدة/).waitFor();
  await page.getByRole('button', { name: /السؤال اللي بعده/ }).click();
  await page.getByRole('button', { name: /تلميح/ }).click();
  await page.getByText('رابط للذاكرة').waitFor();
  await page.getByRole('button', { name: /ورّيني الـ Array/ }).click();
  assert.ok((await page.locator('.cf-array i').count()) > 0);
  await page.screenshot({ path: 'test-results/cube-flight.png', fullPage: true });
}
