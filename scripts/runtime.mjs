import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..');
export const blogConfig = 'hugo.toml,blog.toml';
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {cwd: root, stdio: 'inherit', ...options});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
}
export function hugoPath() {
  if (process.env.HUGO_BINARY) return process.env.HUGO_BINARY;
  const local = resolve(root, '.tools/hugo');
  if (existsSync(local)) return local;
  const check = spawnSync('hugo', ['version'], {encoding: 'utf8'});
  if (check.status === 0) return 'hugo';
  throw new Error('Hugo >= 0.146 is required. Install Hugo or set HUGO_BINARY to its executable.');
}
