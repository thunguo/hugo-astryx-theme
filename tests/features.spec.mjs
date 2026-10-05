import {test, expect} from '@playwright/test';
import {rm} from 'node:fs/promises';
import {commentsFixture, browserOrigin} from './hugo-fixture.mjs';

let fixture;
test.afterAll(async () => {if (fixture) await rm(fixture.folder, {recursive: true, force: true});});

test('article search is compact, marks matches, clears and restores focus', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/posts/');
  const trigger = page.getByRole('button', {name: '搜索', exact: true});
  await trigger.click();
  const dialog = page.getByRole('dialog', {name: '搜索文章'});
  const input = dialog.getByRole('combobox');
  await expect(dialog.getByRole('option')).toHaveCount(6);
  await expect(dialog).toContainText('最近发布');
  await expect(dialog.locator('.search-keyboard-hints')).not.toBeVisible();
  const rows = await dialog.getByRole('option').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(Math.max(...rows)).toBeLessThanOrEqual(110);
  await input.fill('notebook');
  await expect(dialog.getByRole('option')).toHaveCount(1);
  await expect(dialog.locator('.search-hit-title mark')).toHaveText('notebook');
  await dialog.getByRole('button', {name: '清空', exact: true}).click();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await expect(dialog.getByRole('option')).toHaveCount(6);
  await dialog.getByRole('button', {name: '关闭搜索', exact: true}).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('search retries a failed index and fits a short viewport', async ({page}) => {
  await page.setViewportSize({width: 360, height: 320});
  await page.route('**/index.json', route => route.abort());
  await page.goto('/');
  await page.getByRole('button', {name: '搜索', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: '搜索文章'});
  await expect(dialog).toContainText('搜索暂时无法加载');
  await expect(dialog.getByRole('link', {name: '浏览全部文章'})).toBeVisible();
  await page.unroute('**/index.json');
  await dialog.getByRole('button', {name: '重试', exact: true}).click();
  await expect(dialog.getByRole('option')).toHaveCount(6);
  const bounds = await dialog.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(320);
  await dialog.getByRole('combobox').fill('notebook');
  await expect(dialog.getByRole('option')).toHaveCount(1);
  await dialog.getByRole('combobox').evaluate(node => node.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', isComposing: true, bubbles: true})));
  await expect(dialog).toBeVisible();
});

test('code shows language and filename, highlights syntax and copies source without line numbers', async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    value: {writeText: async text => {window.copiedText = text;}}, configurable: true,
  }));
  await page.goto('/posts/small-scripts-with-care/');
  const block = page.locator('[data-code-block][data-code-language="python"]');
  await expect(block.locator('.code-block-language')).toHaveText('Python');
  await expect(block.locator('.code-block-filename')).toHaveText('notes_to_json.py');
  await expect(block.locator('.chroma .k').first()).toBeAttached();
  await expect(block.locator('.chroma .hl')).toHaveCount(3);
  await expect(block.locator('.chroma .ln').first()).toHaveAttribute('aria-hidden', 'true');
  const text = await block.evaluate(node => JSON.parse(node.dataset.codeSource));
  const labelHeight = await block.getByRole('button', {name: '复制代码', exact: true}).evaluate(button => {
    const label = [...button.querySelectorAll('span')].find(span => !span.childElementCount && span.textContent === '复制代码');
    return label?.getBoundingClientRect().height || 0;
  });
  expect(labelHeight).toBeGreaterThan(0);
  await block.getByRole('button', {name: '复制代码', exact: true}).click();
  await expect(block.getByRole('button', {name: '已复制', exact: true})).toBeVisible();
  expect(await page.evaluate(() => window.copiedText)).toBe(text);
  expect(text.startsWith('import csv\n')).toBe(true);
  const colors = await block.evaluate(node => ({
    keyword: getComputedStyle(node.querySelector('.k')).color,
    string: getComputedStyle(node.querySelector('.s2')).color,
  }));
  expect(colors.keyword).not.toBe(colors.string);
});

