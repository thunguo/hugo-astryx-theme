import { mkdir, copyFile, readdir, unlink } from 'node:fs/promises';
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
