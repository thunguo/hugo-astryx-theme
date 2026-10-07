import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, symlink, stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {commentsFixture, hugoFixture} from './hugo-fixture.mjs';
import {root, hugoPath} from '../scripts/runtime.mjs';

test('table of contents respects global false and explicit page overrides', async () => {
  const files = {};
  for (const [name, setting] of [['default', undefined], ['enabled', true], ['disabled', false]]) {
    const frontMatter = setting === undefined ? '' : `showToc: ${setting}\n`;
    files[`content/posts/${name}.md`] = `---\ntitle: ${name}\ndate: 2020-01-01\n${frontMatter}---\n\n## A real section\n\nContent below the heading.\n`;
  }
  for (const globalSetting of [false, true, undefined]) {
    const setting = globalSetting === undefined ? '' : `[params.astryx]\nshowToc = ${globalSetting}\n`;
    const {folder, output} = await hugoFixture({files, config: setting});
    try {
      for (const [name, expected] of [['default', globalSetting !== false], ['enabled', true], ['disabled', false]]) {
        const html = await readFile(join(output, 'posts', name, 'index.html'), 'utf8');
        assert(html.includes('id="a-real-section"'), 'Fixture must render a heading that can populate the TOC');
        const hasToc = /<details\b[^>]*class="[^"]*\barticle-toc\b/.test(html);
        assert.equal(hasToc, expected, `global showToc=${globalSetting ?? 'unset'}, page=${name}`);
      }
    } finally {await rm(folder, {recursive: true, force: true});}
  }
});

test('Hugo comment switches preserve global and individual false values', async () => {
  const fixture = await commentsFixture();
  try {
    assert(fixture.html.includes('data-comments-config'));
    for (const path of ['posts/disabled', 'photos/default', 'about']) {
      assert(!(await readFile(join(fixture.output, path, 'index.html'), 'utf8')).includes('data-comments-config'));
    }
    assert((await readFile(join(fixture.output, 'photos/override/index.html'), 'utf8')).includes('data-comments-config'));
    const json = fixture.html.match(/data-comments-config>(.*?)<\/script>/s)[1];
    const config = JSON.parse(json);
    assert.equal(config.strict, false);
    assert.equal(config.reactionsEnabled, false);
    assert.equal(config.term, 'shared-article');
    assert.equal(config.loading, 'manual');
  } finally {await rm(fixture.folder, {recursive: true, force: true});}
});

test('comments omit unconfigured backends and global disabled overrides page enabled', async () => {
  for (const options of [{enabled: false}, {configured: false}]) {
    const fixture = await commentsFixture(options);
    try {
      assert(!fixture.html.includes('data-comments-config'));
      assert(!(await readFile(join(fixture.output, 'photos/override/index.html'), 'utf8')).includes('data-comments-config'));
    } finally {await rm(fixture.folder, {recursive: true, force: true});}
  }
});

