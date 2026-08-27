const registryUrl = 'https://basisvpm.pages.dev/index.json';

document.getElementById('add-to-vcc').addEventListener('click', () => {
  window.location.assign(`vcc://vpm/addRepo?url=${encodeURIComponent(registryUrl)}`);
});

document.getElementById('copy-url').addEventListener('click', async (event) => {
  await navigator.clipboard.writeText(registryUrl);
  event.currentTarget.textContent = 'Copied';
  setTimeout(() => { event.currentTarget.textContent = 'Copy registry URL'; }, 1400);
});

fetch('index.json')
  .then((response) => response.json())
  .then((index) => {
    const packageName = Object.keys(index.packages)[0];
    const versions = Object.keys(index.packages[packageName].versions);
    document.getElementById('package-name').textContent = packageName;
    document.getElementById('latest-version').textContent = versions[0] ?? 'Unavailable';
  })
  .catch(() => { document.getElementById('latest-version').textContent = 'Unavailable'; });
