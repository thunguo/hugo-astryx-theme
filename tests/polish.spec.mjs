import {test, expect} from '@playwright/test';
import {fixtureEntries as entries} from './site-fixture.mjs';

const photo = entries.find(entry => entry.section === 'photos');
const article = entries.find(entry => entry.url.includes('small-scripts'));

test('a failed viewer stays local, retries its module and returns image focus', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let fail = true;
  let releaseRetry;
  const retryGate = new Promise(resolve => {releaseRetry = resolve;});
  const requests = [];
  await page.route('**/gallery*.js*', async route => {
    requests.push(route.request().url());
    if (fail) return route.abort('failed');
    await retryGate;
    return route.continue();
  });
  await page.goto(photo.url);
  const image = page.locator('a[data-lightbox]').first();
  await image.click();
  const feedback = page.getByRole('dialog', {name: '图片预览'});
  await expect(feedback).toContainText('预览暂时无法加载');
  await expect(feedback.getByRole('link', {name: '打开原图'})).toHaveAttribute('href', await image.evaluate(node => node.href));
  await expect(page.locator('#astryx-header').getByRole('button', {name: '搜索', exact: true})).toBeAttached();
  fail = false;
  const retry = feedback.getByRole('button', {name: '重试', exact: true});
  await retry.click();
  try {
    await expect(retry).toBeFocused();
    await expect(retry).toHaveAttribute('aria-disabled', 'true');
    await expect(retry).toHaveAttribute('aria-busy', 'true');
  } finally {releaseRetry();}
  const viewer = page.locator('dialog.astryx-lightbox');
  await expect(viewer).toBeVisible();
  await expect.poll(() => viewer.evaluate(node => node.contains(document.activeElement))).toBe(true);
  expect(requests.length).toBeGreaterThanOrEqual(2);
  expect(requests.at(-1)).toMatch(/\?retry=\d+$/);
  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible();
  await expect(image).toBeFocused();
  // Other enhancement roots still respond after a failed viewer request.
  await page.getByRole('button', {name: '搜索', exact: true}).click();
  await expect(page.getByRole('dialog', {name: '搜索文章'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('a slow viewer has visible feedback, no flow placeholder and cannot reopen after dismissal', async ({page}) => {
  let release;
  const wait = new Promise(resolve => {release = resolve;});
  await page.route('**/gallery*.js*', async route => {await wait; await route.continue();});
  await page.goto(photo.url);
  const image = page.locator('a[data-lightbox]').first();
  const article = page.locator('.blog-article');
  const originalHeight = await article.evaluate(node => node.getBoundingClientRect().height);
  try {
    await image.click();
    const feedback = page.getByRole('dialog', {name: '图片预览'});
    await expect(feedback).toBeVisible();
    const box = await feedback.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
    expect(await article.evaluate(node => node.getBoundingClientRect().height)).toBe(originalHeight);
    await page.keyboard.press('Escape');
    await expect(feedback).not.toBeVisible();
    await expect(image).toBeFocused();
    const loaded = page.waitForResponse(response => /\/gallery[^/]*\.js/.test(response.url()));
    release();
    await (await loaded).finished();
    // Allow the completed import and React commit to settle after cancellation.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await image.click();
    await expect(page.locator('dialog.astryx-lightbox')).toBeVisible();
  } finally {release();}
});

test('code feedback and long language names keep the toolbar stable in either UI language', async ({page}) => {
  await page.setViewportSize({width: 320, height: 740});
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    value: {writeText: async text => {
      if (window.denyCopy) throw new Error('Clipboard denied');
      window.copiedText = text;
    }}, configurable: true,
  }));
  let en = false;
  const language = 'a-very-long-unrecognized-language-name'.repeat(4);
  await page.route(`**${article.url}`, async route => {
    const response = await route.fetch();
    let html = await response.text();
    if (en) html = html.replaceAll('"uiLocale":"zh-CN"', '"uiLocale":"en"');
    html = html.replace('class="article-content prose">', `class="article-content prose"><pre data-long-language><code class="language-${language}">source line</code></pre>`);
    await route.fulfill({response, body: html});
  });
  for (en of [false, true]) {
    await page.goto(article.url);
    const block = page.locator('.code-block').filter({has: page.locator('[data-long-language]')});
    const copy = block.locator('.code-copy-button button');
    await expect(copy).toHaveAccessibleName(en ? 'Copy code' : '复制代码');
    await expect(block.locator('.code-block-language')).toHaveAttribute('title', language);
    await copy.scrollIntoViewIfNeeded();
    const bounds = await copy.boundingBox();
    const filename = page.locator('.code-block-filename').first();
    await copy.click();
    await expect(copy).toHaveAccessibleName(en ? 'Copied' : '已复制');
    const copiedBounds = await copy.boundingBox();
    expect(copiedBounds.x).toBeCloseTo(bounds.x, 1);
    expect(copiedBounds.width).toBeCloseTo(bounds.width, 1);
    expect(await page.evaluate(() => window.copiedText)).toBe('source line');
    await page.evaluate(() => {window.denyCopy = true;});
    await copy.click();
    await expect(copy).toHaveAccessibleName(en ? 'Copy failed' : '复制失败');
    const failedBounds = await copy.boundingBox();
    expect(failedBounds.x).toBeCloseTo(bounds.x, 1);
    expect(failedBounds.width).toBeCloseTo(bounds.width, 1);
    await expect(block.getByRole('status').filter({hasText: en ? 'Could not copy.' : '复制未成功'})).toBeAttached();
    const toolbar = await block.locator('.code-block-toolbar').evaluate(node => {
      const box = node.getBoundingClientRect();
      return [...node.querySelectorAll('.code-block-heading, .code-block-language, button')].every(child => {
        const rect = child.getBoundingClientRect();
        return rect.left >= box.left && rect.right <= box.right;
      });
    });
    expect(toolbar).toBe(true);
    await expect(filename).toBeAttached();
  }
});
