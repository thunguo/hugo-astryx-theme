import {test, expect} from '@playwright/test';
import {fixtureEntries as entries} from './site-fixture.mjs';

const photo = entries.find(entry => entry.section === 'photos');

test('failed background preloading waits for an explicit open instead of retrying on returned focus', async ({page}) => {
  const requests = [];
  await page.route('**/gallery*.js*', route => {
    requests.push(route.request().url());
    return route.abort('failed');
  });
  await page.goto(photo.url);
  await expect(page.getByRole('button', {name: '搜索', exact: true})).toBeVisible();
  const image = page.locator('a[data-lightbox]').first();
  // Direct activation avoids a preceding pointer/focus preload in this case.
  await image.evaluate(node => node.click());
  const feedback = page.getByRole('dialog', {name: '图片预览'});
  await expect(feedback).toContainText('预览暂时无法加载');
  const attempted = requests.length;
  await feedback.getByRole('button', {name: '关闭', exact: true}).click();
  await expect(image).toBeFocused();
  await page.getByRole('button', {name: '搜索', exact: true}).focus();
  await image.focus();
  await image.dispatchEvent('pointerenter');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(requests).toHaveLength(attempted);
  await image.evaluate(node => node.click());
  await expect(feedback).toContainText('预览暂时无法加载');
  expect(requests.length).toBeGreaterThan(attempted);
});

