import { mkdir, copyFile, readdir, unlink, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..');
const target = resolve(root, 'assets/css/generated');
await mkdir(target, {recursive: true});
await mkdir(resolve(root, 'assets/js/generated'), {recursive: true});
await unlink(resolve(root, 'layouts/_partials/ui/shell.html')).catch(error => {if (error.code !== 'ENOENT') throw error;});

const cli = require.resolve('@astryxdesign/cli');
const result = spawnSync(process.execPath, [cli, 'theme', 'build', 'src/site-theme.mjs',
  '--out', 'assets/css/generated/astryx-theme.css', '--icons-specifier', '../../../src/icons.mjs'],
{cwd: root, stdio: 'inherit'});
if (result.status !== 0) process.exit(result.status || 1);

await copyFile(require.resolve('@astryxdesign/core/reset.css'), resolve(target, 'astryx-reset.css'));
await copyFile(require.resolve('@astryxdesign/core/astryx.css'), resolve(target, 'astryx-core.css'));
const fontDir = resolve(root, 'assets/fonts');
await mkdir(fontDir, {recursive: true});
await copyFile(require.resolve('@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2'), resolve(fontDir, 'figtree-latin-variable.woff2'));
await copyFile(require.resolve('@fontsource-variable/figtree/LICENSE'), resolve(fontDir, 'OFL.txt'));

// Hugo renders equations; only KaTeX's CSS and modern web fonts are shipped.
const katexSource = resolve(require.resolve('katex/package.json'), '..');
const katexTarget = resolve(root, 'assets/vendor/katex');
await mkdir(resolve(katexTarget, 'fonts'), {recursive: true});
const katexCSS = await readFile(resolve(katexSource, 'dist/katex.min.css'), 'utf8');
const webFontCSS = katexCSS.replace(/src:([^;}]+)/g, (source, formats) => {
  const woff2 = formats.match(/url\([^)]*\.woff2\)\s*format\("woff2"\)/);
  if (!woff2) throw new Error('A KaTeX font is missing its WOFF2 source');
  return `src:${woff2[0]}`;
});
await writeFile(resolve(katexTarget, 'katex.min.css'), webFontCSS);
for (const file of await readdir(resolve(katexSource, 'dist/fonts'))) {
  if (file.endsWith('.woff2')) await copyFile(resolve(katexSource, 'dist/fonts', file), resolve(katexTarget, 'fonts', file));
}
await copyFile(resolve(katexSource, 'LICENSE'), resolve(katexTarget, 'LICENSE'));

await build({entryPoints: [resolve(root, 'scripts/render-ui.jsx')], outfile: resolve(root, 'work/render-ui.mjs'),
  bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'}, logLevel: 'warning'});
const rendered = spawnSync(process.execPath, [resolve(root, 'work/render-ui.mjs')], {cwd: root, stdio: 'inherit'});
if (rendered.status !== 0) process.exit(rendered.status || 1);
const jsTarget = resolve(root, 'assets/js/generated');
for (const file of await readdir(jsTarget)) await unlink(resolve(jsTarget, file));
await build({
  entryPoints: [resolve(root, 'src/app.jsx'), resolve(root, 'src/gallery.jsx')],
  outdir: resolve(root, 'assets/js/generated'),
  bundle: true, splitting: true, format: 'esm', target: ['es2022'],
  minify: true, sourcemap: false, jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'},
  entryNames: '[name]', chunkNames: '[name]-[hash]',
  legalComments: 'linked', logLevel: 'info',
});
