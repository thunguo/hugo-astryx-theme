import { test, expect } from '@playwright/test';
import {fixtureEntries as entries} from './site-fixture.mjs';

const chinese = entries.find(entry => entry.url.includes('small-scripts'));
const english = entries.find(entry => entry.language === 'en' && !entry.url.includes('name-the'));
const photo = entries.find(entry => entry.section === 'photos');

test('static articles, navigation and images remain usable without JavaScript', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('navigation', {name: '主导航'}).first()).toBeVisible();
  await expect(page.getByRole('link', {name: '文章', exact: true})).toBeVisible();
  await page.goto(chinese.url);
  await expect(page.locator('.breadcrumbs [aria-current="page"] [lang]')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('.prose pre').first()).toBeVisible();
  await expect(page.locator('.prose')).toContainText('脚本');
  await page.goto(photo.url);
  await expect(page.locator('a[data-lightbox]').first()).toHaveAttribute('href', /\.png/);
  await context.close();
});

test('articles and phone layouts stay within the viewport', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const failed = [];
  page.on('response', response => {if (response.status() >= 400) failed.push(response.url());});
  for (const url of ['/', chinese.url, english.url, '/archives/', '/notes/', '/photos/', '/search/', '/about/']) {
    await page.goto(url);
    await expect(page.locator('#astryx-header').getByRole('button', {name: '搜索', exact: true})).toBeVisible();
    const width = await page.evaluate(() => ({body: document.documentElement.scrollWidth, screen: innerWidth}));
    expect(width.body).toBeLessThanOrEqual(width.screen + 1);
  }
  await page.goto(english.url);
  await expect(page.locator('.blog-article')).toHaveAttribute('lang', 'en');
  const englishType = await page.locator('.prose p').first().evaluate(node => ({
    size: getComputedStyle(node).fontSize, leading: getComputedStyle(node).lineHeight,
  }));
  expect(englishType).toEqual({size: '17px', leading: '28px'});
  await page.goto(chinese.url);
  const chineseType = await page.locator('.prose p').first().evaluate(node => ({
    size: getComputedStyle(node).fontSize, leading: getComputedStyle(node).lineHeight,
  }));
  expect(chineseType).toEqual({size: '17px', leading: '28px'});
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    expect((await page.locator('.breadcrumbs a').boundingBox()).height).toBeGreaterThanOrEqual(40);
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('search finds Chinese and English writing and is keyboard usable', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name: '搜索', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: '搜索文章'});
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('combobox');
  expect(await input.evaluate(node => getComputedStyle(node).outlineStyle)).toBe('none');
  await input.fill('复杂');
  await expect(dialog.getByRole('option').first()).toBeVisible();
  await input.fill('notebook');
  await expect(dialog.getByRole('option').filter({hasText: english.title})).toBeVisible();
  await input.fill('zzzz-no-such-article');
  await expect(dialog).toContainText('没有找到文章');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', {name: '搜索', exact: true}).focus();
  await page.keyboard.press('Control+k');
  await expect(dialog).toBeVisible();
});

test('long article outline, captions and tags stay readable within a narrow page', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await page.goto(english.url);
  const token = 'AnUnbrokenArticleLabel'.repeat(12);
  await page.evaluate(token => {
    document.querySelector('.article-toc').open = true;
    document.querySelector('.article-toc a').textContent = token;
    const figure = document.createElement('figure');
    figure.className = 'prose-image';
    const caption = document.querySelector('figcaption') || figure.appendChild(document.createElement('figcaption'));
    if (!figure.parentNode && figure.childNodes.length) document.querySelector('.prose').appendChild(figure);
    caption.textContent = token;
    const badge = document.querySelector('.post-tags .astryx-badge');
    badge.title = token;
    badge.lastElementChild.textContent = token;
  }, token);
  await page.evaluate(() => document.fonts.ready);
  for (const selector of ['.article-toc a', 'figcaption', '.post-tags', '.post-tags li', '.post-tags a', '.post-tags .astryx-badge']) {
    const geometry = await page.locator(selector).first().evaluate(node => {
      const content = document.querySelector('.blog-article').getBoundingClientRect();
      const box = node.getBoundingClientRect();
      return {left: box.left, right: box.right, contentLeft: content.left, contentRight: content.right, client: node.clientWidth, scroll: node.scrollWidth};
    });
    expect(geometry.left).toBeGreaterThanOrEqual(geometry.contentLeft - 1);
    expect(geometry.right).toBeLessThanOrEqual(geometry.contentRight + 1);
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
  }
  await expect(page.locator('.post-tags .astryx-badge').first()).toHaveAttribute('title', token);
});