test('a failed original image can retry without discarding the real viewer or other page controls', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(photo.url);
  await expect(page.getByRole('button', {name: '搜索', exact: true})).toBeVisible();
  const image = page.locator('a[data-lightbox]').first();
  const original = await image.evaluate(node => node.href);
  let fail = true;
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  await page.route(url => url.href === original, async route => {
    if (fail) return route.abort('failed');
    await gate;
    return route.continue();
  });
  await image.evaluate(node => node.click());
  const feedback = page.getByRole('dialog', {name: '图片预览'});
  await expect(feedback).toContainText('这张图片暂时无法加载');
  await expect(feedback.getByRole('link', {name: '打开原图'})).toHaveAttribute('href', original);
  await expect(page.locator('.astryx-lightbox')).not.toBeVisible();
  fail = false;
  const retry = feedback.getByRole('button', {name: '重试', exact: true});
  await retry.click();
  try {
    await expect(retry).toHaveAttribute('aria-busy', 'true');
    await expect(retry).toHaveAttribute('aria-disabled', 'true');
    await expect(retry).toBeFocused();
  } finally {release();}
  const viewer = page.locator('.astryx-lightbox');
  await expect(viewer).toBeVisible();
  await expect.poll(() => viewer.locator('img').evaluate(node => node.naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(image).toBeFocused();
  await page.getByRole('button', {name: '搜索', exact: true}).click();
  await expect(page.getByRole('dialog', {name: '搜索文章'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('a failed image does not strand keyboard navigation at the broken photo', async ({page}) => {
  await page.goto(photo.url);
  await expect(page.getByRole('button', {name: '搜索', exact: true})).toBeVisible();
  const image = page.locator('a[data-lightbox]').last();
  const original = await image.evaluate(node => node.href);
  await page.route(url => url.href === original, route => route.abort('failed'));
  await image.evaluate(node => node.click());
  const feedback = page.getByRole('dialog', {name: '图片预览'});
  await expect(feedback).toContainText('这张图片暂时无法加载');
  await expect(feedback.getByRole('button', {name: '上一张', exact: true})).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  const viewer = page.locator('.astryx-lightbox');
  await expect(viewer).toBeVisible();
  await expect.poll(() => viewer.locator('img').evaluate(node => node.naturalWidth)).toBeGreaterThan(0);
  await viewer.getByRole('button', {name: '缩放', exact: true}).press('Enter');
  await expect(viewer.getByRole('button', {name: '缩放', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(image).toBeFocused();
});

test('closing an image retry prevents a late decoded image from reopening the gallery', async ({page}) => {
  await page.goto(photo.url);
  await expect(page.getByRole('button', {name: '搜索', exact: true})).toBeVisible();
  const image = page.locator('a[data-lightbox]').first();
  const original = await image.evaluate(node => node.href);
  let fail = true;
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  await page.route(url => url.href === original, async route => {
    if (fail) return route.abort('failed');
    await gate;
    return route.continue();
  });
  await image.evaluate(node => node.click());
  const feedback = page.getByRole('dialog', {name: '图片预览'});
  await expect(feedback).toContainText('这张图片暂时无法加载');
  fail = false;
  await feedback.getByRole('button', {name: '重试', exact: true}).click();
  await expect(feedback.getByRole('button', {name: '重试', exact: true})).toHaveAttribute('aria-busy', 'true');
  await page.keyboard.press('Escape');
  await expect(image).toBeFocused();
  const completed = page.waitForResponse(response => response.url() === original);
  release();
  await (await completed).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('a timed out image retry stays failed when its old response arrives', async ({page}) => {
  await page.goto(photo.url);
  await expect(page.getByRole('button', {name: '搜索', exact: true})).toBeVisible();
  await page.clock.install();
  const image = page.locator('a[data-lightbox]').first();
  const original = await image.evaluate(node => node.href);
  let fail = true;
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  await page.route(url => url.href === original, async route => {
    if (fail) return route.abort('failed');
    await gate;
    return route.continue();
  });
  await image.evaluate(node => node.click());
  const feedback = page.getByRole('dialog', {name: '图片预览'});
  await expect(feedback).toContainText('这张图片暂时无法加载');
  fail = false;
  const retry = feedback.getByRole('button', {name: '重试', exact: true});
  await retry.click();
  await expect(retry).toHaveAttribute('aria-busy', 'true');
  await page.clock.fastForward(20001);
  await expect(feedback).toContainText('这张图片暂时无法加载');
  await expect(retry).not.toHaveAttribute('aria-busy', 'true');
  const completed = page.waitForResponse(response => response.url() === original);
  release();
  await (await completed).finished();
  await page.clock.runFor(50);
  await expect(feedback).toBeVisible();
  await expect(page.locator('.astryx-lightbox')).not.toBeVisible();
});

test('English image navigation stays inside the feedback text column on a narrow phone', async ({page}) => {
  await page.setViewportSize({width: 320, height: 740});
  await page.route('**' + photo.url, async route => {
    const response = await route.fetch();
    await route.fulfill({response, body: (await response.text()).replaceAll('"uiLocale":"zh-CN"', '"uiLocale":"en"')});
  });
  await page.goto(photo.url);
  await expect(page.getByRole('button', {name: 'Search', exact: true})).toBeVisible();
  const image = page.locator('a[data-lightbox][href$="/two.png"]');
  const original = await image.evaluate(node => node.href);
  await page.route(url => url.href === original, route => route.abort('failed'));
  await image.evaluate(node => node.click());
  const feedback = page.getByRole('dialog', {name: 'Image preview'});
  await expect(feedback).toContainText('This image could not load');
  const navigation = feedback.locator('.gallery-feedback-navigation');
  await expect(navigation.getByRole('button', {name: 'Previous', exact: true})).toBeVisible();
  await expect(navigation.getByRole('button', {name: 'Next', exact: true})).toBeVisible();
  await expect.poll(() => navigation.getByRole('button').first().evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThan(39.99);
  const bounds = await navigation.evaluate(node => {
    const column = node.closest('dialog').querySelector('.gallery-feedback-status').getBoundingClientRect();
    return [...node.querySelectorAll('button')].map(button => {
      const box = button.getBoundingClientRect();
      return {inside: box.left >= column.left - 1 && box.right <= column.right + 1, width: box.width, height: box.height};
    });
  });
  for (const button of bounds) {
    expect(button.inside).toBe(true);
    expect(button.width).toBeGreaterThanOrEqual(40);
    expect(button.height).toBeGreaterThan(39.99);
  }
});
