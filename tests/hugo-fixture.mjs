import {mkdtemp, mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {root, hugoPath} from '../scripts/runtime.mjs';

export const browserOrigin = 'http://127.0.0.1:4174/';

// Fixtures mount the real theme directories without importing a named theme
// or copying a repository. Content and all generated output stay under work/.
export async function hugoFixture({files = {}, config = '', baseURL = browserOrigin, env = {}} = {}) {
  await mkdir(join(root, 'work'), {recursive: true});
  const folder = await mkdtemp(join(root, 'work/hugo-fixture-'));
  for (const [path, data] of Object.entries(files)) {
    const destination = join(folder, path);
    await mkdir(join(destination, '..'), {recursive: true});
    await writeFile(destination, data);
  }
  const mounts = ['layouts', 'assets', 'static', 'i18n', 'archetypes'].map(component =>
    `[[module.mounts]]\nsource = ${JSON.stringify(join(root, component))}\ntarget = ${JSON.stringify(component)}\n`).join('\n');
  await writeFile(join(folder, 'hugo.toml'), `baseURL = ${JSON.stringify(baseURL)}
title = "Fixture blog"
defaultContentLanguage = "zh-cn"
hasCJKLanguage = true
[languages.zh-cn]
locale = "zh-CN"
[taxonomies]
tag = "tags"
[outputs]
home = ["HTML", "RSS", "JSON"]
[params.astryx]
uiLocale = "zh-CN"
mainSections = ["posts"]
[markup.goldmark.parser]
wrapStandAloneImageWithinParagraph = false
[markup.goldmark.parser.attribute]
block = true
title = true
[markup.highlight]
noClasses = false
[[module.mounts]]
source = "content"
target = "content"
${mounts}`);
  await writeFile(join(folder, 'overlay.toml'), config);
  const output = join(folder, 'public');
  execFileSync(hugoPath(), ['--source', folder, '--config', 'hugo.toml,overlay.toml', '--destination', output,
    '--cacheDir', join(folder, 'cache'), '--noBuildLock'], {cwd: root, stdio: 'pipe', env: {...process.env, HUGO_GITHUB_OWNER: '', ...env}});
  return {folder, output};
}

export async function commentsFixture({enabled = true, configured = true, baseURL = browserOrigin} = {}) {
  const page = (title, params = '') => `---\ntitle: ${title}\ndate: 2020-01-01\nlanguage: zh-CN\n${params}---\n\n用于验证评论的正文。\n`;
  const fixture = await hugoFixture({baseURL, files: {
    'content/posts/enabled.md': page('启用评论', 'giscusTerm: shared-article\n'),
    'content/posts/disabled.md': page('关闭评论', 'comments: false\n'),
    'content/photos/default.md': page('默认摄影'),
    'content/photos/override.md': page('摄影评论', 'comments: true\n'),
    'content/about/index.md': page('关于'),
  }, config: `[params.astryx.comments]\nenabled = ${enabled}\nrepo = "${configured ? 'test-fixture/comments' : ''}"\nrepoID = "${configured ? 'fixture-repo-id' : ''}"\ncategory = "${configured ? 'Comments' : ''}"\ncategoryID = "${configured ? 'fixture-category-id' : ''}"\nmapping = "specific"\nstrict = false\nreactionsEnabled = false\nloading = "manual"\n`});
  return {...fixture, html: await readFile(join(fixture.output, 'posts/enabled/index.html'), 'utf8')};
}
