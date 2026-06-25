import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'scraped-database');
const destDir = path.join(root, 'src', 'data');

await mkdir(destDir, { recursive: true });
await copyFile(path.join(srcDir, 'records.json'), path.join(destDir, 'records.json'));
await copyFile(path.join(srcDir, 'data-metadata.json'), path.join(destDir, 'data-metadata.json'));

console.log('Synced scraped-database records into src/data.');
