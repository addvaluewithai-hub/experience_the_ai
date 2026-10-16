import assert from 'node:assert/strict';

/** One real browser walk through the 3D atrium into an editable work room. */
export async function checkLifeAtrium(page, url) {
  await page.goto(url + '/#/room/life-hub');
  await page.locator('.life-atrium-header h2').waitFor();
  await page.getByRole('button', { name: 'Learning Library, planned room' }).click();
  assert.equal(new URL(page.url()).hash, '#/room/life-hub');
  await page.getByText('Learning Library is planned, not open yet.').waitFor();
  await page.screenshot({ path: 'test-results/life-atrium.png', fullPage: true });

  await page.getByRole('button', { name: 'Work HQ, enter room' }).click();
  await page.waitForURL(/#\/room\/life-hub\/work$/);
  await page.getByRole('textbox', { name: 'New: Task' }).fill('Write the launch outline');
  await page.locator('#panel-tasks').getByRole('button', { name: 'Add' }).click();
  await page.getByRole('checkbox', { name: 'Write the launch outline' }).check();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '100');
  await page.screenshot({ path: 'test-results/life-work.png', fullPage: true });
  await page.goto(url);
}
