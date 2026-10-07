(() => {
  const posts = Array.isArray(window.GUANLAN_POSTS) ? window.GUANLAN_POSTS : [];
  const shore = document.querySelector('#shore');
  const canvas = document.querySelector('#tide-canvas');
  const context = canvas.getContext('2d');
  const objectLayer = document.querySelector('#object-layer');
  const archiveList = document.querySelector('#archive-list');
  const filterRow = document.querySelector('#filter-row');
  const quote = document.querySelector('#wet-quote');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const heroPositions = [
    [12, 32], [25, 57], [39, 27], [52, 48], [67, 25], [80, 45],
    [90, 27], [18, 76], [34, 78], [57, 72], [73, 76], [86, 66]
  ];
  const tidalPosts = posts.filter((post) => (post.tags || []).includes('心湖观澜'));
  const heroPosts = [...tidalPosts, ...posts.filter((post) => !tidalPosts.includes(post))].slice(0, heroPositions.length);
  let activeFilter = '全部';
  let hoveredPost = null;
  let selectedQuoteIndex = 0;
  let quoteTimer;
  let transitionTimer;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let startTime = performance.now();
  let transitionProgress = 0;

  const postCount = document.querySelector('#post-count');
  if (postCount) postCount.textContent = `${posts.length} 篇文字`;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function renderHero() {
    objectLayer.innerHTML = heroPosts.map((post, index) => {
      const [x, y] = heroPositions[index];
      const rotation = `${(index % 2 ? -1 : 1) * (4 + (index * 7) % 9)}deg`;
      return `<a class="found-object" href="${escapeHtml(post.url)}" data-post-id="${escapeHtml(post.id)}" style="left:${x}%;top:${y}%;--rotation:${rotation}" aria-label="阅读：${escapeHtml(post.title)}">
        <span class="found-object__shape found-object__shape--${escapeHtml(post.type)}" aria-hidden="true"></span>
        <span class="found-object__label"><strong>${escapeHtml(post.title)}</strong><small>${escapeHtml(post.date)} · ${escapeHtml(post.tags[0] || '文字')}</small><em>${escapeHtml(post.excerpt)}</em></span>
      </a>`;
    }).join('');

    objectLayer.querySelectorAll('.found-object').forEach((element) => {
      const post = posts.find((item) => item.id === element.dataset.postId);
      element.addEventListener('mouseenter', () => setHoveredPost(post));
      element.addEventListener('focus', () => setHoveredPost(post));
      element.addEventListener('mouseleave', () => setHoveredPost(null));
      element.addEventListener('blur', () => setHoveredPost(null));
      element.addEventListener('click', (event) => beginTransition(event, post));
    });
  }

  function setHoveredPost(post) {
    hoveredPost = post;
    if (post) {
      shore.dataset.hoveredPost = post.id;
      scheduleQuote(post);
    } else {
      delete shore.dataset.hoveredPost;
    }
  }

  function beginTransition(event, post) {
    if (reduceMotion || !post) return;
    event.preventDefault();
    document.querySelector('.guanlan-shell').classList.add('is-covering');
    transitionProgress = 0;
    const started = performance.now();
    const animateCover = (now) => {
      transitionProgress = Math.min(1, (now - started) / 1050);
      if (transitionProgress < 1) requestAnimationFrame(animateCover);
    };
    requestAnimationFrame(animateCover);
    transitionTimer = window.setTimeout(() => { window.location.href = post.url; }, 1080);
  }

  function makeFilters() {
    const tags = [...new Set(posts.flatMap((post) => post.tags || []))];
    const filters = ['全部', ...tags];
    filterRow.innerHTML = filters.map((tag) => `<button class="filter-button${tag === activeFilter ? ' is-active' : ''}" type="button" data-filter="${escapeHtml(tag)}">${escapeHtml(tag)}${tag === '全部' ? ` · ${posts.length}` : ''}</button>`).join('');
    filterRow.querySelectorAll('.filter-button').forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        makeFilters();
        renderArchive();
      });
    });
  }

  function renderArchive() {
    const visible = activeFilter === '全部' ? posts : posts.filter((post) => (post.tags || []).includes(activeFilter));
    archiveList.innerHTML = visible.map((post) => `<a class="archive-row" href="${escapeHtml(post.url)}" data-post-id="${escapeHtml(post.id)}">
      <time class="archive-meta" datetime="${escapeHtml(post.isoDate || post.date)}">${escapeHtml(post.date)}</time>
      <div><h3 class="archive-title">${escapeHtml(post.title)}</h3><div class="archive-tags">${(post.tags || []).slice(0, 3).map((tag) => `<span class="archive-tag">#${escapeHtml(tag)}</span>`).join('')}</div></div>
      <p class="archive-excerpt">${escapeHtml(post.excerpt)}</p>
      <span class="archive-arrow" aria-hidden="true">→</span>
    </a>`).join('');
  }

  function scheduleQuote(preferredPost) {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(() => showQuote(preferredPost), 620);
  }

  function showQuote(preferredPost) {
    const quotePosts = tidalPosts.length ? tidalPosts : posts;
    const post = preferredPost || quotePosts[selectedQuoteIndex % quotePosts.length];
    if (!post) return;
    if (!preferredPost) selectedQuoteIndex += 1;
    quote.textContent = post.selectedQuote;
    quote.classList.remove('is-visible');
    requestAnimationFrame(() => quote.classList.add('is-visible'));
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(() => quote.classList.remove('is-visible'), 5600);
  }

  function sizeCanvas() {
    const rect = shore.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const particles = Array.from({ length: 510 }, (_, index) => ({
    x: Math.random(),
    y: Math.random() * .48 + .56,
    size: 8 + Math.random() * 9,
    alpha: .16 + Math.random() * .35,
    phase: Math.random() * Math.PI * 2,
    speed: .35 + Math.random() * .65,
    char: index % 10 < 6 ? '瀾' : index % 10 < 9 ? '觀' : ['·', '、', '。', '~'][index % 4]
  }));

  function noise(x, y) {
    return (Math.sin(x * 1.7 + y * 2.4) + Math.sin(x * 3.1 - y * 1.3) + Math.sin(x * .7 + y * 5.2)) / 3;
  }

  function shorelineAt(x, time) {
    const breathing = Math.sin(time * .00042) * 14 + Math.sin(time * .00019 + x * .009) * 8;
    const organic = noise(x * .012, time * .00012) * 10;
    return height * .71 + breathing + organic - transitionProgress * height * .9;
  }

  function drawTide(now) {
    const time = now - startTime;
    context.clearRect(0, 0, width, height);
    const tideTint = context.createLinearGradient(0, height * .57, 0, height);
    tideTint.addColorStop(0, 'rgba(111,143,166,.05)');
    tideTint.addColorStop(.18, 'rgba(111,143,166,.12)');
    tideTint.addColorStop(1, 'rgba(67,102,125,.3)');
    context.fillStyle = tideTint;
    context.fillRect(0, 0, width, height);

    particles.forEach((particle) => {
      const x = particle.x * width;
      const tide = Math.sin(time * .00038 + particle.phase) * 15;
      const y = particle.y * height + tide + Math.sin(time * .00027 * particle.speed + particle.phase) * 4;
      const shoreY = shorelineAt(x, time);
      if (y < shoreY - 10) return;
      const distance = Math.max(0, y - shoreY);
      const edge = Math.max(.12, Math.min(1, distance / 150));
      const alpha = particle.alpha * edge * (transitionProgress ? .55 + transitionProgress * .7 : 1);
      const size = particle.size * (.76 + edge * .32);
      let char = particle.char;
      if (hoveredPost && hoveredPost.keywords?.length && particle.x > .5 && particle.x < .72 && particle.phase % 1 < .35) {
        char = hoveredPost.keywords[Math.floor((time / 180 + particle.phase * 4) % hoveredPost.keywords.length)];
      }
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = distance < 22 ? 'rgba(241,244,241,.68)' : 'rgba(69,103,123,.85)';
      context.font = `${size}px ${getComputedStyle(document.body).fontFamily}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(char, x, y);
      context.restore();
    });

    context.save();
    context.globalAlpha = .18;
    context.strokeStyle = 'rgba(245,248,246,.9)';
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= width; x += 7) {
      const y = shorelineAt(x, time) - 3 + Math.sin(x * .025 + time * .001) * 2;
      if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
    context.restore();
    requestAnimationFrame(drawTide);
  }

  renderHero();
  makeFilters();
  renderArchive();
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas, { passive: true });
  window.setTimeout(() => showQuote(), reduceMotion ? 50 : 1400);
  window.setInterval(() => { if (!hoveredPost && !document.hidden) showQuote(); }, reduceMotion ? 9000 : 9800);
  requestAnimationFrame(drawTide);
  window.addEventListener('pagehide', () => window.clearTimeout(transitionTimer));
})();
