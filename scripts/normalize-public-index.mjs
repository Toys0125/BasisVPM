import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const indexPath = path.join(root, 'Website', 'index.json');
const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));

for (const packageListing of Object.values(index.packages ?? {})) {
  for (const manifest of Object.values(packageListing.versions ?? {})) {
    if (manifest.author && typeof manifest.author === 'object') {
      delete manifest.author.email;
    }
    manifest.unity = '6000.0';
  }
}

await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
