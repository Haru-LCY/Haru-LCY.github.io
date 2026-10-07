/* A damped height field refracts the original, selectable text of 水底. */
(() => {
  "use strict";
  const room = document.querySelector("[data-essay-water]");
  const surface = room?.querySelector("[data-essay-water-surface]");
  if (!surface || !window.p5) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return;
  // This page is one water surface, including its empty margins. Both banners
  // remain outside the simulation, and native links stay clickable.
  document.body.append(surface);
  const banner = document.querySelector(".page__footer");
  const masthead = document.querySelector(".masthead");

  const glyphs = [];
  const opening = /^[（「『《〈【“‘(\[]$/u;
  const closing = /^[，。！？；：、）》〉】」』”’…,.!?;:)\]]$/u;
  const latin = /^[\p{Script=Latin}\p{N}\p{M}_\-]$/u;
  // Keep Latin words and Chinese punctuation together at line breaks.
  const tokensFor = (text) => {
    const tokens = [];
    let prefix = "";
    for (const char of Array.from(text)) {
      if (opening.test(char)) { prefix += char; continue; }
      const last = tokens[tokens.length - 1];
      if (!prefix && last && !/\s/u.test(last) &&
          (closing.test(char) || (latin.test(char) && /^[\p{Script=Latin}\p{N}\p{M}_\-]+$/u.test(last)))) {
        tokens[tokens.length - 1] += char;
      } else {
        tokens.push(prefix + char);
        prefix = "";
      }
    }
    if (prefix) tokens.push(prefix);
    return tokens;
  };
  const page = document.body;
  for (const element of page.querySelectorAll("h1, h2, h3, a")) {
    if (element.closest(".page__footer, .masthead")) continue;
    if (!element.hasAttribute("aria-label")) element.setAttribute("aria-label", element.textContent.trim());
  }
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent.trim() && !node.parentElement.closest("script, style, code, pre, button, .page__footer, .masthead, [data-essay-water-surface]")
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const text of tokensFor(node.textContent)) {
      if (/^\s+$/u.test(text)) { fragment.append(document.createTextNode(text)); continue; }
      const element = document.createElement("span");
      element.className = "gallery-essay__water-glyph";
      element.textContent = text;
      fragment.append(element);
      glyphs.push({ element, x: 0, y: 0, fixed: Boolean(element.closest(".masthead")), warp: [0, 0, 0, 0, 0, 0] });
    }
    node.replaceWith(fragment);
  }

  const CELL = 9;
  const RIPPLE_SCALE = 3;
  let cols = 0, rows = 0;
  let current, previous, next;
  let visible = [];
  let viewTop = 0, surfaceTop = 0;
  let dirtyLayout = true, dirtyView = true;
  let pointer = null, press = null;
  let energy = 0, accumulator = 0;
  let sketch;
  const resetText = () => {
    for (const glyph of visible) { glyph.element.style.transform = ""; glyph.warp.fill(0); }
  };
  const resetWater = () => {
    current?.fill(0); previous?.fill(0); next?.fill(0);
    energy = 0; accumulator = 0; pointer = null;
    resetText();
  };
  const invalidateLayout = () => { dirtyLayout = true; dirtyView = true; sketch?.loop(); };
  const invalidateView = () => { dirtyView = true; pointer = null; sketch?.loop(); };

  new window.p5((p) => {
    sketch = p;
    let waterImage;
    const refreshView = () => {
      const scrollDelta = window.scrollY - viewTop;
      const hadWater = Boolean(current);
      const width = Math.max(1, document.documentElement.clientWidth);
      // On mobile the banner scrolls into view; on desktop it is fixed.
      surfaceTop = Math.min(window.innerHeight, Math.max(0, masthead?.getBoundingClientRect().bottom ?? 0));
      const bannerTop = banner?.getBoundingClientRect().top ?? window.innerHeight;
      const height = Math.max(1, Math.ceil(Math.min(window.innerHeight, Math.max(0, bannerTop)) - surfaceTop));
      surface.style.top = `${surfaceTop}px`;
      surface.style.height = `${height}px`;
      if (width !== p.width || height !== p.height) {
        const oldCols = cols, oldRows = rows;
        const oldCurrent = current, oldPrevious = previous;
        p.resizeCanvas(width, height);
        cols = Math.ceil(width / CELL) + 2;
        rows = Math.ceil(height / CELL) + 2;
        current = new Float32Array(cols * rows);
        previous = new Float32Array(cols * rows);
        next = new Float32Array(cols * rows);
        waterImage = p.createImage(cols, rows);
        // Preserve existing waves when the mobile banner changes the visible
        // surface height, rather than clearing the water on every scroll.
        for (let y = 1; y < Math.min(rows, oldRows) - 1; y++) {
          for (let x = 1; x < Math.min(cols, oldCols) - 1; x++) {
            current[y * cols + x] = oldCurrent[y * oldCols + x];
            previous[y * cols + x] = oldPrevious[y * oldCols + x];
          }
        }
      }
      resetText();
      viewTop = window.scrollY;
      if (dirtyLayout) {
        // Measure once after fonts or wrapping change, never during deformation.
        for (const glyph of glyphs) glyph.element.style.transform = "";
        for (const glyph of glyphs) {
          const rect = glyph.element.getBoundingClientRect();
          glyph.x = rect.left + rect.width / 2;
          glyph.y = rect.top + rect.height / 2 + (glyph.fixed ? 0 : viewTop);
        }
        dirtyLayout = false;
      }
      visible = glyphs.filter((glyph) => glyph.y >= viewTop + surfaceTop - 40 && glyph.y <= viewTop + surfaceTop + height + 40);
      if (hadWater && Math.abs(scrollDelta) > 0.25 && !reducedMotion.matches && !document.hidden) {
        // Scrolling passes the text beneath the continuous surface. It also
        // drives a broad, irregular swell instead of cancelling mouse ripples.
        const force = Math.max(-0.45, Math.min(0.45, scrollDelta / 130));
        const phase = performance.now() * 0.0007;
        for (let x = 1; x < cols - 1; x++) {
          const crest = rows * (force > 0 ? 0.64 : 0.36)
            + Math.sin(x * 0.055 + phase) * 5 + Math.sin(x * 0.12 - phase) * 2;
          for (let y = Math.max(1, Math.floor(crest - 6)); y <= Math.min(rows - 2, Math.ceil(crest + 6)); y++) {
            const impulse = force * Math.exp(-((y - crest) ** 2) / 9);
            current[y * cols + x] += impulse;
            previous[y * cols + x] += impulse;
          }
        }
        energy = Math.max(energy, 1);
      }
      dirtyView = false;
    };
    const isInside = (event) => {
      const bannerTop = banner?.getBoundingClientRect().top ?? window.innerHeight;
      const headerBottom = Math.max(0, masthead?.getBoundingClientRect().bottom ?? 0);
      return event.clientX >= 0 && event.clientX <= document.documentElement.clientWidth &&
        event.clientY >= headerBottom && event.clientY < Math.min(window.innerHeight, bannerTop) &&
        !event.target.closest(".page__footer, .masthead");
    };
    const disturb = (event, strength) => {
      if (reducedMotion.matches || document.hidden || !isInside(event)) return;
      if (dirtyView) refreshView();
      const x = event.clientX / CELL + 1;
      const y = (event.clientY - surfaceTop) / CELL + 1;
      const radius = Math.ceil(3 * RIPPLE_SCALE);
      const spread = 2.4 * RIPPLE_SCALE * RIPPLE_SCALE;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const gx = Math.round(x) + dx, gy = Math.round(y) + dy;
          if (gx <= 0 || gy <= 0 || gx >= cols - 1 || gy >= rows - 1) continue;
          const impulse = strength * RIPPLE_SCALE * Math.exp(-(dx * dx + dy * dy) / spread);
          current[gy * cols + gx] += impulse;
          previous[gy * cols + gx] += impulse;
        }
      }
      energy = 1;
      p.loop();
    };
    const move = (event) => {
      if (event.pointerType === "touch" || !isInside(event)) { pointer = null; return; }
      const now = performance.now();
      if (pointer) {
        const trail = pointer;
        const dx = event.clientX - trail.x, dy = event.clientY - trail.y;
        const distance = Math.hypot(dx, dy);
        const elapsed = now - trail.time;
        if (distance > 3 && elapsed >= 28) {
          // A fast stroke lays down several impulses instead of jumping ahead.
          const steps = Math.min(8, Math.max(1, Math.ceil(distance / 16)));
          const force = Math.min(3.3, 0.5 + distance / Math.max(16, elapsed) * 1.2);
          for (let i = 1; i <= steps; i++) {
            disturb({ clientX: trail.x + dx * i / steps, clientY: trail.y + dy * i / steps, target: event.target }, force / Math.sqrt(steps));
          }
          pointer = { x: event.clientX, y: event.clientY, time: now };
        }
      } else pointer = { x: event.clientX, y: event.clientY, time: now };
    };
    const down = (event) => {
      if (event.button !== 0 || !isInside(event)) return;
      press = { x: event.clientX, y: event.clientY };
      if (event.pointerType !== "touch") disturb(event, 7);
    };
    const up = (event) => {
      // A tap ripples; a touch scroll retains its native behavior.
      if (event.pointerType === "touch" && press && Math.hypot(event.clientX - press.x, event.clientY - press.y) < 9) disturb(event, 7);
      press = null;
    };
    const cancel = () => { pointer = null; press = null; };
    const visibility = () => {
      resetWater(); p.clear();
      if (document.hidden) p.noLoop(); else invalidateView();
    };
    const motionPreference = () => {
      resetWater(); p.clear();
      if (reducedMotion.matches) p.noLoop(); else invalidateView();
    };

    p.setup = () => {
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      p.createCanvas(1, 1).parent(surface);
      p.canvas.setAttribute("aria-hidden", "true");
      p.frameRate(60);
      refreshView();
      document.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerdown", down, { passive: true });
      document.addEventListener("pointerup", up, { passive: true });
      document.addEventListener("pointerout", (event) => { if (!event.relatedTarget) cancel(); });
      document.addEventListener("pointercancel", cancel);
      window.addEventListener("scroll", invalidateView, { passive: true });
      window.addEventListener("resize", invalidateLayout, { passive: true });
      window.addEventListener("blur", visibility);
      document.addEventListener("visibilitychange", visibility);
      reducedMotion.addEventListener("change", motionPreference);
      document.fonts?.ready.then(invalidateLayout);
    };
    p.draw = () => {
      if (dirtyView) refreshView();
      p.clear();
      if (reducedMotion.matches || document.hidden || energy < 0.001) {
        resetText(); p.noLoop(); return;
      }
      // Fixed time steps keep wave speed stable across frame rates.
      accumulator = Math.min(accumulator + Math.min(p.deltaTime, 60) / 1000, 0.065);
      while (accumulator >= 1 / 60) {
        energy = 0;
        for (let y = 1; y < rows - 1; y++) {
          for (let x = 1; x < cols - 1; x++) {
            const i = y * cols + x;
            const laplacian = current[i - 1] + current[i + 1] + current[i - cols] + current[i + cols] - 4 * current[i];
            // Dampen velocity, so crests travel outward instead of repeatedly
            // ringing at the source. The edge absorbs waves before reflection.
            const velocity = (current[i] - previous[i]) * 0.965;
            const edgeDistance = Math.min(x, y, cols - 1 - x, rows - 1 - y);
            const edgeAbsorption = edgeDistance < 5 ? 0.9 + edgeDistance * 0.02 : 1;
            next[i] = (current[i] + velocity + 0.44 * laplacian) * edgeAbsorption;
            energy = Math.max(energy, Math.abs(next[i]));
          }
        }
        [previous, current, next] = [current, next, previous];
        accumulator -= 1 / 60;
      }
      waterImage.loadPixels();
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x, rgba = i * 4;
          const slope = (current[i + 1] - current[i - 1]) * 0.65 + (current[i + cols] - current[i - cols]) * 0.8;
          waterImage.pixels[rgba] = 154;
          waterImage.pixels[rgba + 1] = 178;
          waterImage.pixels[rgba + 2] = 185;
          waterImage.pixels[rgba + 3] = Math.min(22, Math.max(0, (Math.abs(slope) - 0.045) * 18));
        }
      }
      waterImage.updatePixels();
      p.image(waterImage, -CELL, -CELL, cols * CELL, rows * CELL);
      // Sample a continuous surface instead of snapping letters to grid cells.
      const sample = (x, y) => {
        x = Math.max(1, Math.min(cols - 2, x));
        y = Math.max(1, Math.min(rows - 2, y));
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const i = iy * cols + ix;
        return (current[i] * (1 - fx) + current[i + 1] * fx) * (1 - fy)
          + (current[i + cols] * (1 - fx) + current[i + cols + 1] * fx) * fy;
      };
      const response = 1 - Math.exp(-Math.min(p.deltaTime, 60) / 20);
      for (const glyph of visible) {
        const x = glyph.x / CELL + 1, y = (glyph.y - viewTop - surfaceTop) / CELL + 1;
        if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) { glyph.element.style.transform = ""; glyph.warp.fill(0); continue; }
        const center = sample(x, y);
        const left = sample(x - 1.4, y), right = sample(x + 1.4, y);
        const above = sample(x, y - 1.4), below = sample(x, y + 1.4);
        const cross = (sample(x + 1.4, y + 1.4) - sample(x - 1.4, y + 1.4)
          - sample(x + 1.4, y - 1.4) + sample(x - 1.4, y - 1.4)) / 4;
        // Refraction changes both position and the shape of each glyph. The
        // shared wave curvature stretches and squeezes adjacent text together.
        const target = [
          Math.tanh((right - left) * 0.38) * 25,
          Math.tanh((below - above) * 0.38) * 27 + Math.tanh(center * 0.12) * 7,
          Math.tanh((right + left - 2 * center) * 1.15) * 0.65,
          Math.tanh((below + above - 2 * center) * 1.15) * 0.58,
          Math.tanh(cross * 1.2) * 0.48,
          Math.tanh((right - left + below - above) * 0.18) * 0.25,
        ];
        for (let j = 0; j < target.length; j++) glyph.warp[j] += (target[j] - glyph.warp[j]) * response;
        const [dx, dy, stretchX, stretchY, shear, bend] = glyph.warp;
        glyph.element.style.transform = Math.abs(dx) + Math.abs(dy) + Math.abs(stretchX) + Math.abs(stretchY) + Math.abs(shear) > 0.04
          ? `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${bend.toFixed(3)}rad) skew(${shear.toFixed(3)}rad, ${(shear * 0.45).toFixed(3)}rad) scale(${(1 + stretchX).toFixed(3)}, ${(1 + stretchY).toFixed(3)})` : "";
      }
    };
  });
})();
