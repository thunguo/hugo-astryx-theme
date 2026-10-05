import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import {fileURLToPath} from 'node:url';
import { root } from './runtime.mjs';

const types = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.woff2': 'font/woff2'};
export function serveDirectory(directory = resolve(root, 'public'), port = 4173) {
const folder = resolve(directory);
return createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(folder, `.${pathname}`);
    if (!file.startsWith(folder + sep) && file !== folder) throw new Error('Outside document root');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const content = await readFile(file);
    response.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
    response.end(content);
  } catch {
    response.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
    response.end(await readFile(resolve(folder, '404.html')).catch(() => 'Not found'));
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = flag => {const position = process.argv.indexOf(flag); return position === -1 ? undefined : process.argv[position + 1];};
  serveDirectory(value('--dir') || resolve(root, 'public'), Number(value('--port') || process.env.PORT || 4173));
}