test('giscus loads on request, retries failures and follows the theme inside its iframe', async ({page}, testInfo) => {
  fixture ||= await commentsFixture();
  await page.route('**/posts/comments-fixture/', route => route.fulfill({contentType: 'text/html', body: fixture.html}));
  let fail = true;
  let requests = 0;
  let releaseFirst;
  const firstRequest = new Promise(resolve => {releaseFirst = resolve;});
  await page.route('https://giscus.app/client.js', async route => {
    requests++;
    if (requests === 1) await firstRequest;
    if (fail) return route.abort();
    return route.fulfill({contentType: 'text/javascript', headers: {'Access-Control-Allow-Origin': '*'}, body: `
      const script = document.currentScript;
      const frame = document.createElement('iframe');
      frame.className = 'giscus-frame';
      frame.src = 'https://giscus.app/test-frame?theme=' + encodeURIComponent(script.dataset.theme);
      frame.style.height = '300px';
      script.parentElement.append(frame);
    `});
  });
  await page.route('https://giscus.app/test-frame?**', route => route.fulfill({contentType: 'text/html', body: `
    <html><head><meta charset="utf-8"><link id="theme" rel="stylesheet" crossorigin="anonymous" href="${browserOrigin + 'giscus/astryx-light.css'}">
    <style>main{padding:4px;color:var(--color-fg-default)}.gsc-comment-box{border:1px solid var(--color-border-default)}.gsc-comment-box-tabs{display:flex;gap:16px;padding:12px}button{color:inherit;border:0;background:none;font:inherit}.gsc-comment-box-textarea{box-sizing:border-box;width:100%;padding:16px;border:0;background:transparent;color:inherit}.gsc-comment-box-bottom{padding:12px}.btn{background:var(--color-btn-primary-bg);color:var(--color-btn-primary-text)}</style></head>
    <body><main><p class="gsc-comments-count">0 条评论</p><div class="gsc-comment-box"><div class="gsc-comment-box-tabs"><button>写评论</button><button>预览</button></div><textarea class="gsc-comment-box-textarea" placeholder="写下你的想法…"></textarea><div class="gsc-comment-box-bottom gsc-comment-box-buttons"><button class="btn">通过 GitHub 登录</button></div></div></main>
    <script>window.addEventListener('message', event => {const theme=event.data?.giscus?.setConfig?.theme;if(theme)document.getElementById('theme').href=theme;});</script></body></html>
  `}));
  // The fixture serves a local copy with the same CORS headers required on deployment.
  await page.route('**/giscus/*.css', async route => {
    const response = await route.fetch();
    await route.fulfill({response, headers: {...response.headers(), 'Access-Control-Allow-Origin': '*'}});
  });
  await page.route('**/*.woff2', async route => {
    const response = await route.fetch();
    await route.fulfill({response, headers: {...response.headers(), 'Access-Control-Allow-Origin': '*'}});
  });
  await page.goto('/posts/comments-fixture/');
  const section = page.locator('[data-comments]');
  await expect(section).toHaveAttribute('data-comments-enhanced', 'true');
  expect(requests).toBe(0);
  const load = section.getByRole('button', {name: '加载评论', exact: true});
  await load.focus();
  await page.keyboard.press('Enter');
  await expect(section).toHaveAttribute('data-state', 'loading');
  await expect(load).toBeVisible();
  await expect(load).toBeFocused();
  await expect(load).toHaveAttribute('aria-disabled', 'true');
  await expect.poll(() => requests).toBe(1);
  await page.keyboard.press('Enter');
  expect(requests).toBe(1);
  releaseFirst();
  await expect(section).toHaveAttribute('data-state', 'error');
  await expect(section.getByRole('button', {name: '重新加载', exact: true})).toBeFocused();
  fail = false;
  await section.getByRole('button', {name: '重新加载', exact: true}).click();
  await expect(section).toHaveAttribute('data-state', 'ready');
  await expect(section.locator('iframe.giscus-frame')).toBeFocused();
  expect(requests).toBe(2);
  const script = section.locator('script[src="https://giscus.app/client.js"]');
  await expect(script).toHaveAttribute('data-strict', '0');
  await expect(script).toHaveAttribute('data-reactions-enabled', '0');
  await expect(script).toHaveAttribute('data-term', 'shared-article');
  const frame = page.frameLocator('iframe.giscus-frame');
  await expect(frame.locator('#theme')).toHaveAttribute('href', /astryx-light\.css$/);
  await expect.poll(() => frame.locator('main').evaluate(node => getComputedStyle(node).color)).toBe('rgb(21, 17, 12)');
  await section.screenshot({path: testInfo.outputPath('comments-light.png')});
  await page.getByRole('button', {name: '外观', exact: true}).click();
  await expect(frame.locator('#theme')).toHaveAttribute('href', /astryx-dark\.css$/);
  await expect.poll(() => frame.locator('main').evaluate(node => getComputedStyle(node).color)).toBe('rgb(223, 226, 229)');
  await expect.poll(() => frame.locator('html').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(31, 31, 34)');
  await section.screenshot({path: testInfo.outputPath('comments-dark.png')});
  const lazyHTML = fixture.html.replace('"loading":"manual"', '"loading":"lazy"')
    .replace('<section id="comments"', '<div style="height:2000px"></div><section id="comments"');
  await page.route('**/posts/comments-fixture/', route => route.fulfill({contentType: 'text/html', body: lazyHTML}));
  await page.goto('/posts/comments-fixture/');
  await expect(section).toHaveAttribute('data-comments-enhanced', 'true');
  expect(requests).toBe(2);
  const search = page.getByRole('button', {name: '搜索', exact: true});
  await search.focus();
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute('data-state', 'ready');
  await expect(search).toBeFocused();
  expect(requests).toBe(3);
});
