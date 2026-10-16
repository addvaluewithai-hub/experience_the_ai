import assert from 'node:assert/strict';

/** One real browser walk through the new 3D room into an editable work room. */
export async function checkLifeAtrium(page, url) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack || error.message));
  await page.goto(url + '/#/room/life-hub');
  try {
    await page.locator('.life-atrium-header h2').waitFor({ timeout: 5000 });
  } catch (error) {
    console.error('Life Atrium page errors:', errors);
    console.error('Life Atrium URL:', page.url());
    console.error('Life Atrium text:', (await page.locator('body').innerText()).slice(0, 1800));
    console.error('Life Atrium HTML:', (await page.locator('body').innerHTML()).slice(0, 1800));
    throw error;
  }
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
