import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = JSON.parse(await fs.readFile(path.join(root, 'source.json'), 'utf8'));
const [owner, repo] = source.githubRepos[0].split('/');
const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

const releases = await getJson(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`);
const versions = [];

for (const release of releases) {
  if (release.draft || !release.tag_name.startsWith(source.releaseTagPrefix)) continue;
  const version = release.tag_name.slice(source.releaseTagPrefix.length);
  if (!semverPattern.test(version)) throw new Error(`Invalid Basis release tag: ${release.tag_name}`);

  const asset = release.assets.find((candidate) =>
    candidate.name === `${source.packageName}-${version}.zip` ||
    (candidate.name.endsWith('.zip') && candidate.name.includes(source.packageName))
  );
  if (!asset) throw new Error(`No package ZIP found in release ${release.tag_name}`);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'basis-vpm-'));
  const zipPath = path.join(tempDir, asset.name);
  try {
    await download(asset.browser_download_url, zipPath);
    const zip = new AdmZip(zipPath);
    const names = zip.getEntries().map((entry) => entry.entryName);
    if (!names.includes('package.json')) throw new Error(`${asset.name} must contain package.json at its archive root`);
    const manifest = JSON.parse(zip.readAsText(zip.getEntry('package.json')));
    validateManifest(manifest, source.packageName, version);
    versions.push({ version, manifest: { ...manifest, url: asset.browser_download_url } });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

if (versions.length === 0) throw new Error(`No ${source.releaseTagPrefix} releases were found`);

versions.sort((a, b) => compareSemver(b.version, a.version));
const index = {
  name: source.name,
  id: source.id,
  url: source.url,
  author: source.author,
  description: source.description,
  infoLink: source.infoLink,
  packages: {
    [source.packageName]: {
      versions: Object.fromEntries(versions.map(({ version, manifest }) => [version, manifest]))
    }
  }
};
const serialized = `${JSON.stringify(index, null, 2)}\n`;
await fs.writeFile(path.join(root, 'index.json'), serialized);
await fs.mkdir(path.join(root, 'Website'), { recursive: true });
await fs.writeFile(path.join(root, 'Website', 'index.json'), serialized);

async function getJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Toys0125-BasisVPM' } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Toys0125-BasisVPM', Accept: 'application/octet-stream' } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

function validateManifest(manifest, packageName, version) {
  for (const field of ['name', 'displayName', 'version', 'description', 'url', 'author']) {
    if (!manifest[field]) throw new Error(`Package manifest is missing ${field}`);
  }
  if (manifest.name !== packageName) throw new Error(`Expected ${packageName}, got ${manifest.name}`);
  if (manifest.version !== version) throw new Error(`Release ${version} contains manifest version ${manifest.version}`);
  if (!manifest.author.name || !manifest.author.email) throw new Error('Package author.name and author.email are required');
  if (Object.keys(manifest.dependencies ?? {}).some((name) => name.startsWith('com.vrchat.'))) {
    throw new Error('Basis package must not depend on VRChat SDK packages');
  }
}

function compareSemver(left, right) {
  const a = semverPattern.exec(left);
  const b = semverPattern.exec(right);
  for (const index of [1, 2, 3]) {
    const difference = Number(b[index]) - Number(a[index]);
    if (difference) return difference;
  }
  if (!a[4] && b[4]) return -1;
  if (a[4] && !b[4]) return 1;
  return (a[4] ?? '').localeCompare(b[4] ?? '');
}
