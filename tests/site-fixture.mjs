import {mkdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import {root} from '../scripts/runtime.mjs';
import {serveDirectory} from '../scripts/serve.mjs';
import {hugoFixture} from './hugo-fixture.mjs';

const paragraph = '这是阅读交互测试。文字保留在段落里，用来检查窄屏排版、目录定位与焦点恢复。';
const code = [
  'import csv', 'import json', '', 'entries = []', 'seen = set()', 'with open("reading.csv") as source:',
  '    reader = csv.DictReader(source)', '    for row in reader:', '        slug = row["slug"]',
  '        if slug in seen:', '            raise ValueError("duplicate")', '        seen.add(slug)',
  '        entries.append(row)', 'print(json.dumps(entries))',
].join('\n');
const technicalBody = `脚本处理复杂数据时，要保留明确的输入边界。\n\n## 输入与检查\n\n${paragraph.repeat(3)}\n\n` +
  '```csv {filename="reading.csv"}\nslug,title,status\nseeing-like-a-state,Seeing Like a State,reading\n```\n\n' +
  '```python {filename="notes_to_json.py" linenos=true hl_lines="12-14"}\n' + code + '\n```\n\n' +
  `## 重复运行\n\n${paragraph.repeat(4)}\n\n脚本中的行号需要明确解释。[^line]\n\n` +
  `| 字段 | 含义 |\n| --- | --- |\n| title | 标题 |\n\n> 输出应当可以检查。\n\n## 结果\n\n${paragraph.repeat(3)}\n\n[^line]: 这里的行号按原始输入计算。\n`;
const mathBrowserBody = '\n\nInline math: $E=mc^2$.\n\n$$\n' +
  Array.from({length: 32}, (_, index) => `x_{${index}}`).join(' + ') + '\n$$\n';


const englishBody = 'A notebook keeps a reading question near its source.\n\n## A precise observation\n\n' +
  'This paragraph tests readable English text, without relying on a personal story. '.repeat(12) +
  '\n\n## A small revision\n\nA note can be revised after another reading.\n';

// Short synthetic entries retain the existing test matrix: six post types,
// mixed language, related translations, utility exclusions and three images.
export const fixtureEntries = [
  {slug: 'small-scripts-with-care', title: '脚本测试：输入与结果', language: 'zh-CN', section: 'posts', postType: 'technical', body: technicalBody + mathBrowserBody, tags: ['Python', '测试']},
  {slug: 'a-working-notebook', title: 'A working notebook', language: 'en', section: 'posts', postType: 'essay', body: englishBody, tags: ['Reading']},
  {slug: 'where-the-path-turns', title: '一段观察', language: 'zh-CN', section: 'posts', postType: 'essay', body: '观察需要一个明确的对象。'},
  {slug: 'a-question-that-needs-room', title: '这是用于检查很长标题在不同屏幕中如何换行而不会破坏阅读布局的一篇测试文章', language: 'zh-CN', section: 'posts', postType: 'essay', body: '标题换行测试。'},
  {slug: 'name-the-observation-en', title: 'Name an observation', language: 'en', section: 'posts', postType: 'essay', translationKey: 'observation', body: 'One sentence describes the observation.'},
  {slug: 'name-the-observation-zh', title: '为观察命名', language: 'zh-CN', section: 'posts', postType: 'essay', translationKey: 'observation', body: '一句话描述观察。'},
  {slug: 'three-pauses', title: '图片交互测试', language: 'zh-CN', section: 'photos', cover: 'one.png', body: `${paragraph}\n\n![第一张测试图片](one.png "合成测试图片一")\n\n${paragraph.repeat(4)}\n\n![第二张测试图片](two.png "合成测试图片二")\n\n${paragraph.repeat(4)}\n\n![第三张测试图片](three.png "合成测试图片三")`},
  {slug: 'text-spacing', title: '文本间距测试', language: 'zh-CN', section: 'notes', body: '短笔记用于检查栏目与索引。'},
  {slug: 'cache-and-revalidation', title: '缓存测试', language: 'zh-CN', section: 'notes', body: '另一篇短笔记。'},
].map((entry, index) => ({...entry, url: `/${entry.section}/${entry.slug}/`, date: `2020-01-${String(15 - index).padStart(2, '0')}`,
  summary: '用于自动化验证的合成内容。', content: entry.body, tags: entry.tags || []}));

function png(color) {
  // Flat pixels keep the files tiny while exercising resized thumbnails and
  // independent original-image requests (the Markdown hook targets 1400px).
  const width = 1600, height = 1200;
  const rows = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rows.set(color, y * (width * 3 + 1) + 1 + x * 3);
  const chunk = (type, data) => {
    const name = Buffer.from(type), payload = Buffer.concat([name, data]);
    let crc = 0xffffffff;
    for (const byte of payload) {crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);}
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, payload, checksum]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

export async function browserFixture() {
  const files = {};
  for (const entry of fixtureEntries) {
    const {slug, section, body, url, content, ...frontmatter} = entry;
    const values = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n');
    files[`content/${section}/${slug}/index.md`] = `---\n${values}\n---\n\n${body}\n`;
  }
  for (const [section, title, layout] of [['posts', '文章'], ['notes', '研究'], ['photos', '摄影'], ['search', '搜索', 'search'], ['archives', '归档', 'archives']]) {
    files[`content/${section}/_index.md`] = `---\ntitle: ${title}\n${layout ? `layout: ${layout}\n` : ''}---\n`;
  }
  files['content/about/index.md'] = '---\ntitle: 关于\n---\n\n这是测试站。\n';
  ['one', 'two', 'three'].forEach((name, index) => {
    files[`content/photos/three-pauses/${name}.png`] = png([[150, 168, 154], [178, 169, 150], [151, 164, 176]][index]);
  });
  const navigation = [['文章', '/posts'], ['研究', '/notes'], ['摄影', '/photos'], ['关于', '/about']].map(([name, path], index) =>
    `[[menus.main]]\nname = ${JSON.stringify(name)}\npageRef = ${JSON.stringify(path)}\nweight = ${(index + 1) * 10}\n`).join('\n');
  return hugoFixture({files, config: `[params.astryx]\ncoverFallback = "art"\n[params.astryx.author]\nname = "Fixture Author"\n${navigation}`});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fixture = await browserFixture();
  await mkdir(join(root, 'work/browser-site'), {recursive: true});
  await writeFile(join(root, 'work/browser-site/path.json'), JSON.stringify(fixture));
  console.log(`Built isolated browser fixture: ${fixture.output}`);
  if (process.argv.includes('--serve')) serveDirectory(fixture.output, 4174);
}
