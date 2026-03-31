import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

await mkdir(dist, { recursive: true });
await copyFile(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));

console.log('Copied manifest.json to dist/manifest.json');
