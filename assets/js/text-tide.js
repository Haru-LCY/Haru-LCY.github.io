(function (global) {
  "use strict";

  // The two voices are deliberately kept as character arrays. A tide can
  // carry a letter without carrying the word it came from.
  const nobodyChars = [..."nobody"];
  const chunyuChars = [..."Chunyu Liu"];

  const DEFAULT_CONFIG = {
    foregroundColor: "rgba(245, 248, 250, 0.82)",
    middleColor: "rgba(193, 216, 230, 0.48)",
    backgroundColor: "rgba(142, 177, 199, 0.22)",
    frontColor: "rgba(250, 252, 253, 0.92)",
    deepColor: "rgba(112, 165, 191, 0.58)",
    waterColor: "rgba(118, 177, 207, 0.23)",
    waveAmplitude: 42,
    waveFrequency: 2.6,
    noiseAmount: 18,
    tideSpeed: Math.PI * 2 / 10,
    tideRange: 95,
    characterCount: 1700,
    fontSizeRange: [8, 18],
    nobodyRatio: 0.72,
    nobodyReconstructionInterval: [12, 20],
    chunyuReconstructionInterval: [25, 40],
    reconstructionDuration: 3.2,
    holdDuration: 1.1,
    fontFamily: "Georgia, serif",
    shorelineTrace: true,
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const ease = (value) => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const randomBetween = (min, max) => min + Math.random() * (max - min);

  const createTextTideSketch = (options) => {
    const settings = options || {};
    const container = settings.container;
    if (!container || typeof global.p5 !== "function") return null;

    const surface = settings.surface || container.querySelector("[data-text-tide-surface]") || container;
    const pauseButton = settings.pauseButton || container.querySelector("[data-text-tide-pause]");
    const direction = container.dataset.tideDirection || "vertical";
    const horizontal = direction === "horizontal";
    const config = Object.assign({}, DEFAULT_CONFIG, settings.config || {});
    const palette = settings.palette || {};
    Object.assign(config, palette);
    const charSets = settings.chars || {};
    const nobodySet = Array.from(charSets.nobody || nobodyChars);
    const chunyuSet = Array.from(charSets.chunyu || chunyuChars);
    const chunyuGlyphSet = chunyuSet.filter((char) => char !== " ");
    const prefersReducedMotion = global.matchMedia
      ? global.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false, addEventListener: function () {} };

    let reducedMotion = prefersReducedMotion.matches;
    let paused = false;
    let visible = true;
    let ready = false;
    let instance = null;
    let resizeObserver = null;

    const reconstruction = {
      nobody: {
        id: "nobody",
        chars: nobodySet,
        layer: 2,
        interval: config.nobodyReconstructionInterval,
        nextAt: randomBetween(12, 20),
        active: false,
        startedAt: 0,
        selected: [],
        blend: 0,
        targetY: 0,
      },
      chunyu: {
        id: "chunyu",
        chars: chunyuSet,
        layer: 1,
        interval: config.chunyuReconstructionInterval,
        nextAt: randomBetween(25, 40),
        active: false,
        startedAt: 0,
        selected: [],
        blend: 0,
        targetY: 0,
      },
    };

    const updateLoop = () => {
      if (!instance || !ready) return;
      if (visible && !global.document.hidden && !paused) instance.loop();
      else instance.noLoop();
    };

    const updateButton = () => {
      if (!pauseButton) return;
      pauseButton.hidden = false;
      pauseButton.textContent = paused ? "继续" : "暂停";
      pauseButton.setAttribute("aria-pressed", String(paused));
      pauseButton.setAttribute("aria-label", paused ? "继续文字潮汐动画" : "暂停文字潮汐动画");
    };

    const sketch = (p) => {
      let particles = [];
      let tideTime = 0;
      let lastShoreCycle = -1;
      let shorelineTrace = false;
      let width = 1;
      let height = 1;
      let textRight = 1;
      let textGlyphWidth = 16;
      const essayInner = container.closest(".gallery-essay")
        ? container.closest(".gallery-essay").querySelector(".gallery-essay__inner")
        : null;
      const essayBody = container.closest(".gallery-essay")
        ? container.closest(".gallery-essay").querySelector(".gallery-essay__body")
        : null;
      const layers = [
        {
          key: "background",
          color: config.backgroundColor,
          front: 0.06,
          spread: 0.23,
          amplitude: 0.64,
          speed: 1.35,
          size: 0.68,
          density: 0.26,
          nobodyRatio: Math.max(0.2, config.nobodyRatio - 0.25),
        },
        {
          key: "middle",
          color: config.middleColor,
          front: 0.18,
          spread: 0.28,
          amplitude: 0.82,
          speed: 0.98,
          size: 0.84,
          density: 0.32,
          nobodyRatio: Math.max(0.38, config.nobodyRatio - 0.1),
        },
        {
          key: "foreground",
          color: config.foregroundColor,
          front: 0.32,
          spread: 0.34,
          amplitude: 1,
          speed: 0.78,
          size: 1,
          density: 0.42,
          nobodyRatio: config.nobodyRatio,
        },
      ];

      const resizeMetrics = () => {
        width = Math.max(1, Math.round(surface.clientWidth || surface.getBoundingClientRect().width));
        height = Math.max(1, Math.round(surface.clientHeight || 190));
        if (horizontal && essayInner) {
          const textRect = (essayBody || essayInner).getBoundingClientRect();
          const computed = global.getComputedStyle ? global.getComputedStyle(essayBody || essayInner) : null;
          const fontSize = computed ? parseFloat(computed.fontSize) : 16;
          const letterSpacing = computed && computed.letterSpacing !== "normal"
            ? parseFloat(computed.letterSpacing) || 0
            : 0;
          textRight = clamp(textRect.right, width * 0.52, width - 2);
          textGlyphWidth = clamp(fontSize + letterSpacing, 12, 32);
        } else {
          textRight = width;
          textGlyphWidth = 16;
        }
      };

      const makeParticles = () => {
        resizeMetrics();
        const mobileScale = clamp(width / 680, 0.56, 1);
        const count = Math.round(config.characterCount * mobileScale);
        const minSize = config.fontSizeRange[0];
        const maxSize = config.fontSizeRange[1];
        particles = [];
        layers.forEach((layer, layerIndex) => {
          const layerCount = Math.max(12, Math.round(count * layer.density));
          for (let index = 0; index < layerCount; index += 1) {
            const useNobody = Math.random() < layer.nobodyRatio;
            const source = useNobody ? nobodySet : chunyuGlyphSet;
            particles.push({
              name: useNobody ? "nobody" : "chunyu",
              baseChar: source[Math.floor(Math.random() * source.length)],
              char: source[Math.floor(Math.random() * source.length)],
              x: Math.random() * width,
              y: Math.random() * height,
              phase: Math.random() * Math.PI * 2,
              // A square-root distribution puts most glyphs in the thick,
              // heavy lower water while a sparse veil remains above it.
              depth: Math.pow(Math.random(), 0.35),
              opacity: randomBetween(0.56, 1),
              drift: randomBetween(-0.7, 0.7),
              size: randomBetween(minSize, maxSize) * layer.size,
              layer: layerIndex,
              noiseSeed: Math.random() * 20,
              rotation: randomBetween(-0.035, 0.035),
              recon: null,
              targetX: 0,
              targetY: 0,
            });
          }
        });
      };

      const waveFront = (x, layerIndex, now, tide) => {
        const layer = layers[layerIndex];
        const u = x / Math.max(1, width);
        const swell = Math.sin(u * Math.PI * 1.7 - now * 1.1 + layerIndex * 1.6) * 30;
        const cross = Math.sin(u * Math.PI * 5.4 + now * 0.85 + layerIndex) * 12;
        const broken = (p.noise(u * 1.15 + layerIndex * 7.3, now * 0.2) - 0.5) * 38;
        const wash = Math.sin(now * 0.62 + layerIndex * 1.2) * 7 - tide * config.tideRange;
        // Leave air above the crest: the high tide can cover the paragraph,
        // but its foam edge must keep a continuous arc instead of becoming a
        // hard horizontal shelf clipped against the canvas's top border.
        const rawFront = height * layer.front + swell + cross + broken + wash;
        const softFloor = 28 + 24 * Math.log1p(Math.exp((rawFront - 28) / 24));
        return softFloor;
      };

      const waveY = (x, particle, layerIndex, now, tide) => {
        const layer = layers[layerIndex];
        const u = x / Math.max(1, width);
        const wave = Math.sin(u * Math.PI * config.waveFrequency + particle.phase + now * layer.speed);
        const secondary = Math.sin(u * Math.PI * 4.8 - now * 0.35 + particle.phase * 0.35) * 0.22;
        const noise = (p.noise(u * 1.45 + particle.noiseSeed, now * 0.12) - 0.5) * config.noiseAmount;
        const amplitude = config.waveAmplitude * layer.amplitude * (1 + tide * 0.12);
        const front = waveFront(x, layerIndex, now, tide);
        const depth = Math.pow(particle.depth, 0.78);
        const waterColumn = front + depth * (height - front);
        const crest = (wave + secondary) * amplitude * (1 - depth * 0.58);
        particle.frontness = Math.pow(1 - particle.depth, 0.58);
        return waterColumn + crest + noise;
      };

      const waveFrontX = (y, layerIndex, now, tide) => {
        const v = y / Math.max(1, height);
        const swell = Math.sin(v * Math.PI * 1.7 + now * 1.05 + layerIndex * 1.4) * 14;
        const cross = Math.sin(v * Math.PI * 5.2 - now * 0.72 + layerIndex) * 7;
        const broken = (p.noise(v * 1.3 + layerIndex * 7.1, now * 0.2) - 0.5) * 22;
        // Anchor the water to the essay's text column. The full tide swing
        // spans four glyphs: high tide reaches four characters into the text,
        // while low tide settles near the text edge instead of the viewport edge.
        const coverage = textGlyphWidth * 4;
        const horizontalRange = coverage * 0.5;
        const baseline = textRight - horizontalRange - layerIndex * 1.5;
        const rawFront = baseline + swell + cross + broken - tide * horizontalRange;
        return clamp(rawFront, textRight - coverage, textRight + textGlyphWidth * 0.65);
      };

      const waveX = (y, particle, layerIndex, now, tide) => {
        const layer = layers[layerIndex];
        const v = y / Math.max(1, height);
        const wave = Math.sin(v * Math.PI * config.waveFrequency + particle.phase + now * layer.speed);
        const secondary = Math.sin(v * Math.PI * 4.8 - now * 0.35 + particle.phase * 0.35) * 0.22;
        const noise = (p.noise(v * 1.45 + particle.noiseSeed, now * 0.12) - 0.5) * (config.noiseAmount * 0.72);
        const amplitude = config.waveAmplitude * 0.62 * layer.amplitude * (1 + tide * 0.12);
        const front = waveFrontX(y, layerIndex, now, tide);
        const waterColumn = front + Math.pow(particle.depth, 0.78) * (width - front);
        const crest = (wave + secondary) * amplitude * (1 - particle.depth * 0.58);
        particle.frontness = Math.pow(1 - particle.depth, 0.58);
        return waterColumn + crest + noise;
      };

      const currentPosition = (particle, now, tide) => {
        if (horizontal) {
          const driftY = particle.drift * now * 1.2
            + Math.sin(now * 0.18 + particle.phase) * 2.5;
          const y = ((particle.y + driftY) % height + height) % height;
          const x = waveX(y, particle, particle.layer, now, tide);
          let drawX = x;
          let drawY = y;
          let rotation = particle.rotation;
          let blend = 0;
          if (particle.recon) {
            const state = reconstruction[particle.recon];
            blend = state.blend;
            drawX = x + (particle.targetX - x) * blend;
            drawY = y + (particle.targetY - y) * blend;
            rotation *= 1 - blend * 0.8;
          }
          particle.drawX = drawX;
          particle.drawY = drawY;
          particle.drawRotation = rotation;
          particle.drawBlend = blend;
          particle.drawHeight = x;
          return particle;
        }
        // The tide rises and ebbs vertically. Horizontal motion is only a
        // quiet local drift, so the full-width field never reads as a ticker.
        const driftX = particle.drift * now * 1.4
          + Math.sin(now * 0.18 + particle.phase) * 2.5;
        const x = ((particle.x + driftX) % width + width) % width;
        const y = waveY(x, particle, particle.layer, now, tide);
        let drawX = x;
        let drawY = y;
        let rotation = particle.rotation;
        let blend = 0;
        if (particle.recon) {
          const state = reconstruction[particle.recon];
          blend = state.blend;
          drawX = x + (particle.targetX - x) * blend;
          drawY = y + (particle.targetY - y) * blend;
          rotation *= 1 - blend * 0.8;
        }
        // Store the transient draw values on the long-lived particle. This
        // keeps the frame loop allocation-free while the particles drift.
        particle.drawX = drawX;
        particle.drawY = drawY;
        particle.drawRotation = rotation;
        particle.drawBlend = blend;
        particle.drawHeight = y;
        return particle;
      };

      const beginReconstruction = (state, now, tide) => {
        if (state.active || now < state.nextAt) return;
        const candidates = particles
          .map((particle, index) => ({ particle, index }))
          .filter(({ particle }) => particle.name === state.id && particle.layer === state.layer)
          .sort((a, b) => a.particle.x - b.particle.x);
        const printable = state.chars
          .map((char, index) => ({ char, index }))
          .filter(({ char }) => char !== " ");
        if (candidates.length < printable.length) return;
        const chosen = candidates.slice(0, printable.length);
        const step = clamp((config.fontSizeRange[1] * (state.id === "nobody" ? 0.95 : 0.78)), 13, 25);
        const center = horizontal
          ? randomBetween(height * 0.36, height * 0.64)
          : randomBetween(width * 0.36, width * 0.64);
        const startX = center - ((state.chars.length - 1) * step) / 2;
        state.active = true;
        state.startedAt = now;
        state.selected = chosen.map(({ particle }, index) => {
          const slot = printable[index].index;
          particle.recon = state.id;
          particle.char = printable[index].char;
          if (horizontal) {
            particle.targetY = startX + slot * step;
            particle.targetX = waveFrontX(particle.targetY, state.layer, now, tide) + 8;
          } else {
            particle.targetX = startX + slot * step;
            particle.targetY = waveFront(particle.targetX, state.layer, now, tide) + 8;
          }
          return particle;
        });
        state.targetY = horizontal ? height * 0.5 : height * layers[state.layer].base;
      };

      const updateReconstruction = (state, now) => {
        if (!state.active) return;
        const convergeDuration = config.reconstructionDuration * 0.42;
        const dissolveDuration = config.reconstructionDuration * 0.58;
        const elapsed = now - state.startedAt;
        if (elapsed < convergeDuration) {
          state.blend = ease(elapsed / convergeDuration);
        } else if (elapsed < convergeDuration + config.holdDuration) {
          state.blend = 1;
        } else if (elapsed < convergeDuration + config.holdDuration + dissolveDuration) {
          state.blend = 1 - ease((elapsed - convergeDuration - config.holdDuration) / dissolveDuration);
        } else {
          state.selected.forEach((particle) => {
            particle.recon = null;
            particle.baseChar = particle.name === "nobody"
              ? nobodySet[Math.floor(Math.random() * nobodySet.length)]
              : chunyuGlyphSet[Math.floor(Math.random() * chunyuGlyphSet.length)];
            particle.char = particle.baseChar;
          });
          state.selected = [];
          state.active = false;
          state.blend = 0;
          state.nextAt = now + randomBetween(state.interval[0], state.interval[1]);
        }
      };

      const drawShorelineTrace = (context, tide) => {
        if (!config.shorelineTrace || !shorelineTrace || tide > -0.72) return;
        const fade = clamp((-tide - 0.72) / 0.28, 0, 1) * 0.38;
        context.save();
        context.globalAlpha = fade;
        context.fillStyle = config.foregroundColor;
        context.font = `${Math.max(13, config.fontSizeRange[0])}px ${config.fontFamily}`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        if (horizontal) context.fillText("nobody", width - 17, height * 0.5);
        else context.fillText("nobody", width * 0.5, height - 17);
        context.restore();
      };

      const drawWaterBlock = (context, now, tide) => {
        // A translucent body makes the lower tide legible as water even when
        // the glyphs are sparse between wave fronts. Its upper edge follows
        // the same broken, vertical-moving shoreline as the characters.
        const samples = 72;
        context.save();
        context.beginPath();
        if (horizontal) {
          context.moveTo(width, 0);
          for (let index = 0; index <= samples; index += 1) {
            const y = height * index / samples;
            context.lineTo(waveFrontX(y, 2, now, tide), y);
          }
          context.lineTo(width, height);
        } else {
          context.moveTo(0, height);
          for (let index = 0; index <= samples; index += 1) {
            const x = width * index / samples;
            context.lineTo(x, waveFront(x, 2, now, tide));
          }
          context.lineTo(width, height);
        }
        context.closePath();
        context.fillStyle = config.waterColor;
        context.fill();
        context.restore();
      };

      p.setup = () => {
        resizeMetrics();
        p.pixelDensity(Math.min(global.devicePixelRatio || 1, 2));
        const canvas = p.createCanvas(width, height);
        canvas.parent(surface);
        canvas.elt.setAttribute("role", "img");
        canvas.elt.setAttribute("aria-label", "由 nobody 与 Chunyu Liu 的字母碎片组成的银白色潮汐");
        p.frameRate(reducedMotion ? 20 : 30);
        makeParticles();
        ready = true;
        queueMicrotask(updateLoop);
        updateButton();
      };

      const resize = () => {
        resizeMetrics();
        if (!p.width || p.width !== width || p.height !== height) {
          p.resizeCanvas(width, height, true);
          makeParticles();
          if (paused || !visible) p.redraw();
        }
      };
      p.windowResized = resize;

      p.draw = () => {
        const running = visible && !global.document.hidden && !paused;
        const delta = Math.min(p.deltaTime || 33.33, 80) / 1000;
        if (running) tideTime += delta * (reducedMotion ? 0.36 : 1);
        const tide = Math.sin(tideTime * config.tideSpeed);
        const cycle = Math.floor(tideTime * config.tideSpeed / (Math.PI * 2));
        if (cycle !== lastShoreCycle) {
          lastShoreCycle = cycle;
          shorelineTrace = Math.random() < 0.42;
        }
        if (running) {
          beginReconstruction(reconstruction.nobody, tideTime, tide);
          beginReconstruction(reconstruction.chunyu, tideTime, tide);
          updateReconstruction(reconstruction.nobody, tideTime);
          updateReconstruction(reconstruction.chunyu, tideTime);
        }

        p.clear();
        const context = p.drawingContext;
        context.textAlign = "center";
        context.textBaseline = "middle";
        drawWaterBlock(context, tideTime, tide);
        layers.forEach((layer, layerIndex) => {
          particles.forEach((particle) => {
            if (particle.layer !== layerIndex) return;
            const point = currentPosition(particle, tideTime, tide);
            const vertical = clamp(point.drawY / Math.max(1, height), 0, 1);
            const bottomWeight = 0.035 + ease(clamp((vertical - 0.03) / 0.82, 0, 1)) * 0.965;
            const frontWeight = 0.66 + particle.frontness * 0.58;
            const waterWeight = particle.frontness > 0.62
              ? 0.72 + particle.frontness * 0.28 : bottomWeight;
            const alpha = particle.opacity * waterWeight * frontWeight
              * (0.72 + point.drawBlend * 0.28);
            const size = particle.size * (1 + particle.frontness * 0.12)
              * (point.drawBlend ? 1.03 : 1);
            // Foam at the irregular wave front turns silver-white. The
            // lower body falls through pale blue-gray into a quiet deep blue.
            context.fillStyle = particle.frontness > 0.62
              ? config.frontColor
              : vertical > 0.72 ? config.deepColor : layer.color;
            context.save();
            context.globalAlpha = alpha;
            context.font = `${size}px ${config.fontFamily}`;
            context.translate(point.drawX, point.drawY);
            context.rotate(point.drawRotation);
            context.fillText(particle.char, 0, 0);
            context.restore();
          });
        });
        drawShorelineTrace(context, tide);
        context.globalAlpha = 1;
        if (!running) p.noLoop();
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(surface);
    };

    instance = new global.p5(sketch, surface);
    // p5 1.x waits for window.load when constructed before the page finishes
    // loading. This sketch has no external assets, so start it immediately.
    if (!ready && instance._startListener) {
      global.removeEventListener("load", instance._startListener);
      instance._startListener = null;
      instance._start();
    }
    if (pauseButton) {
      pauseButton.addEventListener("click", () => {
        paused = !paused;
        updateButton();
        updateLoop();
      });
    }
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateLoop();
    });
    intersection.observe(container);
    global.document.addEventListener("visibilitychange", updateLoop);
    prefersReducedMotion.addEventListener("change", () => {
      reducedMotion = prefersReducedMotion.matches;
      if (instance) instance.frameRate(reducedMotion ? 20 : 30);
      updateLoop();
    });

    return {
      pause: () => { paused = true; updateButton(); updateLoop(); },
      resume: () => { paused = false; updateButton(); updateLoop(); },
      resize: () => instance && instance.windowResized(),
      destroy: () => {
        intersection.disconnect();
        if (resizeObserver) resizeObserver.disconnect();
        global.document.removeEventListener("visibilitychange", updateLoop);
        if (instance) instance.remove();
      },
    };
  };

  global.createTextTideSketch = createTextTideSketch;
  global.textTideConfig = { nobodyChars, chunyuChars, defaults: DEFAULT_CONFIG };

  const boot = () => {
    if (typeof global.p5 !== "function") return;
    global.document.querySelectorAll("[data-memory-tide]").forEach((container) => {
      if (container.__textTide) return;
      container.__textTide = createTextTideSketch({
        container,
        config: global.memoryTideConfig || {},
      });
    });
  };
  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}(window));
