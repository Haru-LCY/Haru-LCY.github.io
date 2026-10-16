(() => {
  const room = document.querySelector('main');
  if (!room || document.querySelector('[data-essay-water]')) return;
  room.setAttribute('data-essay-water', '');
  room.setAttribute('data-guanlan-ripple', '');
  const surface = document.createElement('div');
  surface.className = 'gallery-essay__water';
  surface.setAttribute('data-essay-water-surface', '');
  surface.setAttribute('aria-hidden', 'true');
  room.append(surface);
})();
