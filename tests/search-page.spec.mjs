import {test, expect} from '@playwright/test';
import {fixtureEntries as entries} from './site-fixture.mjs';

const notebook = entries.find(entry => entry.url.includes('a-working-notebook'));
const technical = entries.find(entry => entry.url.includes('small-scripts'));
const visibleEntries = page => page.locator('#search-results [data-search-url]:visible');
const input = page => page.locator('#search-form input[data-search-input]');
const status = page => page.locator('#search-status');
const ready = page => expect(page.locator('#search-results')).toHaveAttribute('aria-busy', 'false');
const pauseClock = async page => {
  const time = new Date();
  await page.clock.install({time});
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
};

test('typing filters after a short pause, reports no matches and clears immediately', async ({page}) => {
  await page.goto('/search/?view=all#results');
  await ready(page);
  await page.evaluate(() => history.replaceState({searchSession: 'keep'}, '', location.href));
  await pauseClock(page);
  await expect(visibleEntries(page)).toHaveCount(entries.length);
  const originalOrder = await visibleEntries(page).evaluateAll(nodes => nodes.map(node => node.dataset.searchUrl));

  await input(page).fill('notebook');
  await page.clock.runFor(149);
  await expect(visibleEntries(page)).toHaveCount(entries.length);
  await page.clock.runFor(1);
  await expect(visibleEntries(page)).toHaveCount(1);
  await expect(visibleEntries(page)).toContainText(notebook.title);
  await expect(page).toHaveURL(/view=all&q=notebook#results$/);
  expect(await page.evaluate(() => history.state)).toEqual({searchSession: 'keep'});

  await input(page).fill('zzzz-no-such-article');
  await page.clock.runFor(150);
  await expect(status(page)).toContainText('没有找到匹配的文章');
  await expect(visibleEntries(page)).toHaveCount(0);
  await ready(page);

  // A native type=search cancel may emit `search` independently of `input`.
  await input(page).evaluate(node => {node.value = ''; node.dispatchEvent(new Event('search', {bubbles: true}));});
  await expect(input(page)).toHaveValue('');
  await expect(input(page)).toBeFocused();
  await expect(status(page)).toContainText(`显示全部 ${entries.length} 篇文章`);
  await expect(page).toHaveURL(/\/search\/\?view=all#results$/);
  await expect(visibleEntries(page)).toHaveCount(entries.length);
  expect(await visibleEntries(page).evaluateAll(nodes => nodes.map(node => node.dataset.searchUrl))).toEqual(originalOrder);
  expect(await page.evaluate(() => history.state)).toEqual({searchSession: 'keep'});
});

test('composition waits for the committed Chinese query and suppresses form submission', async ({page}) => {
  let requests = 0;
  await page.route('**/index.json', async route => {requests++; await route.continue();});
  await page.goto('/search/');
  await ready(page);
  await pauseClock(page);
  await input(page).focus();
  await input(page).evaluate(node => {
    node.dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true}));
    node.value = '脚';
    node.dispatchEvent(new InputEvent('input', {bubbles: true, isComposing: true}));
    node.form.requestSubmit();
  });
  await page.clock.runFor(200);
  await expect(visibleEntries(page)).toHaveCount(entries.length);
  await expect(page).toHaveURL(/\/search\/$/);
  expect(requests).toBe(0);

  await input(page).evaluate(node => {
    node.value = '脚本';
    node.dispatchEvent(new CompositionEvent('compositionend', {bubbles: true, data: '脚本'}));
    node.dispatchEvent(new InputEvent('input', {bubbles: true, isComposing: false}));
  });
  await page.clock.runFor(149);
  expect(requests).toBe(0);
  await page.clock.runFor(1);
  await expect(visibleEntries(page)).toHaveCount(1);
  await expect(visibleEntries(page)).toContainText(technical.title);
  await expect(visibleEntries(page)).toHaveAttribute('lang', 'zh-CN');
  await expect(input(page)).toBeFocused();
  expect(requests).toBe(1);
});

test('clearing during index loading restores the static list and ignores stale results', async ({page}) => {
  let release;
  let requests = 0;
  const pending = new Promise(resolve => {release = resolve;});
  await page.route('**/index.json', async route => {
    requests++;
    await pending;
    await route.fulfill({contentType: 'application/json', body: JSON.stringify(entries)});
  });
  await page.goto('/search/');
  await ready(page);
  expect(requests).toBe(0);
  await input(page).fill('notebook');
  await expect(status(page)).toHaveText('正在搜索…');
  await expect(page.locator('#search-results')).toHaveAttribute('aria-busy', 'true');
  await input(page).fill('');
  await expect(visibleEntries(page)).toHaveCount(entries.length);
  await expect(status(page)).toContainText('显示全部');
  await ready(page);
  const finished = page.waitForResponse('**/index.json');
  release();
  await (await finished).finished();
  await expect(status(page)).toContainText('显示全部');
  await expect(visibleEntries(page)).toHaveCount(entries.length);
  await ready(page);
  await input(page).fill('zzzz-no-such-article');
  await expect(status(page)).toContainText('没有找到匹配的文章');
  await expect(visibleEntries(page)).toHaveCount(0);
  expect(requests).toBe(1);
});

test('an unavailable index leaves all static entries usable and can be retried by submitting', async ({page}) => {
  let requests = 0;
  await page.route('**/index.json', async route => {
    requests++;
    if (requests === 1) return route.abort();
    return route.fulfill({contentType: 'application/json', body: JSON.stringify(entries)});
  });
  await page.goto('/search/?q=notebook');
  await expect(status(page)).toContainText('再次搜索即可重试');
  await expect(visibleEntries(page)).toHaveCount(entries.length);
  await ready(page);
  await expect(visibleEntries(page).getByRole('link').first()).toHaveAttribute('href', /\/.+\//);
  await input(page).press('Enter');
  await expect(status(page)).toHaveText('找到 1 篇文章');
  await expect(visibleEntries(page)).toContainText(notebook.title);
  await expect(input(page)).toBeFocused();
  expect(requests).toBe(2);
});

test('back and forward restore query, results and existing history state', async ({page}) => {
  await page.goto('/search/?q=notebook&view=all#results');
  await expect(visibleEntries(page)).toHaveCount(1);
  await page.evaluate(() => {
    history.replaceState({searchSession: 'initial'}, '', location.href);
    const second = new URL(location.href);
    second.searchParams.set('q', '脚本');
    history.pushState({searchSession: 'second'}, '', second);
    const third = new URL(location.href);
    third.searchParams.set('q', '观察');
    history.pushState({searchSession: 'third'}, '', third);
  });
  await page.goBack();
  await expect(input(page)).toHaveValue('脚本');
  await expect(visibleEntries(page)).toHaveCount(1);
  await expect(visibleEntries(page)).toContainText(technical.title);
  expect(await page.evaluate(() => history.state)).toEqual({searchSession: 'second'});
  await page.goBack();
  await expect(input(page)).toHaveValue('notebook');
  await expect(visibleEntries(page)).toContainText(notebook.title);
  await page.goForward();
  await expect(input(page)).toHaveValue('脚本');

  await input(page).fill('zzzz-no-such-article');
  await expect(status(page)).toContainText('没有找到匹配的文章');
  expect(await page.evaluate(() => history.state)).toEqual({searchSession: 'second'});
  await page.goBack();
  await expect(input(page)).toHaveValue('notebook');
  await expect(visibleEntries(page)).toContainText(notebook.title);
  await page.goForward();
  await expect(input(page)).toHaveValue('zzzz-no-such-article');
  await expect(visibleEntries(page)).toHaveCount(0);
});
