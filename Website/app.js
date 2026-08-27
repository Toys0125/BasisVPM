const registryUrl = 'https://vpm.toysland.pw/index.json';

const addToVcc = document.getElementById('add-to-vcc');
const copyUrl = document.getElementById('copy-url');

addToVcc?.addEventListener('click', () => {
  window.location.assign(`vcc://vpm/addRepo?url=${encodeURIComponent(registryUrl)}`);
});

copyUrl?.addEventListener('click', async (event) => {
  try {
    await navigator.clipboard.writeText(registryUrl);
    event.currentTarget.textContent = 'Copied';
    setTimeout(() => { event.currentTarget.textContent = 'Copy URL'; }, 1400);
  } catch {
    event.currentTarget.textContent = 'Select URL above';
  }
});

function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (b[i] || 0) - (a[i] || 0);
  }
  return 0;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function packageCard(packageId, packageInfo) {
  const versions = Object.keys(packageInfo.versions || {}).sort(compareVersions);
  const latestVersion = versions[0];
  const latest = packageInfo.versions[latestVersion] || {};
  const unity = latest.unity ? `Unity ${latest.unity}` : 'VPM package';
  const releaseUrl = latest.url || '#';
  return `
    <article class="package-card">
      <div class="package-card-header">
        <span class="package-icon" aria-hidden="true">V</span>
        <span class="version-pill">v${escapeHtml(latestVersion || 'unknown')}</span>
      </div>
      <h3>${escapeHtml(latest.displayName || packageId)}</h3>
      <p class="package-id">${escapeHtml(packageId)}</p>
      <p class="package-description">${escapeHtml(latest.description || 'Community package for BasisVR projects.')}</p>
      <div class="package-meta"><span>${escapeHtml(unity)}</span><a href="${escapeHtml(releaseUrl)}">Release archive <span aria-hidden="true">-></span></a></div>
    </article>`;
}

fetch('index.json')
  .then((response) => {
    if (!response.ok) throw new Error(`Registry returned ${response.status}`);
    return response.json();
  })
  .then((index) => {
    const packages = index.packages || {};
    const packageIds = Object.keys(packages);
    const versionCount = packageIds.reduce((total, packageId) => total + Object.keys(packages[packageId].versions || {}).length, 0);
    document.getElementById('package-count').textContent = packageIds.length;
    document.getElementById('version-count').textContent = versionCount;
    document.getElementById('package-grid').innerHTML = packageIds.length
      ? packageIds.map((packageId) => packageCard(packageId, packages[packageId])).join('')
      : '<p class="loading">No packages published yet.</p>';
  })
  .catch(() => {
    document.getElementById('package-count').textContent = '0';
    document.getElementById('version-count').textContent = '0';
    document.getElementById('package-grid').innerHTML = '<p class="loading">Packages are temporarily unavailable. Try opening <a href="index.json">index.json</a>.</p>';
  });
