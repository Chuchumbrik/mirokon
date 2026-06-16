import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const lines = readFileSync(resolve(root, 'admin.html'), 'utf8').split(/\r?\n/);
const out = [...lines.slice(0, 447), '<script src="/admin.js"></script>', ...lines.slice(1394)];
writeFileSync(resolve(root, 'admin.html'), out.join('\n'), 'utf8');
const js = lines.slice(448, 1393).map(l => l.replace(/^  /, '')).join('\n');
writeFileSync(resolve(root, 'admin.js'), js, 'utf8');
console.log('ok', js.length);
