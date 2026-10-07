/* A short, dense typographic name-washing tide for the Gallery entrance. */
(() => {
  "use strict";

  const overlay = document.querySelector("[data-typographic-transition]");
  const host = overlay && overlay.querySelector("[data-typographic-transition-canvas]");
  if (!overlay || !host) return;

  // Gallery essays and other in-gallery links are ordinary page navigations;
  // the entrance wash belongs only to crossing into the gallery from outside.
  const referrer = document.referrer;
  if (overlay.dataset.skipInternal === "true"
    && referrer && referrer.startsWith(window.location.origin + "/gallery/")) {
    overlay.remove();
    return;
  }

  document.body.classList.add("typographic-transition-active");

  const states = [
    { name: "CHUNYU", duration: 700 },
    { name: "WAVE_1_RISE", duration: 1000, wave: 1 },
    { name: "WAVE_1_FALL", duration: 1350, wave: 1 },
    // Kept as a semantic state, but with no perceptible pause: the first ebb
    // hands the revealed name directly to the second incoming wave.
    { name: "JINYU", duration: 1 },
    { name: "WAVE_2_RISE", duration: 1000, wave: 2 },
    { name: "WAVE_2_FALL", duration: 1350, wave: 2 },
    { name: "NOBODY", duration: 1000 },
    { name: "END", duration: 550 },
  ];
  const statusLabels = {
    CHUNYU: "Chunyu Liu",
    WAVE_1_RISE: "",
    WAVE_1_FALL: "",
    JINYU: "瑾瑜當年",
    WAVE_2_RISE: "",
    WAVE_2_FALL: "",
    NOBODY: "nobody",
    END: "",
  };

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = reducedMotionQuery.matches;
  let p5Instance;
  let ready = false;
  let started = false;

  const stateAt = (elapsed) => {
    let cursor = 0;
    for (let index = 0; index < states.length; index += 1) {
      const end = cursor + states[index].duration;
      if (elapsed < end || index === states.length - 1) {
        return { state: states[index], index, local: Math.max(0, elapsed - cursor) };
      }
      cursor = end;
    }
    return { state: states[states.length - 1], index: states.length - 1, local: 0 };
  };

  const sketch = (p) => {
    const wavePools = {
      1: Array.from("功名利祿"),
      2: Array.from("鏡花水月"),
    };
    const waveColors = {
      1: [64, 135, 169],
      2: [151, 177, 187],
    };
    // Small glyphs carry the continuous texture; larger glyphs provide the
    // same depth accents as 留下來 without turning the tide into a solid mask.
    const sizes = [5, 6, 7, 8, 10, 13, 16];
    const shades = 12;
    const glyphs = { 1: [], 2: [] };
    const mistGlyphs = { 1: [], 2: [] };
    const nameParticleSystems = new Map();
    const atlases = { 1: null, 2: null };
    const noiseFields = {
      1: new Float32Array(81),
      2: new Float32Array(81),
    };
    let density = 1;
    let atlasScale = 1;
    let cell = 16;
    let atlasCell = 18;
    let columns = 0;
    let rows = 0;
    let elapsed = 0;
    let physicsClock = 0;
    let lastStatus = "";
    let finishTimer;

    const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
    const smoothstep = (edge0, edge1, value) => {
      const t = clamp((value - edge0) / (edge1 - edge0));
      return t * t * (3 - 2 * t);
    };
    const easeOut = (value) => 1 - (1 - clamp(value)) ** 3;
    const easeIn = (value) => clamp(value) ** 3;
    const waveProgress = (name, local, duration) => {
      const normalized = clamp(local / duration);
      if (name.endsWith("_RISE")) {
        // The break reaches high water quickly and holds there only briefly.
        return easeOut(clamp(normalized / 0.86));
      }
      return 1 - easeIn(normalized);
    };

    const seeded = (seed) => {
      let value = seed >>> 0;
      return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
      };
    };

    const makeAtlas = (wave) => {
      if (atlases[wave]) atlases[wave].remove();
      const pool = wavePools[wave];
      const [r, g, b] = waveColors[wave];
      const atlas = p.createGraphics(atlasCell * pool.length,
        atlasCell * sizes.length * shades);
      atlas.pixelDensity(density);
      atlas.clear();
      atlas.textFont("serif");
      atlas.textAlign(p.CENTER, p.CENTER);
      atlas.noStroke();
      sizes.forEach((size, sizeIndex) => {
        atlas.textSize(size);
        for (let shade = 0; shade < shades; shade += 1) {
          const alpha = 255 * (shade + 1) / shades;
          atlas.fill(r, g, b, alpha);
          const y = (sizeIndex * shades + shade + 0.5) * atlasCell;
          pool.forEach((char, charIndex) => {
            atlas.text(char, (charIndex + 0.5) * atlasCell, y);
          });
        }
      });
      atlases[wave] = atlas;
      atlasScale = atlas.pixelDensity();
    };

    const makeGlyphs = (wave, randomSeed) => {
      const random = seeded(randomSeed);
      const pool = wavePools[wave];
      const list = [];
      const targetCount = Math.min(48000, columns * rows * 4);
      // Four offset grids create a fine woven surface. The characters are the
      // water itself, so there is no opaque polygon hiding the next name.
      for (let pass = 0; pass < 4; pass += 1) {
        for (let row = 0; row < rows; row += 1) {
          for (let column = -1; column < columns + 1; column += 1) {
            if (list.length >= targetCount) return list;
            const offset = pass * 0.24;
            list.push({
              u: (column + 0.5 + offset + (random() - 0.5) * 0.44) / columns,
              depth: (row + 0.08 + random() * 0.78) / (rows + 1),
              char: Math.floor(random() * pool.length),
              size: 0.74 + random() * 0.46,
              sway: random() * Math.PI * 2,
              drift: 0.5 + random() * 1.25,
              tone: 0.72 + random() * 0.28,
              pass,
            });
          }
        }
      }
      return list;
    };

    const makeMistGlyphs = (wave, randomSeed) => {
      const random = seeded(randomSeed);
      const pool = wavePools[wave];
      const count = Math.min(260, Math.max(90, Math.floor(columns * 1.35)));
      return Array.from({ length: count }, () => ({
        u: random(),
        v: random(),
        char: Math.floor(random() * pool.length),
        sway: random() * Math.PI * 2,
        drift: 0.2 + random() * 0.55,
      }));
    };

    const resize = () => {
      const width = Math.max(1, Math.round(host.clientWidth));
      const height = Math.max(1, Math.round(host.clientHeight));
      p.resizeCanvas(width, height, true);
      // A smaller cell than the slow tide gives the transition a continuous,
      // almost woven water surface instead of a sparse character grid.
      cell = Math.max(8, Math.min(13, Math.min(width / 112, height / 64)));
      atlasCell = Math.max(18, cell * 1.45);
      columns = Math.ceil(width / cell) + 3;
      rows = Math.ceil(height / cell) + 4;
      makeAtlas(1);
      makeAtlas(2);
      glyphs[1] = makeGlyphs(1, 0x51a7);
      glyphs[2] = makeGlyphs(2, 0x9e37);
      mistGlyphs[1] = makeMistGlyphs(1, 0x41c1);
      mistGlyphs[2] = makeMistGlyphs(2, 0x72d3);
    };

    const updateNoise = (motionTime, wave) => {
      const field = noiseFields[wave];
      for (let index = 0; index < field.length; index += 1) {
        field[index] = (p.noise(index * 0.07 + wave * 3.7, motionTime * 0.46) - 0.5) * 2;
      }
    };

    const noiseAt = (u, wave) => {
      const field = noiseFields[wave];
      const sample = clamp(u) * (field.length - 1);
      const index = Math.min(field.length - 2, Math.floor(sample));
      return field[index] + (field[index + 1] - field[index]) * (sample - index);
    };

    const nameForWave = (stateName) => {
      if (stateName === "WAVE_1_FALL") return "瑾瑜當年";
      if (stateName === "WAVE_2_FALL") return "nobody";
      if (stateName === "WAVE_2_RISE" || stateName === "JINYU") return "瑾瑜當年";
      return "Chunyu Liu";
    };

    const drawName = (text, visibility = 1, motionTime = 0, disturbance = 0) => {
      const size = Math.max(30, Math.min(58, p.width * 0.052));
      p.push();
      p.textAlign(p.CENTER, p.CENTER);
      p.textFont("serif");
      p.textStyle(p.NORMAL);
      p.textSize(size);
      p.noStroke();
      const characters = Array.from(text);
      const widths = characters.map((character) => p.textWidth(character));
      const totalWidth = widths.reduce((sum, width) => sum + width, 0);
      let cursor = p.width * 0.5 - totalWidth * 0.5;
      characters.forEach((character, index) => {
        // Each character loses its footing at a slightly different moment,
        // creating a washed, scattered disappearance rather than a crossfade.
        const phase = index * 2.17 + text.length * 0.31;
        const threshold = (Math.sin(phase) + 1) * 0.5;
        const localVisibility = clamp((visibility - threshold * 0.24) / 0.76);
        const driftX = Math.sin(motionTime * 2.1 + phase) * disturbance * 8;
        const driftY = Math.cos(motionTime * 1.7 + phase * 1.4) * disturbance * 5;
        const alpha = 255 * localVisibility;
        p.fill(244, 243, 239, alpha);
        p.text(character, cursor + widths[index] * 0.5 + driftX,
          p.height * 0.49 + driftY);
        cursor += widths[index];
      });
      p.pop();
    };

    const systemForName = (text) => {
      if (nameParticleSystems.has(text)) return nameParticleSystems.get(text);
      let seed = 0;
      Array.from(text).forEach((character) => {
        seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
      });
      const random = seeded(seed || 1);
      const characters = Array.from(text).filter((character) => character.trim());
      const center = (characters.length - 1) * 0.5;
      const particles = characters.map((character, index) => ({
        character,
        x: p.width * 0.5 + (index - center) * 3,
        y: p.height * 0.49,
        vx: 0,
        vy: 0,
        phase: random() * Math.PI * 2,
        mass: 0.75 + random() * 0.5,
        impulse: (random() - 0.5) * 2,
      }));
      const system = { particles, released: false, wave: 1 };
      nameParticleSystems.set(text, system);
      return system;
    };

    const releaseNameParticles = (text, wave, progress) => {
      const system = systemForName(text);
      if (system.released) return system;
      system.released = true;
      system.wave = wave;
      const center = (system.particles.length - 1) * 0.5;
      system.particles.forEach((particle, index) => {
        particle.x = p.width * 0.5 + (index - center) * 3 + particle.impulse * 12;
        particle.y = p.height * 0.49 + Math.sin(particle.phase) * 5;
        // A breaking wave gives each character a different impulse. The
        // subsequent motion comes from velocity, gravity and drag.
        particle.vx = (index - center) * 70 + particle.impulse * 500;
        // The breaker pulls the name downward first; only after that impulse
        // does gravity, drag and the lower current shape its drift.
        particle.vy = 180 + progress * 100 + Math.abs(Math.cos(particle.phase)) * 70;
      });
      return system;
    };

    const updateNamePhysics = (deltaSeconds) => {
      physicsClock += deltaSeconds;
      nameParticleSystems.forEach((system) => {
        if (!system.released) return;
        system.particles.forEach((particle) => {
          const current = Math.sin(physicsClock * 0.7 + particle.phase) * 16;
          const sideways = Math.cos(physicsClock * 0.23 + particle.phase * 1.7) * 7;
          particle.vx += (current + sideways) * deltaSeconds / particle.mass;
          particle.vy += 24 * deltaSeconds;
          particle.vx *= Math.pow(0.985, deltaSeconds * 60);
          particle.vy *= Math.pow(0.992, deltaSeconds * 60);
          particle.x += particle.vx * deltaSeconds;
          particle.y += particle.vy * deltaSeconds;

          // The lower current catches the characters and softly bounces them
          // instead of letting them fall out of the canvas.
          const ceiling = p.height * 0.28;
          const floor = p.height * 0.86;
          if (particle.y < ceiling) {
            particle.y = ceiling;
            particle.vy = Math.abs(particle.vy) * 0.35;
          }
          if (particle.y > floor) {
            particle.y = floor;
            particle.vy *= -0.42;
            particle.vx *= 0.94;
          }
          if (particle.x < -70) particle.x = p.width + 70;
          if (particle.x > p.width + 70) particle.x = -70;
        });
      });
    };

    const drawScatteredName = (text, wave, progress, motionTime, alpha, settled = false) => {
      if (alpha <= 0) return;
      const system = releaseNameParticles(text, wave, settled ? 0.8 : progress);
      // Carried characters keep the exact visual weight of the original name;
      // only their positions change after the wave breaks them apart.
      const size = Math.max(30, Math.min(58, p.width * 0.052));
      p.push();
      p.textAlign(p.CENTER, p.CENTER);
      p.textFont("serif");
      p.textStyle(p.NORMAL);
      p.textSize(size);
      p.noStroke();
      p.fill(244, 243, 239, 255);
      // Once the tide takes the name, each character follows the same
      // position/velocity integration as a simple water-borne particle.
      system.particles.forEach((particle) => {
        p.text(particle.character, particle.x, particle.y);
      });
      p.pop();
    };

    const drawResidue = (motionTime) => {
      p.push();
      p.textAlign(p.CENTER, p.CENTER);
      p.textFont("serif");
      p.textStyle(p.NORMAL);
      p.textSize(Math.max(15, Math.min(24, cell * 0.9)));
      p.noStroke();
      const words = ["無", "名", "無", "相"];
      for (let row = 0; row < 2; row += 1) {
        for (let index = 0; index < words.length; index += 1) {
          const x = p.width * (0.5 + (index - 1.5) * 0.08)
            + Math.sin(motionTime * 1.3 + index) * 7;
          const y = p.height - 32 - row * cell * 0.95
            + Math.sin(motionTime * 1.1 + index * 1.7 + row) * 2.8;
          p.fill(231, 237, 237, 54 - row * 16);
          p.text(words[index], x, y);
        }
      }
      p.pop();
    };

    const shoreline = (u, surface, motionTime, wave) => {
      const impact = wave === 1 ? 1 : 0.72;
      return surface
        + Math.sin(u * 8.5 + motionTime * 3.6) * (9 * impact)
        + Math.sin(u * 21 - motionTime * 2.5) * (3.5 * impact)
        + Math.sin(u * 3.2 - motionTime * 1.1) * (7 * impact)
        + noiseAt(u, wave) * (13 * impact);
    };

    const drawMist = (wave, surface, motionTime) => {
      const atlas = atlases[wave];
      const context = p.drawingContext;
      const sourceCell = atlasCell * atlasScale;
      const mistHeight = Math.max(26, Math.min(surface - 18, p.height * 0.42));
      if (!atlas || mistHeight <= 12) return;
      context.globalAlpha = wave === 1 ? 0.34 : 0.28;
      for (const glyph of mistGlyphs[wave]) {
        const x = glyph.u * p.width
          + Math.sin(motionTime * glyph.drift + glyph.sway) * 4;
        const y = 12 + glyph.v * (mistHeight - 12)
          + Math.sin(motionTime * 0.7 + glyph.sway) * 2;
        const sizeIndex = Math.min(2, Math.floor(glyph.v * 3));
        const destinationSize = Math.max(3.5, cell * 0.6);
        context.drawImage(
          atlas.canvas,
          glyph.char * sourceCell,
          sizeIndex * shades * sourceCell,
          sourceCell,
          sourceCell,
          x - destinationSize / 2,
          y - destinationSize / 2,
          destinationSize,
          destinationSize,
        );
      }
    };

    const drawWave = (wave, progress, motionTime, layerAlpha = 1) => {
      const atlas = atlases[wave];
      if (!atlas) return;
      const pool = wavePools[wave];
      // The crest stops around the name, leaving a generous black sky above;
      // the ebb keeps a shallow current at the bottom instead of vanishing.
      const highSurface = p.height * (wave === 1 ? 0.30 : 0.34);
      const lowSurface = p.height * 0.78;
      const surface = lowSurface - progress * (lowSurface - highSurface);
      const sourceCell = atlasCell * atlasScale;
      const context = p.drawingContext;
      updateNoise(motionTime, wave);
      if (layerAlpha > 0.5) drawMist(wave, surface, motionTime);
      context.globalAlpha = layerAlpha;

      // There is deliberately no mask behind the tide. The jagged crest,
      // small glyphs, and depth-stacked layers make the water's silhouette.
      for (const glyph of glyphs[wave]) {
        const u = glyph.u;
        const shore = shoreline(u, surface, motionTime, wave);
        const depth = clamp(1 - Math.pow(1 - glyph.depth, 1.35));
        const breaking = Math.exp(-(((depth - 0.12) / 0.11) ** 2));
        const deep = clamp((depth - 0.7) / 0.3);
        const crossWave = Math.sin(u * 13 - depth * 7 + motionTime * 0.42);
        const y = shore + depth * (p.height - shore)
          + Math.sin(motionTime * (2.6 + glyph.drift * 0.55) + glyph.sway + depth * 9)
            * (1.5 + 5 * (1 - depth))
          + crossWave * breaking * 6;
        if (y < shore - cell * 0.8 || y > p.height + cell) continue;

        // Let the crest break into gaps instead of forming a straight bright
        // line. The second offset grid keeps the rest of the water dense.
        if (depth < 0.16 && glyph.pass === 0
          && Math.sin(glyph.sway + motionTime * 4.2) < -0.3) continue;

        const x = u * p.width
          + (Math.cos(motionTime * (1.8 + glyph.drift * 0.45) + glyph.sway)
            * (1.5 + 6 * (1 - depth)))
          + crossWave * breaking * 6;
        const edge = Math.exp(-((depth / 0.12) ** 2));
        const brightness = clamp(
          0.23 + depth * 0.62 + edge * 0.2 + breaking * 0.16
            + glyph.tone * 0.08 - deep * 0.12,
        );
        const sizeIndex = Math.min(sizes.length - 1,
          Math.max(0, Math.floor(depth * (sizes.length - 1) + (glyph.pass ? 0.5 : 0))));
        const shade = Math.min(shades - 1, Math.max(0,
          Math.round(brightness * (shades - 1))));
        const destinationSize = cell * (0.92 + glyph.size * 0.2 + edge * 0.18);
        context.drawImage(
          atlas.canvas,
          glyph.char * sourceCell,
          (sizeIndex * shades + shade) * sourceCell,
          sourceCell,
          sourceCell,
          x - destinationSize / 2,
          y - destinationSize / 2,
          destinationSize,
          destinationSize,
        );
      }
    };

    p.setup = () => {
      density = Math.min(window.devicePixelRatio || 1, 2);
      p.pixelDensity(density);
      const canvas = p.createCanvas(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
      canvas.parent(host);
      canvas.elt.setAttribute("aria-hidden", "true");
      p.frameRate(reducedMotion ? 20 : 30);
      resize();
      ready = true;
      window.addEventListener("resize", resize, { passive: true });
    };

    p.draw = () => {
      const delta = Math.min(p.deltaTime || 33.33, 80);
      // Keep the entrance duration intact for reduced-motion users while
      // quieting the surface's local oscillation.
      elapsed += delta;
      updateNamePhysics(delta / 1000);
      const { state, index, local } = stateAt(elapsed);
      const motionTime = elapsed / 1000 * (reducedMotion ? 0.45 : 1);
      p.background(0);
      const currentLabel = statusLabels[state.name];
      if (currentLabel !== lastStatus) {
        overlay.querySelector("[data-typographic-transition-status]").textContent = currentLabel;
        lastStatus = currentLabel;
      }

      if (state.name === "CHUNYU" || state.name === "JINYU" || state.name === "NOBODY") {
        drawName(currentLabel);
        if (state.name === "JINYU") {
          // The first blue tide settles into a visible shallow remnant instead
          // of disappearing at the exact moment the new name appears.
          drawScatteredName("Chunyu Liu", 1, 0, motionTime, 1, true);
          drawWave(1, 0, motionTime, 0.28);
        }
        if (state.name === "NOBODY") {
          // Keep the last shallow layer alive beneath the final name.
          drawScatteredName("Chunyu Liu", 1, 0, motionTime, 1, true);
          drawScatteredName("瑾瑜當年", 2, 0, motionTime, 1, true);
          drawWave(2, 0, motionTime, 0.24);
          drawResidue(motionTime);
        }
      } else if (state.wave) {
        // The next name is drawn first during ebb, so it can only appear where
        // the retreating tide has physically stopped covering it.
        const progress = waveProgress(state.name, local, state.duration);
        const rising = state.name.endsWith("_RISE");
        const visibility = rising
          ? 1 - smoothstep(0.34, 0.72, progress)
          : 1 - smoothstep(0.04, 0.58, progress);
        const disturbance = rising
          ? smoothstep(0.3, 0.74, progress)
          : 1 - visibility;
        drawName(nameForWave(state.name), visibility, motionTime, disturbance);
        const carriedName = state.wave === 1 ? "Chunyu Liu" : "瑾瑜當年";
        // Before immersion the particle layer is gated off; once characters
        // enter the tide they stay at full original brightness.
        const carriedAlpha = rising
          ? smoothstep(0.16, 0.7, progress)
          : 1;
        drawScatteredName(carriedName, state.wave, progress, motionTime, carriedAlpha);
        if (state.wave === 2) {
          // The earliest name remains in the water as a settled, widely
          // scattered layer even after the second name is washed through.
          drawScatteredName("Chunyu Liu", 1, 0, motionTime, 1, true);
        }
        if (state.name === "WAVE_2_RISE") {
          // Let the first vocabulary and its darker blue recede underneath
          // the second vocabulary, so both content and color change gradually.
          drawWave(1, 0, motionTime, 0.28 * (1 - progress));
        }
        drawWave(state.wave, progress, motionTime);
      } else if (state.name === "END") {
        // Keep the final composition visible during the short overlay fade.
        drawName("nobody");
        drawScatteredName("Chunyu Liu", 1, 0, motionTime, 1, true);
        drawScatteredName("瑾瑜當年", 2, 0, motionTime, 1, true);
        drawWave(2, 0, motionTime, 0.2);
        drawResidue(motionTime);
      }

      if (state.name === "END" && index === states.length - 1) {
        if (!finishTimer) {
          finishTimer = window.setTimeout(() => {
            overlay.classList.add("is-complete");
            overlay.setAttribute("aria-hidden", "true");
            document.body.classList.remove("typographic-transition-active");
            window.setTimeout(() => {
              if (p5Instance) p5Instance.remove();
              overlay.remove();
            }, 560);
          }, 180);
        }
        p.noLoop();
      }
    };
  };

  const start = () => {
    if (started || typeof window.p5 !== "function") return;
    started = true;
    p5Instance = new window.p5(sketch, host);
    if (!ready && p5Instance._startListener) {
      window.removeEventListener("load", p5Instance._startListener);
      p5Instance._startListener = null;
      p5Instance._start();
    }
  };

  reducedMotionQuery.addEventListener?.("change", (event) => {
    reducedMotion = event.matches;
    if (p5Instance) p5Instance.frameRate(reducedMotion ? 20 : 30);
  });

  if (typeof window.p5 === "function") start();
  else window.addEventListener("load", start, { once: true });
})();
