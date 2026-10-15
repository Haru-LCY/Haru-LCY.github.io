(() => {
  // Keep previously shared links to individual works working after the split.
  const links = document.querySelectorAll('.volume-entry[data-legacy-anchor]');
  if (!links.length) return;
  function followLegacyAnchor() {
    const anchor = window.location.hash.slice(1);
    const link = Array.from(links).find((entry) => entry.dataset.legacyAnchor === anchor);
    if (link) window.location.replace(link.href);
  }
  followLegacyAnchor();
  window.addEventListener('hashchange', followLegacyAnchor);
})();