test('appearance preference persists across navigation', async ({page}) => {
  await page.goto('/');
  const button = page.getByRole('button', {name: /^外观/});
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await button.click();
  await page.goto(english.url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const background = await page.locator('.astryx-app-shell').first().evaluate(node => getComputedStyle(node).backgroundColor);
  expect(background).toBe('rgb(31, 31, 34)');
});

test('Astryx category controls filter cards and mobile navigation works', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  const group = page.getByRole('group', {name: '筛选文章'});
  await group.getByRole('button', {name: /技术/}).click();
  await expect(page.locator('.post-grid .post-card:visible')).toHaveCount(1);
  await expect(page.locator('.post-grid .post-card:visible')).toContainText(chinese.title);
  await group.getByRole('button', {name: /随笔/}).click();
  await expect(page.locator('.post-grid .post-card:visible')).toHaveCount(5);
  await group.getByRole('button', {name: /全部/}).click();
  await expect(page.locator('.post-grid .post-card:visible')).toHaveCount(6);
  await page.setViewportSize({width: 390, height: 844});
  const menu = page.getByRole('button', {name: '打开菜单', exact: true});
  await menu.click();
  const dialog = page.getByRole('dialog', {name: '导航菜单'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', {name: '摄影', exact: true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(menu).toBeFocused();
});

test('gallery opens real Astryx Lightbox and restores focus', async ({page}) => {
  await page.goto(photo.url);
  const image = page.locator('a[data-lightbox]').first();
  await image.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toHaveAttribute('alt', /./);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(image).toBeFocused();
});

test('search page filters its static index and handles a failed index', async ({page}) => {
  await page.goto('/search/?q=notebook');
  await expect(page.locator('#search-status')).toContainText('找到');
  await expect(page.locator('[data-search-url]:visible')).toHaveCount(1);
  await expect(page.locator('[data-search-url]:visible')).toContainText(english.title);
  await page.route('**/index.json', route => route.abort());
  await page.reload();
  await expect(page.locator('#search-status')).toContainText('暂时无法加载');
  await expect(page.locator('[data-search-url]:visible')).toHaveCount(entries.length);
});

test('compact navigation fits narrow screens and dismisses without leaving a focus trap', async ({page}) => {
  await page.goto('/posts/');
  for (const width of [320, 360, 390, 767]) {
    await page.setViewportSize({width, height: 844});
    const heading = page.locator('#astryx-header .astryx-top-nav-heading');
    const search = page.locator('#astryx-header').getByRole('button', {name: '搜索', exact: true});
    const brandRect = await heading.boundingBox();
    const searchRect = await search.boundingBox();
    expect(brandRect.x + brandRect.width).toBeLessThanOrEqual(searchRect.x);
    expect(searchRect.width).toBeGreaterThanOrEqual(40);
    expect(searchRect.height).toBeGreaterThanOrEqual(40);
    expect(await page.locator('#astryx-header .astryx-top-nav').evaluate(node => node.offsetHeight)).toBe(48);
    const menu = page.getByRole('button', {name: '打开菜单', exact: true});
    await menu.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', {name: '导航菜单'});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', {name: '文章', exact: true})).toBeFocused();
    expect(await dialog.getByRole('link', {name: '文章', exact: true}).evaluate(node => getComputedStyle(node).outlineWidth)).toBe('2px');
    await expect(dialog.getByRole('link', {name: '文章', exact: true})).toHaveAttribute('aria-current', 'page');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const box = await dialog.boundingBox();
    expect(box.height).toBeLessThan(360);
    expect(box.y).toBeGreaterThanOrEqual(40);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(await dialog.evaluate(node => getComputedStyle(node).outlineWidth)).toBe('0px');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(menu).toBeFocused();
  }
  await page.setViewportSize({width: 375, height: 812});
  const menu = page.getByRole('button', {name: '打开菜单', exact: true});
  await menu.click();
  await page.mouse.click(12, 400);
  await expect(page.getByRole('dialog', {name: '导航菜单'})).not.toBeVisible();
  await menu.click();
  await page.setViewportSize({width: 1024, height: 812});
  await expect(page.getByRole('dialog', {name: '导航菜单'})).not.toBeVisible();
  await expect(page.locator('.site-nav-desktop').getByRole('link', {name: '摄影', exact: true})).toBeVisible();
  await page.getByRole('button', {name: '搜索', exact: true}).click();
  await expect(page.getByRole('dialog', {name: '搜索文章'}).getByRole('combobox')).toBeFocused();
});

