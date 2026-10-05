import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { root, run } from './runtime.mjs';

const publicDir = resolve(root, 'public');
async function walk(folder) {
  const entries = await readdir(folder, {withFileTypes: true});
  const files = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(folder, entry.name)) : join(folder, entry.name)));
  return files.flat();
}
const files = await walk(publicDir);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const errors = [];
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  if (html.includes('ZgotmplZ') || html.includes('ERROR:')) errors.push(`${file}: template error`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${file}: missing page title`);
  if (!/<main[ >]/.test(html) && !/role=(?:["']main["']|main(?=[\s>]))/.test(html) && !/http-equiv=["']?refresh/i.test(html)) errors.push(`${file}: missing main landmark`);
  for (const match of html.matchAll(/\b(?:href|src)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    const path = match[1] ?? match[2] ?? match[3];
    if (/^(?:[a-z]+:|#|\/\/)/i.test(path)) continue;
    const pathname = decodeURIComponent(new URL(path, 'http://localhost' + file.slice(publicDir.length)).pathname);
    let local = resolve(publicDir, `.${pathname}`);
    try {
      if ((await stat(local)).isDirectory()) local = join(local, 'index.html');
      await stat(local);
    } catch {errors.push(`${file}: unresolved link ${path}`);}
  }
}
const index = JSON.parse(await readFile(join(publicDir, 'index.json'), 'utf8'));
assert(Array.isArray(index) && index.length > 0, 'Expected an article search index');
assert(index.every(entry => typeof entry.language === 'string' && entry.language.length > 0), 'Search entries must retain their article language');
assert.equal(new Set(index.map(entry => entry.url)).size, index.length, 'Index URLs must be unique');
assert(!index.some(entry => ['about', 'search', 'archives'].includes(entry.section)), 'Utility pages should not pollute search');
assert.deepEqual(errors, []);
run(process.execPath, ['--test', 'tests/search.test.mjs', 'tests/render.test.mjs']);
console.log(`Checked ${htmlFiles.length} HTML pages, internal links and ${index.length} search entries.`);
