import { resolve } from 'node:path';
import { run, root, hugoPath, blogConfig } from './runtime.mjs';

const args = ['--config', blogConfig, '--destination', 'public', '--minify', '--cleanDestinationDir'];
const base = process.argv.indexOf('--baseURL');
if (base !== -1) args.push('--baseURL', process.argv[base + 1]);
run(hugoPath(), args);
console.log(`Built site: ${resolve(root, 'public')}`);
