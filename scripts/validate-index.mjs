import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = JSON.parse(await fs.readFile(path.join(root, 'source.json'), 'utf8'));
const index = JSON.parse(await fs.readFile(path.join(root, 'index.json'), 'utf8'));
const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

for (const field of ['name', 'id', 'url', 'author', 'packages']) {
  if (!index[field]) throw new Error(`Missing top-level field: ${field}`);
}
if (index.url !== source.url) throw new Error(`index.url must equal source.url (${source.url})`);
if (!index.packages[source.packageName]) throw new Error(`Missing package ${source.packageName}`);

const packageListing = index.packages[source.packageName];
if (!packageListing.versions || Object.keys(packageListing.versions).length === 0) throw new Error('Package has no versions');

for (const [version, manifest] of Object.entries(packageListing.versions)) {
  if (!semver.test(version)) throw new Error(`Invalid version key: ${version}`);
  for (const field of ['name', 'displayName', 'version', 'description', 'url', 'author']) {
    if (!manifest[field]) throw new Error(`${version} is missing manifest field ${field}`);
  }
  if (manifest.name !== source.packageName) throw new Error(`${version} has the wrong package name`);
  if (manifest.version !== version) throw new Error(`${version} manifest version does not match its key`);
  if (!manifest.author.name || !manifest.author.email) throw new Error(`${version} has incomplete author metadata`);
  if (Object.keys(manifest.dependencies ?? {}).some((name) => name.startsWith('com.vrchat.'))) {
    throw new Error(`${version} declares a VRChat SDK dependency`);
  }
  await validateZip(manifest.url, version);
}

const previousPath = process.argv[2];
if (previousPath) {
  try {
    const previous = JSON.parse(await fs.readFile(previousPath, 'utf8'));
    for (const [packageName, previousPackage] of Object.entries(previous.packages ?? {})) {
      if (!index.packages[packageName]) throw new Error(`Previously published package was removed: ${packageName}`);
      for (const version of Object.keys(previousPackage.versions ?? {})) {
        if (!index.packages[packageName].versions[version]) {
          throw new Error(`Previously published version was removed: ${packageName}@${version}`);
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function validateZip(url, version) {
  if (!/^https:\/\//.test(url)) throw new Error(`${version} URL must use HTTPS`);
  const response = await fetch(url, { headers: { 'User-Agent': 'Toys0125-BasisVPM', Accept: 'application/octet-stream' } });
  if (!response.ok) throw new Error(`${version} package URL returned HTTP ${response.status}`);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'basis-vpm-'));
  const zipPath = path.join(tempDir, 'package.zip');
  try {
    await fs.writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
    const zip = new AdmZip(zipPath);
    const names = zip.getEntries().map((entry) => entry.entryName);
    if (!names.includes('package.json')) throw new Error(`${version} ZIP has no root package.json`);
    const manifest = JSON.parse(zip.readAsText(zip.getEntry('package.json')));
    if (manifest.name !== source.packageName || manifest.version !== version) {
      throw new Error(`${version} ZIP manifest does not match the registry`);
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
