import { spawn } from 'node:child_process';
import { root, hugoPath, blogConfig } from './runtime.mjs';

const child = spawn(hugoPath(), ['server', '--config', blogConfig,
  '--bind', '127.0.0.1', '--port', '1313', '--disableFastRender', '--noHTTPCache'],
{cwd: root, stdio: 'inherit'});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 0));
