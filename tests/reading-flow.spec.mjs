import {test, expect} from '@playwright/test';
import {fixtureEntries as entries} from './site-fixture.mjs';

const article = entries.find(entry => entry.url.includes('small-scripts'));
const photo = entries.find(entry => entry.section === 'photos');

test('overflow edges follow code and table scroll positions without affecting the toolbar', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.route(`**${article.url}`, async route => {
    const response = await route.fetch();
    const cells = Array.from({length: 10}, (_, index) => `<td>long-column-${index}</td>`).join('');
    const fixture = `<table data-wide-table><tr>${cells}</tr></table>`;
    await route.fulfill({response, body: (await response.text()).replace('class="article-content prose">', `class="article-content prose">${fixture}`)});
  });
  await page.goto(article.url);
  const pre = page.locator('[data-code-language="csv"] pre');
  const code = page.locator('[data-code-language="csv"]');
  await expect(code).toHaveAttribute('data-overflow-right', '');
  await expect(code).not.toHaveAttribute('data-overflow-left', '');
  const position = await code.evaluate(node => ({
    fade: parseFloat(getComputedStyle(node, '::after').top),
    toolbar: node.querySelector('.code-block-toolbar').getBoundingClientRect().bottom - node.getBoundingClientRect().top,
  }));
  expect(position.fade).toBeGreaterThanOrEqual(position.toolbar - 1);
  await pre.evaluate(node => {node.scrollLeft = node.scrollWidth;});
  await expect(code).toHaveAttribute('data-overflow-left', '');
  await expect(code).not.toHaveAttribute('data-overflow-right', '');
  const table = page.locator('[data-wide-table]');
  const frame = page.locator('.table-scroll-frame').filter({has: table});
  await expect(frame).toHaveAttribute('data-overflow-right', '');
  await table.evaluate(node => {node.scrollLeft = node.scrollWidth;});
  await expect(frame).not.toHaveAttribute('data-overflow-right', '');
  await expect(frame).toHaveAttribute('data-overflow-left', '');
  await page.setViewportSize({width: 1440, height: 1000});
  await expect(code).not.toHaveAttribute('data-overflow-right', '');
  await expect(code).not.toHaveAttribute('data-overflow-left', '');
});

test('footnote navigation and browser history preserve the reading focus and scroll clearance', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto(article.url);
  const reference = page.locator('.footnote-ref').first();
  const noteID = decodeURIComponent((await reference.getAttribute('href')).slice(1));
  const target = page.locator(`[id="${noteID}"]`);
  await reference.click();
  await expect(target).toBeFocused();
  await expect(target).toHaveClass(/reading-target/);
  const back = target.locator('.footnote-backref');
  await expect(back).toContainText('返回正文');
  await back.click();
  await expect(reference).toBeFocused();
  const top = await reference.evaluate(node => node.closest('sup').getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(71);
  expect(top).toBeLessThanOrEqual(74);
  await page.goBack();
  await expect(target).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();
  await page.goForward();
  await expect(reference).toBeFocused();
  await page.keyboard.press('Tab');
  const subsequent = await page.evaluate(() => document.activeElement.getBoundingClientRect().top);
  expect(subsequent).toBeGreaterThanOrEqual(48);
});

test('closing the lightbox restores the original reading position immediately', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(photo.url);
  const image = page.locator('a[data-lightbox]').last();
  await image.scrollIntoViewIfNeeded();
  const position = await page.evaluate(() => scrollY);
  await image.click();
  await expect(page.locator('dialog.astryx-lightbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(image).toBeFocused();
  const samples = await page.evaluate(async () => {
    const values = [scrollY];
    await new Promise(resolve => requestAnimationFrame(resolve));
    values.push(scrollY);
    await new Promise(resolve => setTimeout(resolve, 80));
    values.push(scrollY);
    return values;
  });
  for (const value of samples) expect(Math.abs(value - position)).toBeLessThanOrEqual(1);
});

test('the palette carries the current query into the full search page', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name: '搜索', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: '搜索文章'});
  await dialog.getByRole('combobox').fill('notebook');
  await expect(dialog.getByRole('option')).toHaveCount(1);
  await dialog.getByRole('link', {name: '全部结果'}).click();
  await expect(page).toHaveURL(/\/search\/\?q=notebook$/);
  await expect(page.locator('input[data-search-input]')).toHaveValue('notebook');
  await expect(page.locator('#search-results .search-entry:visible')).toHaveCount(1);
});
