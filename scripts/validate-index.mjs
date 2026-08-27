import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = JSON.parse(await fs.readFile(path.join(root, 'source.json'), 'utf8'));
const index = JSON.parse(await fs.readFile(path.join(root, 'Website', 'index.json'), 'utf8'));
const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

for (const field of ['name', 'id', 'url', 'author', 'packages']) {
  if (!index[field]) throw new Error(`Missing top-level field: ${field}`);
}
if (index.url !== source.url) throw new Error(`index.url must equal source.url (${source.url})`);
if (Object.keys(index.packages).length === 0) throw new Error('Registry has no packages');

for (const [packageId, packageListing] of Object.entries(index.packages)) {
  if (!packageListing.versions || Object.keys(packageListing.versions).length === 0) {
    throw new Error(`Package ${packageId} has no versions`);
  }
  for (const [version, manifest] of Object.entries(packageListing.versions)) {
    if (!semver.test(version)) throw new Error(`Invalid version key: ${packageId}@${version}`);
    for (const field of ['name', 'displayName', 'version', 'description', 'url', 'author']) {
      if (!manifest[field]) throw new Error(`${packageId}@${version} is missing manifest field ${field}`);
    }
    if (manifest.name !== packageId) throw new Error(`${packageId}@${version} has the wrong package name`);
    if (manifest.version !== version) throw new Error(`${packageId}@${version} does not match its version key`);
    if (!manifest.author.name || !manifest.author.email) throw new Error(`${packageId}@${version} has incomplete author metadata`);
    if (Object.keys(manifest.dependencies ?? {}).some((name) => name.startsWith('com.vrchat.'))) {
      throw new Error(`${packageId}@${version} declares a VRChat SDK dependency`);
    }
    await validateZip(manifest.url, packageId, version);
  }
}

const previousPath = process.argv[2];
if (previousPath) {
  try {
    const previous = JSON.parse(await fs.readFile(previousPath, 'utf8'));
    for (const [packageId, previousPackage] of Object.entries(previous.packages ?? {})) {
      if (!index.packages[packageId]) throw new Error(`Previously published package was removed: ${packageId}`);
      for (const version of Object.keys(previousPackage.versions ?? {})) {
        if (!index.packages[packageId].versions[version]) {
          throw new Error(`Previously published version was removed: ${packageId}@${version}`);
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function validateZip(url, packageId, version) {
  if (!/^https:\/\//.test(url)) throw new Error(`${packageId}@${version} URL must use HTTPS`);
  const response = await fetch(url, { headers: { 'User-Agent': 'Toys0125-BasisVPM', Accept: 'application/octet-stream' } });
  if (!response.ok) throw new Error(`${packageId}@${version} package URL returned HTTP ${response.status}`);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'basis-vpm-'));
  const zipPath = path.join(tempDir, 'package.zip');
  try {
    await fs.writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntry('package.json');
    if (!entry) throw new Error(`${packageId}@${version} ZIP has no root package.json`);
    const manifest = JSON.parse(zip.readAsText(entry));
    if (manifest.name !== packageId || manifest.version !== version) {
      throw new Error(`${packageId}@${version} ZIP manifest does not match the registry`);
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
