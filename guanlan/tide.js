/* Original p5.js / GLSL shoreline study for 觀瀾.
 * A rising and falling shoreline, cellular foam and a finite receding wake.
 * Uses the locally pinned p5 build; no external assets or input capture.
 */
(() => {
  'use strict';
  const surface = document.querySelector('#index-tide');
  if (!surface || !window.p5) return;

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motionPreference.matches;
  let time = 0;
  let readingAreas = [];
  let reach = 0;
  let layoutDirty = true;
  const pointer = { x: -2, y: -2, targetX: -2, targetY: -2, strength: 0, target: 0 };
  const events = new AbortController();
  const options = { passive: true, signal: events.signal };
  let instance;
  const quotes = window.GUANLAN_TIDE_QUOTES || [];
  let quoteBag = [];
  let currentQuote = null;
  let quoteCycle = -1;
  let quoteBorn = 0;
  const inscription = document.createElement('div');
  inscription.className = 'tide-inscription';
  let quoteLetters = [];
  let quoteLayoutDirty = true;
  let shoreRect = [0, 0, 0, 0];

  function createQuoteLetters() {
    quoteLayoutDirty = true;
    inscription.replaceChildren();
    quoteLetters = [];
    const text = Array.from(currentQuote?.text || '');
    const source = Array.from(currentQuote ? `——《${currentQuote.source}》` : '');
    [text, source].forEach((characters, column) => {
      characters.forEach((character, index) => {
        const element = document.createElement('span');
        element.textContent = character;
        inscription.append(element);
        quoteLetters.push({ element, column, index, count: characters.length,
          delay: column ? text.length * 0.18 + index * 0.07 : index * 0.18 });
      });
    });
  }

  function quoteMetrics(quote) {
    const h = window.innerHeight;
    const count = Array.from(quote?.text || '').length;
    const sourceCount = Array.from(quote ? `——《${quote.source}》` : '').length;
    const lineHeight = Math.min(29, h * 0.64 / Math.max(1, count));
    const fontSize = Math.min(21, lineHeight * 0.78, reach * h * 0.23);
    const sourceSize = fontSize * 0.62;
    const sourceLine = sourceSize * 1.4;
    const height = Math.max(lineHeight * Math.max(1, count), sourceLine * sourceCount);
    const width = Math.max(1, fontSize * 3.6);
    const left = reach * h * 0.57 + fontSize * 0.85 - width;
    const top = (h - height) / 2;
    return { h, lineHeight, fontSize, sourceSize, sourceLine, height, width, left, top, sourceCount };
  }

  function layoutQuote() {
    const { h, lineHeight, fontSize, sourceSize, sourceLine, height, width, left, top, sourceCount } = quoteMetrics(currentQuote);
    for (const letter of quoteLetters) {
      const size = letter.column ? sourceSize : fontSize;
      const advance = letter.column ? sourceLine : lineHeight;
      const x = letter.column ? left + sourceSize : reach * h * 0.57;
      const y = letter.column ? top + height - sourceCount * sourceLine : top;
      Object.assign(letter.element.style, {
        left: `${x - size * 0.7}px`, top: `${y + letter.index * advance}px`,
        width: `${size * 1.4}px`, height: `${advance}px`, fontSize: `${size}px`,
      });
    }
    quoteLayoutDirty = false;
  }

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function noise(x, y) {
    const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
    const ix = Math.floor(x), iy = Math.floor(y);
    const u = smoothstep(0, 1, x - ix), v = smoothstep(0, 1, y - iy);
    return mix(mix(hash(ix, iy), hash(ix + 1, iy), u), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
  }

  function shorelineAt(y, tide, rect) {
    const scale = Math.min(1, reach / 0.5);
    const feather = Math.min(0.015 * scale, reach * 0.08);
    const right = rect[0] + rect[2];
    const middle = Math.sin(y * Math.PI) ** 2;
    const edge = clamp(Math.min(rect[1], 1 - rect[1] - rect[3]), 0, 0.5);
    const highBase = right + scale * (0.014 - 0.12 * Math.sin(edge * Math.PI) ** 2);
    const broadNoise = noise(y * 5.8, time * 0.13);
    const fineNoise = noise(y * 27, time * 0.21);
    let front = mix(reach * 0.26, Math.max(reach * 0.26, highBase), tide);
    front += scale * (mix(0.075, 0.12, tide) * middle
      + 0.018 * (broadNoise - 0.5) + 0.010 * (fineNoise - 0.5));
    const influence = Math.exp(-((y - pointer.y) ** 2) / 0.018 - (front - pointer.x) ** 2 / 0.065) * pointer.strength;
    front += influence * (0.055 + 0.018 * Math.sin(y * 36 - time * 2.4));
    const covered = highBase + scale * (0.12 * middle
      + 0.012 * broadNoise + 0.006 * fineNoise)
      + influence * 0.015 * scale;
    return clamp(mix(front, covered, smoothstep(0.88, 0.995, tide)), reach * 0.14, reach * 0.90 - feather);
  }

  function nextQuote() {
    if (!quotes.length) return;
    if (!quoteBag.length) {
      quoteBag = [...quotes];
      for (let i = quoteBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quoteBag[i], quoteBag[j]] = [quoteBag[j], quoteBag[i]];
      }
      if (quoteBag.length > 1 && quoteBag.at(-1) === currentQuote) {
        [quoteBag[0], quoteBag[quoteBag.length - 1]] = [quoteBag.at(-1), quoteBag[0]];
      }
    }
    currentQuote = quoteBag.pop();
  }

  // A rounded triangle keeps moving between short, smooth turns at both ends.
  function tideAt(seconds) {
    const phase = (seconds % 20) / 20;
    const angle = phase * Math.PI * 2;
    const rounding = 0.99;
    const turn = Math.acos(rounding);
    return {
      level: (Math.acos(rounding * Math.cos(angle)) - turn) / (Math.PI - 2 * turn),
      retreat: phase > 0.5 ? -Math.sin(angle) : 0,
    };
  }

  const vertex = `
    precision highp float;
    attribute vec3 aPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
    }
  `;

  const fragment = `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uReach;
    uniform float uRetreat;
    uniform vec4 uReadingAreas[10];
    uniform sampler2D uShoreline;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    vec2 hash2(vec2 p) {
      return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                            dot(p, vec2(269.5, 183.3)))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float sum = 0.0, amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        sum += amplitude * noise(p);
        p = mat2(1.6, -1.2, 1.2, 1.6) * p + 7.3;
        amplitude *= 0.5;
      }
      return sum;
    }
    // Distance to the nearest two irregular cell centers forms a foam web.
    vec2 cells(vec2 p) {
      vec2 base = floor(p), f = fract(p);
      float first = 8.0, second = 8.0;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 seed = hash2(base + offset);
          vec2 center = 0.5 + 0.38 * sin(6.28318 * seed + uTime * 0.22);
          vec2 delta = offset + center - f;
          float d = dot(delta, delta);
          if (d < first) { second = first; first = d; }
          else if (d < second) { second = d; }
        }
      }
      return sqrt(vec2(first, second));
    }
    float readingMask(vec2 pos) {
      float mask = 1.0;
      for (int i = 0; i < 10; i++) {
        vec4 area = uReadingAreas[i];
        vec2 d = max(max(area.xy - pos, pos - area.zw), vec2(0.0));
        float outside = length(d);
        mask = min(mask, mix(0.10, 1.0, smoothstep(0.0, 0.055, outside)));
      }
      return mask;
    }
    void main() {
      float aspect = uResolution.x / uResolution.y;
      vec2 pos = vec2(gl_FragCoord.x / uResolution.x * aspect,
                      1.0 - gl_FragCoord.y / uResolution.y);
      float y = pos.y;
      float retreat = uRetreat;
      float contourScale = min(1.0, uReach / 0.50);
      float shoreFeather = min(0.015 * contourScale, uReach * 0.08);
      float highReach = uReach * 0.90;
      // The wave and native text clipping use the same sampled shoreline.
      vec2 encodedFront = texture2D(uShoreline, vec2(0.5, (y * 127.0 + 0.5) / 128.0)).rg;
      float front = dot(encodedFront, vec2(65280.0, 255.0)) / 65535.0 * uReach;
      float depth = front - pos.x;
      vec3 background = vec3(8.0 / 255.0);
      if (pos.x >= highReach || depth < -0.24) {
        gl_FragColor = vec4(background, 1.0);
        return;
      }

      vec2 flow = vec2(depth * 1.12, y + 0.024 * sin(y * 14.0 + uTime * 0.30));
      float turbulence = fbm(flow * 24.0 + vec2(-uTime * 0.21, uTime * 0.06));
      float roughDepth = depth + (turbulence - 0.5) * 0.027;
      // Water fills the entire sea behind the crest, including the left edge.
      float wake = smoothstep(-0.015, 0.035, roughDepth);
      vec3 water = mix(vec3(0.075, 0.11, 0.13), vec3(0.145, 0.20, 0.23), turbulence);
      // Fade toward the left edge, retaining a trace of blue in the darkness.
      float seaFade = smoothstep(0.0, 1.0, clamp(pos.x / max(front, 0.001), 0.0, 1.0));
      water = mix(vec3(0.018, 0.030, 0.040), water, seaFade);
      vec3 color = mix(background, water, wake * 0.88);

      // Deep water has no foam: skip the costly cell search away from the lip.
      if (depth > 0.50) {
        float visibility = 1.0 - smoothstep(highReach - shoreFeather, highReach, pos.x);
        gl_FragColor = vec4(mix(background, color, visibility * readingMask(pos)), 1.0);
        return;
      }

      // Broad white lip, open cells behind it, and scattered droplets ahead.
      float width = 0.045 + 0.065 * noise(vec2(y * 11.0, uTime * 0.27));
      float foamZone = smoothstep(-0.018, 0.009, roughDepth) * (1.0 - smoothstep(width * 0.45, width * 1.7, roughDepth));
      vec2 foamWarp = vec2(noise(flow * 36.0 + uTime * 0.04),
                           noise(flow * 31.0 + vec2(17.0, -uTime * 0.05)));
      vec2 foamCells = cells(flow * 82.0 + foamWarp * 1.8 + vec2(-uTime * 0.12, 0.0));
      float web = 1.0 - smoothstep(0.022, 0.125, foamCells.y - foamCells.x);
      float rim = (1.0 - smoothstep(0.006, 0.022, abs(roughDepth - 0.008)));
      float crest = max(rim * (0.88 + 0.12 * turbulence), foamZone * web);
      float filledFoam = foamZone * smoothstep(0.36, 0.62, turbulence) * 0.92;
      crest = max(crest, filledFoam);
      float spray = (1.0 - smoothstep(0.025, 0.12, foamCells.x))
                    * smoothstep(-0.10, -0.02, depth) * (1.0 - smoothstep(-0.02, 0.012, depth));
      spray *= smoothstep(0.44, 0.67, turbulence);

      // Broken foam islands survive in the wake before thinning to black.
      float remains = smoothstep(0.06, 0.14, depth) * (1.0 - smoothstep(0.15, 0.48, depth));
      remains *= web * smoothstep(0.42, 0.68, turbulence) * 0.62;
      float backwash = retreat * smoothstep(-0.23, -0.07, depth)
                     * (1.0 - smoothstep(-0.07, 0.0, depth));
      remains += backwash * web * smoothstep(0.42, 0.67, turbulence) * 0.38;
      float ribbons = 0.0;
      for (int i = 0; i < 3; i++) {
        float k = float(i);
        float ridge = 0.14 + k * 0.11 + 0.045 * sin(y * (13.0 + k * 3.0) + uTime * 0.25 + k * 4.0);
        ribbons += (1.0 - smoothstep(0.002, 0.010, abs(depth - ridge))) * (0.13 - k * 0.035);
      }
      float foam = clamp(max(max(crest, spray), remains) + ribbons * turbulence, 0.0, 1.0);
      foam *= mix(0.12, 1.0, seaFade);
      color = mix(color, vec3(0.98, 0.985, 0.975), foam);
      // Keep the tide within the left side of the first collection.
      float visibility = 1.0 - smoothstep(highReach - shoreFeather, highReach, pos.x);
      color = mix(background, color, visibility * readingMask(pos));
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function measureReadingAreas() {
    const selectors = ['.folio-home', '.spine-heading'];
    const areas = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const h = window.innerHeight;
    const firstCollection = document.querySelector('.spine');
    const collectionBox = firstCollection.getBoundingClientRect();
    reach = Math.max(0.01, (collectionBox.left + Math.min(36, collectionBox.width * 0.25)) / h);
    // Use one envelope for the whole quote pool, so changing sentences cannot
    // change the wave's destination abruptly at the highest water level.
    const metrics = (quotes.length ? quotes : [null]).map(quoteMetrics);
    const right = Math.max(...metrics.map((item) => (item.left + item.width) / h));
    const height = Math.max(...metrics.map((item) => item.height / h));
    shoreRect = [0, (1 - height) / 2, right, height];
    quoteLayoutDirty = true;
    readingAreas = areas.slice(0, 10).flatMap((element) => {
      // Fit the ink, rather than dimming the entire wide grid column.
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = range.getBoundingClientRect();
      return [box.left / h, box.top / h, box.right / h, box.bottom / h];
    });
    while (readingAreas.length < 40) readingAreas.push(-10, -10, -9, -9);
    layoutDirty = false;
  }

  function fail(error) {
    console.warn('觀瀾 tide could not start; the collection directory remains available.', error);
    events.abort();
    instance?.remove();
    surface.replaceChildren();
  }

  try {
    instance = new window.p5((p) => {
      let shader;
      let shorelineTexture;
      let ready = false;
      let lastFrame = 0;
      const size = () => {
        // Keep fragment work bounded on large displays and high-DPI phones.
        const scale = Math.min(1, 1400 / window.innerWidth, 1000 / window.innerHeight);
        return [Math.max(1, Math.round(window.innerWidth * scale)), Math.max(1, Math.round(window.innerHeight * scale))];
      };
      const syncLoop = () => {
        lastFrame = performance.now();
        if (!ready) return;
        if (paused || document.hidden) p.noLoop();
        else p.loop();
      };
      p.setup = () => {
        try {
          p.pixelDensity(1);
          p.setAttributes({ alpha: false, antialias: false, depth: false });
          const canvas = p.createCanvas(...size(), p.WEBGL);
          canvas.parent(surface);
          canvas.elt.setAttribute('aria-hidden', 'true');
          p.noStroke();
          p.frameRate(60);
          shorelineTexture = p.createGraphics(1, 128);
          shorelineTexture.pixelDensity(1);
          shorelineTexture.loadPixels();
          surface.append(inscription);
          shader = p.createShader(vertex, fragment);
          p.shader(shader);
          // Compile before revealing the water.
          shader.setUniform('uTime', time);
          measureReadingAreas();
          ready = true;
          surface.classList.add('is-ready');
          lastFrame = performance.now();
          if (paused || document.hidden) p.noLoop();
        } catch (error) { ready = false; p.noLoop(); fail(error); }
      };
      p.draw = () => {
        if (!ready) return;
        const now = performance.now();
        const elapsed = Math.max(0, (now - lastFrame) / 1000);
        if (!paused && !document.hidden) time += elapsed;
        lastFrame = now;
        const follow = 1 - Math.exp(-elapsed * 8);
        pointer.strength += (pointer.target - pointer.strength) * follow;
        pointer.x += (pointer.targetX - pointer.x) * follow;
        pointer.y += (pointer.targetY - pointer.y) * follow;
        if (layoutDirty) measureReadingAreas();
        shader.setUniform('uResolution', [p.width, p.height]);
        shader.setUniform('uTime', time);
        shader.setUniform('uReach', reach);
        const tide = tideAt(time);
        const cycle = Math.floor((time + 10) / 20);
        if (cycle !== quoteCycle) {
          nextQuote();
          createQuoteLetters();
          quoteCycle = cycle;
          // Change at high tide, then let the new inscription develop on the ebb.
          quoteBorn = cycle === 0 ? 0 : cycle * 20 - 6;
        }
        if (quoteLayoutDirty) layoutQuote();
        const h = window.innerHeight;
        const points = [];
        for (let row = 0; row < 128; row++) {
          const y = row / 127;
          const front = shorelineAt(y, tide.level, shoreRect);
          const encoded = Math.round(front / reach * 65535);
          const offset = row * 4;
          shorelineTexture.pixels[offset] = encoded >> 8;
          shorelineTexture.pixels[offset + 1] = encoded & 255;
          shorelineTexture.pixels[offset + 2] = 0;
          shorelineTexture.pixels[offset + 3] = 255;
          // Keep glyphs behind the leading foam as well as the water itself.
          points.push(`${((encoded / 65535 * reach + 0.012) * h).toFixed(2)}px ${(y * h).toFixed(2)}px`);
        }
        shorelineTexture.updatePixels();
        inscription.style.clipPath = `polygon(${points[0]}, 100% 0, 100% 100%, ${points.reverse().join(', ')})`;
        for (const letter of quoteLetters) {
          const brightness = paused ? 1 : smoothstep(0, 1.2, time - quoteBorn - letter.delay);
          if (brightness !== letter.brightness) {
            letter.element.style.opacity = String(brightness);
            letter.brightness = brightness;
          }
        }
        shader.setUniform('uShoreline', shorelineTexture);
        shader.setUniform('uRetreat', tide.retreat);
        shader.setUniform('uReadingAreas', readingAreas);
        p.rect(-p.width / 2, -p.height / 2, p.width, p.height);
      };
      p.windowResized = () => {
        if (!ready) return;
        p.resizeCanvas(...size());
        layoutDirty = true;
        if (paused) p.redraw();
      };
      document.addEventListener('visibilitychange', syncLoop, { signal: events.signal });
      motionPreference.addEventListener('change', () => {
        paused = motionPreference.matches;
        syncLoop();
      }, { signal: events.signal });
      window.addEventListener('pointermove', (event) => {
        pointer.targetX = event.clientX / window.innerHeight;
        pointer.targetY = event.clientY / window.innerHeight;
        pointer.target = 1;
      }, options);
      document.documentElement.addEventListener('pointerleave', () => { pointer.target = 0; }, options);
      window.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'touch') pointer.target = 0;
      }, options);
      window.addEventListener('scroll', () => {
        layoutDirty = true;
        if (paused && ready) p.redraw();
      }, options);
      document.fonts?.ready.then(() => {
        layoutDirty = true;
        if (paused && ready) p.redraw();
      });
    }, surface);
  } catch (error) { fail(error); }
})();