test('plain code keeps its first line clear and copying stays available while scrolling', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  const text = `first line\n${'long-code-column '.repeat(40)}`;
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    value: {writeText: async text => {window.copiedText = text;}}, configurable: true,
  }));
  await page.route(`**${chinese.url}`, async route => {
    const response = await route.fetch();
    const content = await response.text();
    const cells = Array.from({length: 10}, (_, i) => `<td>column${i}</td>`).join('');
    const fixture = `<pre data-plain-code><code>${text}</code></pre><table data-wide-table><tr>${cells}</tr></table>`;
    await route.fulfill({response, body: content.replace('class="article-content prose">', `class="article-content prose">${fixture}`)});
  });
  await page.goto(chinese.url);
  const pre = page.locator('[data-plain-code]');
  const copy = page.locator('.code-block').filter({has: pre}).locator('.code-copy-button button');
  await expect(copy).toBeVisible();
  const firstLine = await pre.evaluate(node => {
    const range = document.createRange();
    range.setStart(node.querySelector('code').firstChild, 0);
    range.setEnd(node.querySelector('code').firstChild, 10);
    return range.getBoundingClientRect().top;
  });
  const originalButton = await copy.boundingBox();
  expect(originalButton.y + originalButton.height).toBeLessThanOrEqual(firstLine);
  await expect(pre).toHaveAttribute('tabindex', '0');
  await pre.evaluate(node => {node.scrollLeft = node.scrollWidth;});
  const scrolledButton = await copy.boundingBox();
  expect(scrolledButton.x).toBe(originalButton.x);
  await copy.click();
  await expect(copy).toHaveText(/已复制/);
  expect(await page.evaluate(() => window.copiedText)).toBe(text);
  const table = page.locator('[data-wide-table]');
  await expect(table).toHaveAttribute('tabindex', '0');
  await page.setViewportSize({width: 1440, height: 1000});
  await expect(table).not.toHaveAttribute('tabindex', '0');
});

test('reduced motion, phone search and table of contents preserve a calm reading flow', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await page.getByRole('button', {name: '打开菜单', exact: true}).click();
  const menu = page.getByRole('dialog', {name: '导航菜单'});
  const animation = await menu.evaluate(node => getComputedStyle(node.closest('[popover]')).animationName);
  expect(animation).toBe('none');
  await page.keyboard.press('Control+k');
  await expect(menu).not.toBeVisible();
  const search = page.getByRole('dialog', {name: '搜索文章'});
  await expect(search.getByRole('combobox')).toBeFocused();
  expect(await search.getByRole('combobox').evaluate(node => getComputedStyle(node).fontSize)).toBe('16px');
  await page.keyboard.press('Escape');
  await page.goto(chinese.url);
  await page.locator('.article-toc summary').click();
  const link = page.locator('.article-toc a').first();
  const hash = await link.getAttribute('href');
  await link.click();
  await expect.poll(() => page.evaluate(hash => Math.round(document.getElementById(decodeURIComponent(hash.slice(1))).getBoundingClientRect().top), hash)).toBe(72);
});