test('custom giscus theme and font paths work under a deployment subpath', async () => {
  const fixture = await commentsFixture({baseURL: 'https://example.org/blog/'});
  try {
    const config = JSON.parse(fixture.html.match(/data-comments-config>(.*?)<\/script>/s)[1]);
    assert.equal(config.themeLight, 'https://example.org/blog/giscus/astryx-light.css');
    assert.equal(config.themeDark, 'https://example.org/blog/giscus/astryx-dark.css');
    const client = JSON.parse(fixture.html.match(/id="astryx-config"[^>]*>(.*?)<\/script>/s)[1]);
    assert.match(client.galleryURL, /^\/blog\/js\/generated\/gallery\.[a-f0-9]+\.js$/);
    const viewerPath = client.galleryURL.replace(/^\/blog\//, '');
    assert((await readFile(join(fixture.output, viewerPath), 'utf8')).length > 0, 'The fingerprinted viewer must be published under the subpath');
    const css = await readFile(join(fixture.output, 'giscus/astryx-light.css'), 'utf8');
    assert(css.includes('url("../fonts/figtree-latin-variable.woff2")'));
  } finally {await rm(fixture.folder, {recursive: true, force: true});}
});

async function starterBuild({renamed = false, baseURL = 'https://example.org/', owner = ''} = {}) {
  await mkdir(join(root, 'work'), {recursive: true});
  const folder = await mkdtemp(join(root, 'work/starter-test-'));
  let source = root;
  if (renamed) {
    source = join(folder, 'another-user.github.io');
    await mkdir(source);
    // Link only Hugo inputs, never copy the checkout, dependencies or photos.
    for (const component of ['assets', 'layouts', 'static', 'i18n', 'archetypes', 'content']) {
      await symlink(join(root, component), join(source, component), 'dir');
    }
    for (const config of ['hugo.toml', 'blog.toml']) await symlink(join(root, config), join(source, config));
  }
  const output = join(folder, 'public');
  execFileSync(hugoPath(), ['--source', source, '--config', 'hugo.toml,blog.toml', '--baseURL', baseURL,
    '--destination', output, '--cacheDir', join(folder, 'cache'), '--noBuildLock'],
  {cwd: source, stdio: 'pipe', env: {...process.env, HUGO_GITHUB_OWNER: owner}});
  return {folder, output, html: await readFile(join(output, 'index.html'), 'utf8'),
    entries: JSON.parse(await readFile(join(output, 'index.json'), 'utf8'))};
}

test('the default root starter contains only Hello World and its utility pages', async () => {
  const fixture = await starterBuild();
  try {
    assert.equal(fixture.entries.length, 1);
    assert.equal(fixture.entries[0].title, 'Hello World');
    assert.equal(fixture.entries[0].section, 'posts');
    for (const path of ['posts', 'archives', 'search']) await stat(join(fixture.output, path, 'index.html'));
    assert(!fixture.html.includes('Fixture Author'));
  } finally {await rm(fixture.folder, {recursive: true, force: true});}
});

test('the starter works after checkout directory rename with no theme self-reference', async () => {
  const fixture = await starterBuild({renamed: true});
  try {
    assert.equal(fixture.entries.length, 1);
    assert.equal(fixture.entries[0].title, 'Hello World');
    assert(fixture.html.includes('astryx-app-shell'));
    assert(fixture.html.includes('generated/app.'));
  } finally {await rm(fixture.folder, {recursive: true, force: true});}
});

test('site author falls back to repository owner then title, with per-article overrides', async () => {
  const files = {
    'content/posts/default.md': '---\ntitle: Default author\ndate: 2020-01-01\n---\n\nA short article.\n',
    'content/posts/override.md': '---\ntitle: Article author\ndate: 2020-01-02\nauthor: Entry Author\n---\n\nA short article.\n',
  };
  for (const [config, owner, expected] of [
    ['[params.astryx.author]\nname = "Site Author"\n', 'repo-owner', 'Site Author'],
    ['', 'repo-owner', 'repo-owner'],
    ['', '', 'Fixture blog'],
  ]) {
    const fixture = await hugoFixture({files, config, env: {HUGO_GITHUB_OWNER: owner}});
    try {
      const html = await readFile(join(fixture.output, 'posts/default/index.html'), 'utf8');
      assert(html.includes(`<meta name="author" content="${expected}">`));
      const override = await readFile(join(fixture.output, 'posts/override/index.html'), 'utf8');
      assert(override.includes(`<meta name="author" content="${expected}">`), 'HTML metadata retains the site author');
      const schema = JSON.parse(override.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
      assert.equal(schema.author.name, 'Entry Author');
      assert.match(override, /class="article-author">[\s\S]*?Entry Author/);
      assert(override.includes(`© ${new Date().getFullYear()} ${expected}`), 'Footer uses the site author');
      const rss = await readFile(join(fixture.output, 'index.xml'), 'utf8');
      assert(rss.includes('<dc:creator>Entry Author</dc:creator>'));
      assert(rss.includes(`<dc:creator>${expected}</dc:creator>`));
    } finally {await rm(fixture.folder, {recursive: true, force: true});}
  }
});

test('root starter resources, canonical URLs and search work at a deployment subpath', async () => {
  const fixture = await starterBuild({renamed: true, baseURL: 'https://another-user.github.io/project/'});
  try {
    assert.equal(fixture.entries[0].url.startsWith('/project/posts/'), true);
    assert(fixture.html.includes('https://another-user.github.io/project/'));
    const assets = [...fixture.html.matchAll(/(?:href|src)="(\/project\/[^"#?]+\.(?:css|js|png))"/g)].map(match => match[1]);
    assert(assets.some(path => path.endsWith('.css')));
    assert(assets.some(path => path.endsWith('.js')));
    assert(assets.some(path => path.endsWith('.png')));
    for (const path of assets) await stat(join(fixture.output, path.replace(/^\/project\//, '')));
    const config = JSON.parse(fixture.html.match(/id="astryx-config"[^>]*>(.*?)<\/script>/s)[1]);
    assert.equal(config.searchIndexURL, '/project/index.json');
    assert.match(config.galleryURL, /^\/project\/js\/generated\/gallery\./);
    await stat(join(fixture.output, config.galleryURL.replace(/^\/project\//, '')));
  } finally {await rm(fixture.folder, {recursive: true, force: true});}
});

const mathPassthroughConfig = String.raw`
[markup.goldmark.extensions.passthrough]
enable = true
[markup.goldmark.extensions.passthrough.delimiters]
block = [['\[', '\]'], ['$$', '$$']]
inline = [['\(', '\)'], ['$', '$']]
`;

const mathCode = String.raw`$literal$ $$literal$$ \(literal\) \[literal\]`;
const mathPage = body => `---\ntitle: Math fixture\ndate: 2020-01-01\nsummary: Server-rendered math fixture.\n---\n\n${body}\n`;
const mathBody = String.raw`Dollar inline: $x^2+1$.

Parenthesis inline: \(a+b\).

$$
\frac{1}{2}
$$

\[
\sum_{n=1}^{3}n
\]

Inline code: ` + '`' + mathCode + '`' + '\n\n```text\n' + mathCode + '\n```\n';
const mathStyles = html => [...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"[^>]*>/g)]
  .map(match => match[1]).filter(path => /(?:\/katex\.min|\/math)\.[a-f0-9]+\.css$/.test(path));

// One fixture catches four supported delimiters, MathML accessibility, literal
// code and conditional CSS. Counting actual KaTeX roots avoids matching prose.
test('math renders on the server while code stays literal and CSS remains conditional', async () => {
  const fixture = await hugoFixture({config: mathPassthroughConfig, files: {
    'content/posts/math.md': mathPage(mathBody),
    'content/posts/code.md': mathPage('Inline code: `' + mathCode + '`\n\n```text\n' + mathCode + '\n```\n'),
    'content/posts/plain.md': mathPage('An ordinary paragraph.'),
  }});
  try {
    const html = await readFile(join(fixture.output, 'posts/math/index.html'), 'utf8');
    assert.equal([...html.matchAll(/class="katex"/g)].length, 4);
    assert.equal([...html.matchAll(/<math(?:\s|>)/g)].length, 4);
    assert.equal([...html.matchAll(/class="math-block"/g)].length, 2);
    const sources = [...html.matchAll(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g)]
      .map(match => match[1].trim());
    assert.deepEqual(sources, ['x^2+1', 'a+b', String.raw`\frac{1}{2}`, String.raw`\sum_{n=1}^{3}n`]);
    const codeElements = [...html.matchAll(/<code(?:\s[^>]*)?>([\s\S]*?)<\/code>/g)];
    assert.equal(codeElements.length, 2);
    for (const [, code] of codeElements) {
      assert(!code.includes('class="katex"'));
      assert(code.includes(mathCode), 'Code delimiters must remain literal');
    }
    const styles = mathStyles(html);
    assert.equal(styles.length, 2, 'A formula page needs local KaTeX and overflow styles');
    assert(styles.every(path => path.startsWith('/')), 'Math assets must be local');
    assert(!/<script\b[^>]*\bsrc="[^"]*(?:katex|mathjax)/i.test(html), 'Math needs no client renderer');
    for (const page of ['code', 'plain']) {
      const plain = await readFile(join(fixture.output, `posts/${page}/index.html`), 'utf8');
      assert.equal(mathStyles(plain).length, 0, `${page} must not load math CSS`);
      assert(!plain.includes('class="katex"'), `${page} must not render math`);
    }
  } finally {await rm(fixture.folder, {recursive: true, force: true});}
});

// Real deployments often use /project/. Verify CSS publications and every
// relative font URL, rather than assuming a copied font directory is sufficient.
test('math styles and their local fonts work under a deployment subpath', async () => {
  const fixture = await hugoFixture({baseURL: 'https://example.org/blog/', config: mathPassthroughConfig,
    files: {'content/posts/math.md': mathPage(mathBody)}});
  try {
    const html = await readFile(join(fixture.output, 'posts/math/index.html'), 'utf8');
    const styles = mathStyles(html);
    assert.equal(styles.length, 2);
    const katexPath = styles.find(path => path.includes('/katex.min.'));
    for (const path of styles) {
      assert(path.startsWith('/blog/'));
      await stat(join(fixture.output, path.slice('/blog/'.length)));
    }
    const css = await readFile(join(fixture.output, katexPath.slice('/blog/'.length)), 'utf8');
    const fonts = [...css.matchAll(/url\((?:["']?)([^)"']+)(?:["']?)\)/g)].map(match => match[1]);
    assert(fonts.length > 0, 'The local KaTeX stylesheet must reference its fonts');
    for (const font of fonts) {
      assert(!/^(?:[a-z]+:|\/)/i.test(font), `Font URL must remain relative: ${font}`);
      const url = new URL(font, `https://example.org${katexPath}`).pathname;
      assert(url.startsWith('/blog/'));
      await stat(join(fixture.output, url.slice('/blog/'.length)));
    }
  } finally {await rm(fixture.folder, {recursive: true, force: true});}
});
