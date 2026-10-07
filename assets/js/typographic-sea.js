/* Thousands of fine glyphs roll as one sea, with tides travelling bottom to top. */
(() => {
  "use strict";

  const surface = document.querySelector("[data-typographic-sea]");
  if (!surface) return;

  const section = surface.closest("section");
  const painting = document.querySelector(".painting-gallery__image--root img");
  const banner = document.querySelector(".page__footer");
  let tideBounds = null;
  let paintingSides = null;
  if (painting) {
    let overlap = 0;
    const alignSea = () => {
      const image = painting.getBoundingClientRect();
      if (!image.height) return;
      const mobile = window.innerWidth <= 768;
      // Move the artwork independently, keeping the sea at its original level.
      const paintingShift = parseFloat(getComputedStyle(painting)
        .getPropertyValue("--painting-root-shift")) || 0;
      // The entire canvas starts only a little above the painting. Even spray
      // cannot climb farther than this; only the waterline moves with the tide.
      const inset = mobile ? 16 : 24;
      const top = image.top - paintingShift - inset;
      const height = Math.ceil(Math.max(mobile ? 420 : 650,
        image.height + inset + (mobile ? 140 : 200)));
      const next = Math.max(0, Math.round(section.getBoundingClientRect().top
        - top));
      overlap = next;
      section.style.setProperty("--sea-overlap", `${overlap}px`);
      section.style.setProperty("--sea-height", `${height}px`);
      const sea = surface.getBoundingClientRect();
      if (sea.width) paintingSides = {
        left: (image.left - sea.left) / sea.width,
        right: (image.right - sea.left) / sea.width,
      };
      tideBounds = { high: inset * 0.35, low: Math.min(height - 95, image.height + inset + 28) };
      // Desktop's fixed banner covers the bottom current. On mobile, cancel
      // its existing outer gap without changing the banner's own appearance.
      const footerStyle = banner && getComputedStyle(banner);
      const gap = footerStyle && footerStyle.position !== "fixed"
        ? parseFloat(footerStyle.marginTop) || 0 : 0;
      section.style.setProperty("--sea-banner-gap", `${gap}px`);
      document.body.style.setProperty("--sea-banner-height", footerStyle && footerStyle.position === "fixed"
        ? `${Math.ceil(banner.getBoundingClientRect().height)}px` : "0px");
    };
    alignSea();
    const layout = new ResizeObserver(alignSea);
    layout.observe(painting);
    const gallery = painting.closest("#main");
    if (gallery) layout.observe(gallery);
    if (banner) layout.observe(banner);
    window.addEventListener("resize", alignSea);
    painting.addEventListener("load", alignSea, { once: true });
  }

  const pause = section.querySelector("button");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Reduced motion keeps a gentle current instead of silently freezing the sea.
  let reducedMotion = motion.matches;
  let paused = false;
  let visible = surface.getBoundingClientRect().bottom > 0
    && surface.getBoundingClientRect().top < window.innerHeight;
  let ready = false;
  let instance;
  let loading = false;
  let resetPointer = () => {};

  const updateLoop = () => {
    if (!instance || !ready) return;
    if (visible && !document.hidden && !paused) instance.loop();
    else instance.noLoop();
  };

  const updateButton = () => {
    pause.textContent = paused ? "繼續" : "暫停";
    pause.setAttribute("aria-pressed", String(paused));
    pause.setAttribute("aria-label", paused ? "繼續文字海動畫" : "暫停文字海動畫");
  };

  const sketch = (p) => {
    const vocabulary = Array.from("花水胎夢孳情欲生死見形虛留");
    // Leave the removed 生/死 slot empty so the other pairs keep their places.
    const wordPairs = [["花", "水"], null, ["欲", "情"],
      ["形", "虛"], ["見", "夢"], ["孳", "胎"]];
    const sizes = [5, 6, 7, 8, 11, 14, 17];
    const emphasisSizes = [14, 17];
    const shades = 10;
    const cell = 26;
    // Use the browser's installed CJK serif fallback. A pending web font can
    // paint invisible glyphs into this cached atlas and leave the whole sea blank.
    // p5 1.x also quotes names containing spaces, so pass one generic family.
    const font = "serif";
    let glyphs = [];
    let atlas;
    let atlasScale = 1;
    let wakes = [];
    let time = 0;
    let pointer = null;
    let density = 1;
    let tide = null;

    const wrap = (n) => ((n % 1) + 1) % 1;
    const smooth = (a, b, n) => {
      const v = Math.max(0, Math.min(1, (n - a) / (b - a)));
      return v * v * (3 - 2 * v);
    };

    const noiseField = new Float32Array(81);
    const foamField = new Float32Array(81);
    const updateNoise = () => {
      for (let i = 0; i < noiseField.length; i += 1) {
        noiseField[i] = (p.noise(i * 0.065, time * 0.24) - 0.5) * 2;
        foamField[i] = p.noise(i * 0.23, time * 0.18, 4.7);
      }
    };
    const waterNoise = (u) => {
      const sample = u * 80;
      const index = Math.min(79, Math.floor(sample));
      return noiseField[index] + (noiseField[index + 1] - noiseField[index]) * (sample - index);
    };
    const foamNoise = (u) => {
      const sample = u * 80;
      const index = Math.min(79, Math.floor(sample));
      return foamField[index] + (foamField[index + 1] - foamField[index]) * (sample - index);
    };

    const makeGlyphs = () => {
      p.randomSeed(31415);
      p.noiseSeed(2718);
      const columns = Math.max(48, Math.ceil(p.width / 7));
      const rows = Math.max(58, Math.ceil(p.height / 6));
      const count = Math.min(20000, columns * rows);
      const actualRows = Math.ceil(count / columns);
      glyphs = [];
      for (let i = 0; i < count; i += 1) {
        glyphs.push({
          u: ((i % columns) + p.random(0.08, 0.92)) / columns,
          v: (Math.floor(i / columns) + p.random(0.08, 0.92)) / actualRows,
          char: Math.floor(p.random(vocabulary.length - 1)),
          retention: p.random(), large: p.random() < 0.025,
          spray: false, tone: p.random(0.72, 1),
          offsetX: 0, offsetY: 0, vx: 0, vy: 0,
        });
      }
      // Spray occupies the empty space above the breaking water, not a hard rim.
      const sprayCount = Math.round(p.width * p.height / 8000);
      for (let i = 0; i < sprayCount; i += 1) {
        glyphs.push({
          u: p.random(), v: p.random(), char: Math.floor(p.random(vocabulary.length)),
          retention: p.random(), large: false, spray: true,
          tone: p.random(0.4, 0.85), seed: p.random(p.TWO_PI),
          offsetX: 0, offsetY: 0, vx: 0, vy: 0,
        });
      }
      // Paired words share a tidal depth, with small independent offsets and
      // mirrored side positions. Their own local currents keep them floating.
      wordPairs.forEach((words, pair) => {
        if (!words) {
          // Preserve the seeded offsets of all the pairs below the empty slot.
          p.random(-0.006, 0.006);
          p.random(-0.006, 0.006);
          return;
        }
        const depth = 0.12 + pair * 0.09;
        const across = 0.18 + wrap(pair * 0.618034 + 0.18) * 0.64;
        words.forEach((word, side) => {
          const sidePosition = side === 0 ? across : 1 - across;
          glyphs.push({
            u: sidePosition, v: depth + p.random(-0.006, 0.006),
            char: vocabulary.indexOf(word), pair, retention: 1,
            large: true, emphasis: true, spray: false, side, sidePosition,
            tone: 1, offsetX: 0, offsetY: 0, vx: 0, vy: 0,
          });
        });
      });
      updateNoise();
    };

    // Cache p5-rendered Chinese glyphs so a dense sea doesn't typeset thousands
    // of characters again on every frame. All wave geometry still lives in p5.
    const makeAtlas = () => {
      if (atlas) atlas.remove();
      atlas = p.createGraphics(cell * vocabulary.length,
        cell * (sizes.length + emphasisSizes.length) * shades);
      atlas.pixelDensity(density);
      atlas.clear();
      atlas.textFont(font);
      atlas.textAlign(p.CENTER, p.CENTER);
      atlas.noStroke();
      sizes.forEach((size, sizeIndex) => {
        atlas.textSize(size);
        for (let shade = 0; shade < shades; shade += 1) {
          atlas.fill(255, 255 * (shade + 1) / shades);
          const y = (sizeIndex * shades + shade + 0.5) * cell;
          vocabulary.forEach((char, index) => atlas.text(char, (index + 0.5) * cell, y));
        }
      });
      atlas.textStyle(p.BOLD);
      emphasisSizes.forEach((size, sizeIndex) => {
        atlas.textSize(size);
        for (let shade = 0; shade < shades; shade += 1) {
          atlas.fill(255, 255 * (shade + 1) / shades);
          const y = ((sizes.length + sizeIndex) * shades + shade + 0.5) * cell;
          vocabulary.forEach((char, index) => atlas.text(char, (index + 0.5) * cell, y));
        }
      });
      atlasScale = atlas.pixelDensity();
    };

    // A 24-second flood/ebb moves the whole shoreline across the painting.
    // Surface ripples ride on it; the slow bottom current stays at the banner.
    const updateTide = () => {
      const phase = time * p.TWO_PI / 24;
      const level = (1 - Math.cos(phase)) * 0.5;
      const high = tideBounds ? tideBounds.high : 12;
      const low = tideBounds ? tideBounds.low : p.height * 0.8;
      tide = { level, direction: Math.sin(phase), shore: low + (high - low) * level };
    };

    const shoreline = (u) => {
      // Keep high-tide ripples small enough that the upper limit is only a
      // few pixels above the painting. More lively surf appears lower down.
      const roughness = 3 + (1 - tide.level) * 12;
      return tide.shore + (Math.sin(u * 9 + time * 0.65) * 0.6
        + Math.sin(u * 23 - time * 0.42) * 0.25
        + waterNoise(u) * 0.8) * roughness;
    };

    const emphasisRange = (g) => {
      const image = paintingSides || { left: 0.35, right: 0.65 };
      // Include the whole glyph and a quiet gap alongside the painting.
      const margin = cell / 2 + 12;
      const left = { min: 16, max: image.left * p.width - margin };
      const right = { min: image.right * p.width + margin, max: p.width - 16 };
      const preferred = g.side === 0 ? left : right;
      const other = g.side === 0 ? right : left;
      if (preferred.max >= preferred.min) return preferred;
      if (other.max >= other.min) return other;
      // Narrow screens may have no space beside the image. Preserve the
      // painting rather than drawing a large word over it in that layout.
      return null;
    };

    const renderPosition = (g, point) => {
      let x = point.x + g.offsetX;
      if (g.emphasis) {
        const range = emphasisRange(g);
        if (!range) return null;
        // Apply the constraint after mouse forces as well as tidal motion.
        x = Math.max(range.min, Math.min(range.max, x));
      }
      return { x, y: point.y + g.offsetY };
    };

    const waterPosition = (g) => {
      const range = g.emphasis ? emphasisRange(g) : null;
      if (g.emphasis && !range) {
        return { x: 0, y: 0, depth: 0, brightness: 0, foam: 0, char: g.char, large: true };
      }
      const u = range ? (range.min + (range.max - range.min) * g.sidePosition) / p.width : g.u;
      const h = p.height;
      const shore = shoreline(u);
      const waterHeight = h - shore;
      if (g.spray) {
        const travel = wrap(g.v - time * 0.12);
        const x = u * p.width + Math.sin(time * 0.8 + g.seed) * 18;
        // Scatter across a broad edge instead of accumulating at a narrow
        // sine-curve apex, which reads as a continuous bright pencil line.
        const spread = 18 + (1 - tide.level) * 65;
        const y = shore + (travel - 0.65) * spread
          + Math.sin(u * 10 + time * 1.3 + g.seed) * 4;
        const brightness = g.tone * 0.3 * Math.sin(travel * Math.PI) ** 2
          * smooth(0.2, 0.7, foamNoise(u));
        return { x, y, depth: 0, brightness, foam: 0, char: g.char, large: false };
      }

      // Redistribute the existing particles toward the bottom instead of
      // adding heavier draw work. The 留-rich root is denser and more viscous.
      const depth = 1 - Math.pow(1 - g.v, 1.45);
      const breaking = Math.exp(-(((depth - 0.14) / 0.13) ** 2));
      const deep = smooth(0.76, 0.9, depth);
      const noise = waterNoise(u);
      const bow = Math.sin(u * 6.2 + time * 0.31) * 1.8 + noise * 0.75;
      const phase = depth * 12 + Math.sin(time * p.TWO_PI / 24) * 3
        + time * 0.55 + bow + u * 3.2;
      const swell = Math.sin(phase);
      const curl = Math.cos(phase);
      const crossWave = Math.sin(u * 13 - depth * 7 + time * 0.92);
      const deepPhase = u * 8 + depth * 4 + time * 0.3;
      const motionScale = reducedMotion ? 0.55 : 1;
      const boundary = smooth(0, 0.08, depth) * (1 - smooth(0.9, 1, depth));
      // Keep the mapping gently stretched: strong folds made whole rows of
      // glyphs coincide and formed an unnaturally dense, thin upper stripe.
      const amplitude = waterHeight * (0.009 + breaking * 0.012)
        * boundary * (1 - deep) * motionScale;
      const x = (g.emphasis ? u : u * 1.08 - 0.04) * p.width
        + (curl * (10 + breaking * 31) + crossWave * breaking * 12) * (1 - deep)
        + Math.sin(deepPhase) * 6 * deep;
      const y = shore + depth * waterHeight + swell * amplitude
        + crossWave * breaking * waterHeight * 0.009 * boundary * motionScale
        + noise * breaking * waterHeight * 0.01 * boundary
        + Math.sin(deepPhase) * 3 * deep * boundary;
      // Broad, broken foam patches carry across the surf and dissolve on ebb.
      // Their widths vary with x, so the edge never becomes one solid ribbon.
      const patch = smooth(0.22, 0.72, foamNoise(u)
        + Math.sin(depth * 23 + u * 17 - time * 0.7) * 0.16);
      const foam = Math.pow((1 - curl) * 0.5, 1.5) * patch
        * (0.25 + breaking * 0.75) * (1 - deep);
      const emergence = smooth(0, 0.1 + waterNoise(u) * 0.025, depth);
      const edgeFade = smooth(-12, 16, x) * (1 - smooth(p.width - 16, p.width + 12, x));
      const brightness = emergence * edgeFade * g.tone
        * (g.emphasis ? 0.7 + foam * 0.15 : 0.16 + depth * 0.17 + deep * 0.14 + foam * 0.3);
      const retention = 0.38 + smooth(0.68, 0.91, depth) * 0.56;
      const char = g.emphasis ? g.char : g.retention < retention ? vocabulary.length - 1 : g.char;
      return { x, y, depth, brightness, foam, char,
        large: g.emphasis || (char === vocabulary.length - 1 && g.large) };
    };

    const disturb = (g, point, step) => {
      for (const wake of wakes) {
        const dx = point.x + g.offsetX - wake.x;
        const dy = point.y + g.offsetY - wake.y;
        const distance = Math.hypot(dx, dy);
        const radius = p.width < 500 ? 85 : 125;
        if (distance >= radius || distance < 0.5) continue;
        const strength = (1 - distance / radius) ** 2 * wake.life
          * wake.speed * (0.2 + point.depth * 0.8) * (point.large ? 0.55 : 1);
        g.vx += (dx / distance * 0.07 - dy / distance * 0.025 * wake.spin) * strength * step;
        g.vy += (dy / distance * 0.07 + dx / distance * 0.025 * wake.spin) * strength * step;
      }
      // Local strokes bend the sea temporarily; the underlying tide keeps going.
      g.vx = (g.vx - g.offsetX * 0.008 * step) * Math.pow(0.9, step);
      g.vy = (g.vy - g.offsetY * 0.008 * step) * Math.pow(0.9, step);
      g.offsetX += g.vx * step;
      g.offsetY += g.vy * step;
    };

    const clearPointer = () => { pointer = null; wakes = []; };
    resetPointer = clearPointer;
    const onPointerMove = (event) => {
      if (paused || !visible || document.hidden || !event.isPrimary) return;
      const rect = surface.getBoundingClientRect();
      const x = (event.clientX - rect.left) * p.width / rect.width;
      const y = (event.clientY - rect.top) * p.height / rect.height;
      if (x < 0 || x > p.width || y < 0 || y > p.height) { clearPointer(); return; }
      if (pointer) {
        const elapsed = Math.max(8, event.timeStamp - pointer.time);
        const distance = Math.hypot(x - pointer.x, y - pointer.y);
        const speed = Math.min(30, distance / elapsed * (1000 / 60));
        if (speed > 0.3 && elapsed < 160) {
          const count = Math.min(5, Math.max(1, Math.ceil(distance / 35)));
          for (let i = 1; i <= count; i += 1) {
            wakes.push({
              x: pointer.x + (x - pointer.x) * i / count,
              y: pointer.y + (y - pointer.y) * i / count,
              speed: speed / Math.sqrt(count), life: 1,
              spin: x >= pointer.x ? 1 : -1,
            });
          }
          wakes = wakes.slice(-12);
        }
      }
      pointer = { x, y, time: event.timeStamp };
    };

    p.setup = () => {
      density = Math.min(window.devicePixelRatio || 1, 2);
      p.pixelDensity(density);
      const canvas = p.createCanvas(Math.round(surface.clientWidth), Math.round(surface.clientHeight));
      canvas.parent(surface);
      canvas.elt.setAttribute("role", "img");
      canvas.elt.setAttribute("aria-label", "密集細小的漢字構成潮汐，從底部湧起，漲潮越過留下來畫作的頂部，退潮露出畫作。移動鼠標或手指可撥動水流。");
      p.frameRate(reducedMotion ? 20 : 30);
      makeGlyphs();
      makeAtlas();
      ready = true;
      // p5 setup may run before the constructor has returned its instance.
      queueMicrotask(updateLoop);
      pause.hidden = false;
      updateButton();
      surface.addEventListener("pointermove", onPointerMove);
      surface.addEventListener("pointerleave", clearPointer);
      surface.addEventListener("pointercancel", clearPointer);
      surface.addEventListener("pointerup", clearPointer);
      pause.addEventListener("click", clearPointer);
      document.addEventListener("visibilitychange", clearPointer);

      new ResizeObserver(() => {
        const width = Math.round(surface.clientWidth);
        const height = Math.round(surface.clientHeight);
        if (!width || !height || (p.width === width && p.height === height)) return;
        p.resizeCanvas(width, height, true);
        // Re-sample at the same small spacing on phones and wide desktop screens.
        makeGlyphs();
        wakes = [];
        clearPointer();
        if (paused || !visible) p.redraw();
      }).observe(surface);
    };

    p.draw = () => {
      const running = visible && !document.hidden && !paused;
      const step = Math.min(p.deltaTime || 33.33, 50) / (1000 / 60);
      if (running) {
        time += Math.min(p.deltaTime || 33.33, 100) / 1000 * (reducedMotion ? 0.4 : 1);
        wakes.forEach((wake) => { wake.life *= Math.pow(0.88, step); });
        wakes = wakes.filter((wake) => wake.life > 0.025);
      }
      updateNoise();
      updateTide();
      // Clear to transparent on every frame so the painting and page show
      // through the spaces between glyphs without leaving particle trails.
      p.clear();
      const context = p.drawingContext;
      const bitmap = atlas.canvas;
      const sourceCell = cell * atlasScale;
      for (const g of glyphs) {
        const point = waterPosition(g);
        if (running && (wakes.length || Math.abs(g.offsetX) + Math.abs(g.offsetY) > 0.01)) {
          disturb(g, point, step);
        }
        if (point.brightness < 0.055) continue;
        const position = renderPosition(g, point);
        if (!position) continue;
        const sizeIndex = g.emphasis ? sizes.length + (point.depth > 0.55 ? 1 : 0)
          : point.large ? 4 + Math.min(2, Math.floor(point.depth * 3))
          : Math.min(3, Math.floor(point.depth * 3.3));
        const shade = Math.min(shades - 1, Math.max(0, Math.round(point.brightness * shades) - 1));
        context.drawImage(bitmap,
          point.char * sourceCell, (sizeIndex * shades + shade) * sourceCell,
          sourceCell, sourceCell,
          position.x - cell / 2, position.y - cell / 2, cell, cell);
      }
      if (!running) p.noLoop();
    };
  };

  const start = () => {
    if (loading) return;
    loading = true;
    if (typeof window.p5 !== "function") {
      console.error("The local p5.js library did not load.");
      return;
    }
    instance = new window.p5(sketch, surface);
    // p5 1.11 waits for window.load, including unrelated remote images/scripts.
    // This deferred script already has its mount and needs no external assets.
    // Start the pinned runtime now and remove its listener to prevent two setups.
    if (!ready && instance._startListener) {
      window.removeEventListener("load", instance._startListener);
      instance._startListener = null;
      instance._start();
    }
    updateLoop();
  };

  pause.addEventListener("click", () => {
    paused = !paused;
    updateButton();
    updateLoop();
  });
  motion.addEventListener("change", () => {
    reducedMotion = motion.matches;
    if (instance) instance.frameRate(reducedMotion ? 20 : 30);
    updateLoop();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetPointer();
    updateLoop();
  });

  // Defer scripts load p5 in order. Visibility controls only the draw loop,
  // so approaching the sea can never leave its library or setup uninitialised.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) resetPointer();
    updateLoop();
  }).observe(surface);
  start();
})();
