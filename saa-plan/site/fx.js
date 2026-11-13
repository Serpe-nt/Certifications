// Celebration effects, drawn in Datum's Excimer colours (the owner's poster): a canvas of square pieces and yellow
// crosshair marks, dot-matrix bursts, viewfinder brackets, scan lines, rising packets and, on the top rungs, yellow
// filaments that grow out from a junction like the poster's, all in the theme's own inks (signal, ink, paper), plus
// Web Audio sounds and the banner, toast and badges. No dependencies. Pieces move smoothly (drawn every frame), turn in
// 45-degree steps and cut out at the end of their life; nothing glows or blurs.
// A ladder, from small to large: step → block → quiz unlocked → day → week → all, plus a sound and a burst on every
// quiz answer and bigger bursts at each streak mark.
window.FX = (() => {
  let fxOn = true, soundOn = true;
  let cv = null, ctx = null, W = 0, H = 0, raf = 0, prev = 0, acc = 0, drawn = 0, clock = 0;
  let parts = [], rockets = [], frames = [], cells = [], scans = [], strands = [];
  let actx = null, out = null, bEl = null, vEl = null, bT = 0, tEl = null, tT = 0, bdWrap = null, glowT = 0;
  const bdQ = [];   // badges waiting for a free place
  const MAX_PARTS = 6000;   // the biggest celebrations stay smooth on a slow machine
  const MAX_CELLS = 9000;
  const FRAME = 1000 / 60;  // the simulation runs in fixed 60 Hz steps, whatever the screen's refresh rate
  const STEP = 0;           // ...and is drawn on every frame the screen gives (Datum: eased, not stepped)
  const GRID = 1;           // no snapping: pieces travel smoothly
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const snap = v => Math.round(v / GRID) * GRID;
  const motion = () => fxOn && !reduce.matches && document.documentElement.dataset.dmMotion !== "off";
  // No emoji in the interface: whatever a caller passes, pictographs go (the system's own glyphs ↗ and ▶ stay).
  const plain = s => String(s == null ? "" : s).replace(/(?![↗▶])\p{Extended_Pictographic}️?/gu, "").replace(/^\s+/, "");
  // A modal dialog sits in the browser's top layer, above everything else on the page:
  // whatever must show while one is open (the quiz) has to live inside it. With two open
  // (the break reminder over a quiz), the later one in the page is the one on top.
  const host = () => { const d = document.querySelectorAll("dialog[open]"); return d.length ? d[d.length - 1] : document.body; };

  // ---------- colour: the theme's own tokens, read when an effect starts (so Carbon and Paper both work) ----------
  // Pieces carry a token name, not a colour, so a theme switch mid-burst repaints them right.
  let C = {};
  function pal() {
    const cs = getComputedStyle(document.documentElement), v = (n, f) => cs.getPropertyValue(n).trim() || f;
    C = { sig: v("--signal", "#F7D123"), edge: v("--signal-edge", "#F7D123"), ink: v("--ink", "#EDEBE4"), ink3: v("--ink-3", "#8E8A7F"),
      raised: v("--paper-raised", "#1C1C1B"), paper: v("--paper", "#111111"), rule: v("--rule", "#36342C"), alert: v("--alert", "#FF5533") };   // fallbacks = dm/tokens.css
  }
  // Mixes of pieces by heat. "raised" pieces are paper with an ink outline, so they read on either theme.
  const MIX = {
    base: ["sig", "sig", "ink", "ink", "raised"],
    hot: ["sig", "sig", "sig", "ink", "edge"],        // a run of 5 or more
    epic: ["sig", "ink", "raised", "edge", "sig"],    // a run of 20 or more, the top rungs
    sig: ["sig", "sig", "edge"],
    ink: ["ink", "ink", "ink3"],
    broke: ["alert", "ink", "ink3", "alert"]          // a run broken: the only place alert is used
  };

  // ---------- canvas ----------
  function ensure() {
    if (!cv) {
      cv = document.createElement("canvas");
      cv.className = "fx-canvas";
      cv.setAttribute("aria-hidden", "true");
      ctx = cv.getContext("2d");
      addEventListener("resize", size);
    }
    pal();
    const h = host();
    if (cv.parentNode !== h) { h.appendChild(cv); size(); }
  }
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  function center(el) {
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      if (r.width || r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: W / 2, y: H / 2 };
  }

  // Square pieces thrown from a point. shapes: "sq" (a square plate), "bar" (a 3:1 strip), "px" (one dot-matrix pixel).
  // They turn in 45-degree steps (every few ticks), not smoothly.
  function burst(x, y, n, o = {}) {
    const { speed = 7, angle = -Math.PI / 2, spread = Math.PI * 2, gravity = 0.22, ttl = [50, 90], size = [4, 8], shapes = ["sq", "bar", "plus", "px"], colors = MIX.base } = o;
    n = Math.min(n, MAX_PARTS - parts.length);
    for (let i = 0; i < n; i++) {
      const a = angle + R(-spread / 2, spread / 2), v = speed * R(0.45, 1.1);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: gravity, drag: 0.986, life: 0,
        ttl: R(ttl[0], ttl[1]), c: pick(colors), s: R(size[0], size[1]), rot: (Math.random() * 8) | 0, turn: (R(4, 12)) | 0, shape: pick(shapes) });
    }
    run();
  }
  // dot-matrix pixels: small square sparks (the old stars)
  const pixels = (x, y, n, o = {}) => burst(x, y, n, { speed: 8, ttl: [40, 75], size: [3, 6], gravity: 0.16, shapes: ["px", "px", "sq"], colors: MIX.sig, ...o });
  // A firework's break: dotted rays along the eight 45-degree directions, each a chain of pixels at rising speeds.
  function rays(x, y, len, c, big) {
    const chain = big ? 7 : 5;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      for (let j = 1; j <= chain && parts.length < MAX_PARTS; j++) {
        const v = len * j / chain;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.03, drag: 0.95, life: 0, ttl: R(46, 70), c: j % 2 ? c : "ink", s: big ? 5 : 4, rot: 0, turn: 0, shape: "px" });
      }
    }
    // the in-between directions get a shorter, fainter chain: a dotted star, not a smooth circle
    if (big) for (let k = 0; k < 8; k++) {
      const a = (k + 0.5) * Math.PI / 4;
      for (let j = 1; j <= 3 && parts.length < MAX_PARTS; j++) parts.push({ x, y, vx: Math.cos(a) * len * j / 5, vy: Math.sin(a) * len * j / 5, g: 0.03, drag: 0.95, life: 0, ttl: R(40, 60), c: "edge", s: 3, rot: 0, turn: 0, shape: "px" });
    }
    run();
  }
  // Viewfinder brackets that open out from where something was finished (the old expanding ring).
  function frame(x, y, c = "edge", delay = 0, ttl = 26) {
    setTimeout(() => { if (!motion()) return; ensure(); frames.push({ x, y, r: 10, c, life: 0, ttl }); run(); }, delay);
  }
  // A dot-matrix burst: a diamond of square cells (45-degree edges) that light ring by ring from the centre, hold,
  // and switch off in the same order. r = rings, pitch = px between cells.
  function grid(x, y, r, colors = MIX.sig, delay = 0, pitch = 10) {
    setTimeout(() => {
      if (!motion()) return;
      ensure();
      const t0 = clock;
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        const d = Math.abs(i) + Math.abs(j);
        if (d > r || cells.length >= MAX_CELLS || (d > 1 && Math.random() < 0.18)) continue;   // a few gaps: a matrix, not a slab
        cells.push({ x: snap(x + i * pitch), y: snap(y + j * pitch), on: t0 + d * 2, off: t0 + d * 2 + 7, s: Math.max(3, pitch * 0.55), c: d === r ? "edge" : pick(colors) });
      }
      run();
    }, delay);
  }
  // Pieces falling in columns at a constant speed, each a short dotted packet (the old emoji rain).
  function rain(n, colors = MIX.base) {
    n = Math.min(n, MAX_PARTS - parts.length);
    for (let i = 0; i < n; i++) {
      parts.push({ x: Math.round(R(0, W) / 16) * 16, y: R(-H * 0.6, -20), vx: 0, vy: R(4, 8), g: 0, drag: 1, life: 0,
        ttl: R(150, 240), c: pick(colors), s: R(5, 9), rot: 0, turn: 0, shape: "col" });
    }
    run();
  }
  // big: a packet of the top rungs, with a second ink, brackets and pixels, and a louder bang.
  // A packet rises straight up at a constant speed (a signal on a wire), then breaks into rays.
  function rocket(x, delay, big = false) {
    setTimeout(() => {
      if (!motion()) return;
      ensure();
      const top = R(H * (big ? 0.12 : 0.2), H * (big ? 0.5 : 0.55)), ticks = big ? 52 : 46;
      rockets.push({ x: snap(x), y: H + 10, vy: -(H + 10 - top) / ticks, top, c: pick(["sig", "sig", "ink"]), c2: pick(["ink", "edge", "sig"]), big });
      if (soundOn) noise(0, 0.35, 0.025, 2500);
      run();
    }, delay);
  }
  // two bursts from the bottom corners, at 45 degrees
  function cannons(n, colors = MIX.base) {
    const speed = Math.sqrt(0.5 * H * 0.85);
    const o = { speed, spread: 0.4, gravity: 0.25, ttl: [100, 150], size: [5, 9], shapes: ["sq", "bar", "plus", "px"], colors };
    burst(0, H, n, { ...o, angle: -Math.PI / 4 });
    burst(W, H, n, { ...o, angle: (-Math.PI * 3) / 4 });
  }
  // run fn after ms, on a canvas in whatever is on top by then
  const later = (ms, fn) => setTimeout(() => { if (!motion()) return; ensure(); fn(); }, ms);
  // A scan line sweeps down the screen at a constant speed, three dotted rows behind it (the old soft flash).
  // One pass, never more than two a second.
  function scan(delay = 0, c = "edge", ttl = 40) {
    later(delay, () => { scans.push({ c, life: 0, ttl }); run(); });
  }
  // a column of pieces from the bottom edge for ms milliseconds
  function fountain(x, ms, delay = 0, colors = MIX.base) {
    later(delay, () => {
      const end = Date.now() + ms;
      const id = setInterval(() => {
        if (Date.now() > end || !motion()) return clearInterval(id);
        ensure();
        burst(x, H + 4, 5, { speed: Math.sqrt(2 * 0.24 * H * R(0.7, 1)), spread: 0.3, gravity: 0.24, ttl: [90, 140], size: [5, 9], shapes: ["sq", "bar", "px"], colors });
      }, 40);
    });
  }
  // Filaments, the poster's yellow strands: n curves grow out of a junction at (x, y) to points far off, each bending
  // once, while the junction swells into a body; they hold, then cut out. The top rungs only.
  function filaments(x, y, n, delay = 0, c = "sig") {
    later(delay, () => {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + R(-0.35, 0.35), len = R(0.35, 0.75) * Math.max(W, H);
        const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, bend = R(-0.5, 0.5) * len;
        strands.push({ x, y, cx: (x + ex) / 2 - Math.sin(a) * bend, cy: (y + ey) / 2 + Math.cos(a) * bend, ex, ey, c, life: 0, ttl: R(80, 110), grow: R(26, 40) });
      }
      run();
    });
  }
  // The open dialog's edge lights up (a long run of right answers): an outline that steps out twice and is gone.
  // An outline, not a transform: a transform would move the fixed layers inside the dialog (canvas, badges) with it.
  function glow(c = "var(--signal)") {
    const h = host();
    if (h === document.body) return;
    h.style.setProperty("--fx-glow", c);
    h.classList.remove("fx-glow"); void h.offsetWidth; h.classList.add("fx-glow");
    clearTimeout(glowT);
    glowT = setTimeout(() => h.classList.remove("fx-glow"), 1300);
  }

  function update() {
    clock++;
    scans = scans.filter(s => ++s.life < s.ttl);
    strands = strands.filter(s => ++s.life < s.ttl);
    frames = frames.filter(f => { f.life++; f.r += 9 * (1 - f.life / f.ttl) + 2; return f.life < f.ttl; });
    cells = cells.filter(c => clock < c.off);
    rockets = rockets.filter(r => {
      r.y += r.vy;
      if (r.y > r.top) return true;
      if (r.big) {
        rays(r.x, r.y, 8.5, r.c, true); rays(r.x, r.y, 4.5, r.c2, false);
        frames.push({ x: r.x, y: r.y, r: 10, c: "edge", life: 0, ttl: 30 });
        pixels(r.x, r.y, 12, { speed: 5, gravity: 0.07, ttl: [50, 90], size: [3, 5], colors: MIX.epic });
      } else rays(r.x, r.y, 6, r.c, false);
      if (soundOn) noise(0, r.big ? 0.8 : 0.5, r.big ? 0.1 : 0.08, r.big ? 520 : 700);
      return false;
    });
    parts = parts.filter(p => {
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
      p.x += p.vx; p.y += p.vy; p.life++;
      if (p.turn && p.life % p.turn === 0) p.rot = (p.rot + 1) % 8;
      return p.life < p.ttl && p.y < H + 40;
    });
  }
  function fillPiece(p) {
    const x = snap(p.x), y = snap(p.y), late = p.life > p.ttl * 0.75, s = Math.max(2, Math.round((late ? p.s / 2 : p.s)));   // late in life: one step smaller, then gone
    if (p.shape === "col") {   // a falling packet: three cells, the lead one largest
      ctx.fillStyle = C[p.c];
      ctx.fillRect(x, y, s, s);
      ctx.fillRect(x + 1, y - s - 4, s - 2, s - 2);
      ctx.fillRect(x + 2, y - 2 * s - 6, Math.max(2, s - 4), Math.max(2, s - 4));
      return;
    }
    if (p.shape === "px") { ctx.fillStyle = C[p.c]; ctx.fillRect(x - s / 2, y - s / 2, s, s); return; }
    if (p.shape === "plus") {   // the poster's crosshair mark: two thin bars, turning in 45-degree steps
      const a = s * 1.4, t = Math.max(1.5, s / 4);
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot * Math.PI / 4);
      ctx.fillStyle = C[p.c === "raised" ? "ink" : p.c]; ctx.fillRect(-a / 2, -t / 2, a, t); ctx.fillRect(-t / 2, -a / 2, t, a);
      ctx.restore(); return;
    }
    const w = p.shape === "bar" ? s * 1.6 : s, h = p.shape === "bar" ? Math.max(2, s / 2.2) : s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot * Math.PI / 4);
    ctx.fillStyle = C[p.c]; ctx.fillRect(-w / 2, -h / 2, w, h);
    if (p.c === "raised") { ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1); }
    ctx.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const s of scans) {
      const y = snap(s.life / s.ttl * (H + 32)), p = 8;
      ctx.fillStyle = C[s.c]; ctx.fillRect(0, y, W, 2);
      for (let k = 1; k <= 3; k++) {
        const yy = y - k * p;
        if (yy < 0) break;
        ctx.fillStyle = k === 1 ? C[s.c] : C.rule;
        for (let x = (k % 2) * p / 2; x < W; x += p) ctx.fillRect(x, yy, 2, 2);
      }
    }
    ctx.lineCap = "round";
    for (const s of strands) {   // a filament: the curve drawn up to how far it has grown, the junction a filled body
      const g = Math.min(1, s.life / s.grow), e = 1 - (1 - g) ** 3, late = s.life > s.ttl * 0.8;
      ctx.strokeStyle = C[s.c]; ctx.fillStyle = C[s.c]; ctx.lineWidth = late ? 1 : 1.6;
      ctx.beginPath(); ctx.moveTo(s.x, s.y);
      for (let k = 1; k <= 28; k++) {
        const t = e * k / 28, u = 1 - t;
        ctx.lineTo(u * u * s.x + 2 * u * t * s.cx + t * t * s.ex, u * u * s.y + 2 * u * t * s.cy + t * t * s.ey);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x, s.y, 3 + 7 * e, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of cells) if (clock >= c.on) { ctx.fillStyle = C[c.c]; ctx.fillRect(c.x - c.s / 2, c.y - c.s / 2, c.s, c.s); }
    ctx.lineWidth = 2;
    for (const f of frames) {
      const r = snap(f.r), a = Math.max(6, snap(r * 0.32)), x = snap(f.x), y = snap(f.y);
      ctx.strokeStyle = C[f.c];
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const cx = x + sx * r, cy = y + sy * r;
        ctx.moveTo(cx - sx * a, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy - sy * a);
      }
      ctx.stroke();
    }
    for (const r of rockets) {
      const y = snap(r.y);
      ctx.fillStyle = C[r.c]; ctx.fillRect(r.x - 2, y, 4, 12);
      ctx.fillStyle = C.ink3;
      for (let k = 1; k <= 4; k++) ctx.fillRect(r.x - 1, y + 12 + k * 8, 2, 4);   // a dotted trail, a wire behind the packet
    }
    for (const p of parts) fillPiece(p);
  }
  function run() {
    if (raf) return;
    prev = performance.now(); acc = 0; drawn = 0;
    const loop = now => {
      acc = Math.min(acc + now - prev, 250); prev = now;
      while (acc >= FRAME) { update(); acc -= FRAME; }
      const busy = parts.length || rockets.length || frames.length || cells.length || scans.length || strands.length;
      if (now - drawn >= STEP || !busy) { drawn = now; draw(); }
      if (busy) raf = requestAnimationFrame(loop);
      else { raf = 0; ctx.clearRect(0, 0, W, H); }
    };
    raf = requestAnimationFrame(loop);
  }

  // ---------- sound ----------
  function ac() {
    if (!actx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actx = new C();
      // a limiter in front of the speakers: the top rungs stack many notes, bangs and drums at once
      out = actx.createDynamicsCompressor();
      out.threshold.value = -8; out.knee.value = 4; out.ratio.value = 12; out.attack.value = 0.003; out.release.value = 0.2;
      out.connect(actx.destination);
    }
    if (actx.state !== "running") Promise.resolve(actx.resume()).catch(() => {});   // iOS also says "interrupted" after a call or the app in the background
    return actx;
  }
  function tone(f, t, d, { type = "sine", vol = 0.1, to = null } = {}) {
    const a = ac(); if (!a) return;
    const t0 = a.currentTime + t, o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d * 0.6);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(out);
    o.start(t0); o.stop(t0 + d + 0.02);
  }
  function noise(t, d, vol, freq, type = "lowpass") {
    const a = ac(); if (!a) return;
    const len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = type; f.frequency.value = freq; g.gain.value = vol;
    src.connect(f).connect(g).connect(out);
    src.start(a.currentTime + t);
  }
  // A pentatonic scale from C5: step i of a day plays note i, so the sound climbs as the day fills up.
  const PENTA = [0, 2, 4, 7, 9];
  const hz = i => 523.25 * 2 ** ((PENTA[i % 5] + 12 * Math.floor(i / 5)) / 12);
  // building blocks of the bigger sounds: a bass drum, a snare roll that swells, a held major chord, notes running up
  const boom = (t, vol = 0.2) => { tone(120, t, 0.5, { vol, to: 45 }); noise(t, 0.22, 0.05, 260); };
  const roll = (t, d, vol = 0.05) => { for (let s = 0; s < d; s += 0.055) noise(t + s, 0.05, vol * (0.35 + 0.65 * s / d), 4200); };
  const chord = (t, d, root = 523.25, vol = 0.045) => [1, 1.26, 1.498, 2].forEach(m => tone(root * m, t, d, { type: "triangle", vol }));
  const glitter = (t, from = 7, n = 8) => { for (let j = 0; j < n; j++) tone(hz(Math.min(from, 9) + j % 7), t + j * 0.045, 0.12, { vol: 0.028 }); };
  // a run of right answers: 1 up to 3, 5, 10, 15, 20, 30 in a row
  const tier = n => n >= 30 ? 6 : n >= 20 ? 5 : n >= 15 ? 4 : n >= 10 ? 3 : n >= 5 ? 2 : 1;
  const SND = {
    pop: () => tone(R(520, 700), 0, 0.09, { to: 1300, vol: 0.07 }),
    note: (i = 0) => { const k = Math.max(0, Math.min(i, 12)); tone(hz(k), 0, 0.14, { type: "triangle", vol: 0.09 }); tone(hz(k) * 2, 0.045, 0.2, { vol: 0.035 }); },
    chime: () => { tone(880, 0, 0.3, { vol: 0.08 }); tone(1318.5, 0.09, 0.4, { vol: 0.07 }); },
    block: () => { [0, 2, 3, 5].forEach((k, j) => tone(hz(k), j * 0.075, j === 3 ? 0.55 : 0.17, { type: "triangle", vol: 0.09 })); tone(hz(5) * 2, 0.3, 0.5, { vol: 0.03 }); },
    unlock: () => { tone(440, 0, 0.28, { to: 880, vol: 0.07 }); tone(1318.5, 0.22, 0.5, { vol: 0.07 }); tone(1760, 0.34, 0.5, { vol: 0.04 }); },
    // a right answer: a bright rising pair that climbs a note with each answer of the run (n = the run now)
    right: (n = 1) => {
      const f = hz(Math.max(0, Math.min(n - 1, 10))) / 2;
      tone(f, 0, 0.1, { type: "triangle", vol: 0.08 }); tone(f * 1.5, 0.065, 0.2, { type: "triangle", vol: 0.08 });
      if (n >= 5) tone(f * 3, 0.1, 0.22, { vol: 0.03 });
    },
    // a wrong answer: a low "uh-oh" going down
    wrong: () => { tone(233, 0, 0.14, { type: "square", vol: 0.032, to: 208 }); tone(175, 0.13, 0.3, { type: "square", vol: 0.032, to: 131 }); },
    // a run of 3 or more broken: a crack and a falling whistle after the "uh-oh"
    broke: () => { noise(0.42, 0.3, 0.05, 2500, "highpass"); tone(880, 0.42, 0.55, { vol: 0.045, to: 110 }); },
    // a streak mark: the arpeggio grows with the tier, then glitter, a drum and a chord
    combo: (n = 3) => {
      const t = tier(n), k = Math.min(Math.floor(n / 3), 5), m = 3 + Math.min(t, 4);
      for (let j = 0; j < m; j++) tone(hz(k + j), j * 0.07, j === m - 1 ? 0.35 : 0.1, { type: "triangle", vol: 0.08 });
      if (t >= 2) glitter(m * 0.07, k + 5, 3 + t);
      if (t >= 3) { boom(0, 0.14 + t * 0.02); chord(m * 0.07, 0.5 + t * 0.15, hz(k) / 2, 0.035); }
      if (t >= 5) { roll(0.5, 0.4, 0.04); boom(0.9, 0.22); chord(0.9, 1.1, hz(k), 0.035); }
    },
    fanfare: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, i === 3 ? 0.7 : 0.22, { type: "triangle", vol: 0.1 })),
    finale: () => {
      SND.fanfare();
      [523.25, 659.25, 783.99].forEach(f => tone(f, 0.55, 1.2, { type: "triangle", vol: 0.06 }));
      tone(1046.5, 0.55, 1.3, { vol: 0.06 });
    },
    // the top rungs: a day, a week, the whole plan. Each longer and fuller than the one before.
    day: () => {
      boom(0); SND.fanfare();
      chord(0.5, 1.5); tone(130.81, 0.5, 1.5, { type: "triangle", vol: 0.08 }); boom(0.5, 0.16);
      glitter(0.6, 7, 9);
    },
    week: () => {
      roll(0, 0.9);
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.9 + i * 0.1, i === 4 ? 0.9 : 0.2, { type: "triangle", vol: 0.1 }));
      boom(0.9, 0.24); boom(1.4, 0.2);
      chord(1.4, 2); tone(130.81, 1.4, 2, { type: "triangle", vol: 0.09 }); tone(65.41, 1.4, 2, { type: "triangle", vol: 0.07 });
      glitter(1.5, 7, 11); glitter(2.3, 9, 8);
    },
    all: () => {
      roll(0, 1.3, 0.06); boom(1.3, 0.26);
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => tone(f, 1.3 + i * 0.12, i === 7 ? 1.2 : 0.22, { type: "triangle", vol: 0.1 }));
      boom(2.26, 0.24);
      chord(2.26, 2.6, 523.25, 0.05); tone(130.81, 2.26, 2.6, { type: "triangle", vol: 0.1 }); tone(65.41, 2.26, 2.6, { type: "triangle", vol: 0.08 });
      glitter(2.4, 7, 12); glitter(3.2, 9, 10);
      roll(3.9, 0.7, 0.05); boom(4.6, 0.26);
      chord(4.6, 2.8, 783.99, 0.04); chord(4.6, 2.8, 523.25, 0.04); glitter(4.7, 10, 12);
    },
    timer: () => { tone(784, 0, 0.35, { vol: 0.09 }); tone(1046.5, 0.25, 0.5, { vol: 0.08 }); tone(784, 0.8, 0.35, { vol: 0.09 }); tone(1046.5, 1.05, 0.5, { vol: 0.08 }); },
    // the break has run past 10 minutes: an insistent double knock, three times
    nag: () => { for (let k = 0; k < 3; k++) { tone(988, k * 0.42, 0.12, { type: "square", vol: 0.05 }); tone(740, k * 0.42 + 0.14, 0.16, { type: "square", vol: 0.05 }); } },
    level: () => { [0, 2, 4, 5, 7].forEach((k, j) => tone(hz(k + 5), j * 0.07, j === 4 ? 0.6 : 0.15, { type: "triangle", vol: 0.09 })); tone(hz(12) * 2, 0.36, 0.7, { vol: 0.035 }); },
    clean: () => { tone(660, 0, 0.15, { vol: 0.06 }); tone(990, 0.08, 0.25, { vol: 0.06 }); },
    miss: () => tone(330, 0, 0.22, { type: "triangle", vol: 0.06, to: 220 })
  };
  const sound = (n, arg) => { if (soundOn && SND[n]) SND[n](arg); };

  // ---------- banner (a panel in the middle of the screen) and toast (one system line above the buttons) ----------
  // The banner is a Datum panel: a mono label line with the time, the title as a bracketed display word,
  // the facts as a terminal line. The top rungs (day, week, all) stay up longer, carry a dot-matrix code that switches
  // on dot by dot, wipe in from the top in steps and dim the page around them (the veil, an effect: only with motion).
  // Each is bigger than the one below: day a raised panel, week the panel in the other theme, all the one signal block.
  // Returns how long the banner stays, so what comes next can wait for it.
  const BANNER_MS = { all: 9000, week: 6500, day: 4600, block: 2300, info: 2600 };
  const TOP = { day: 1, week: 1, all: 1 };
  const hhmm = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  function banner(title, sub = "", kind = "day", icon = "") {
    if (!bEl) { bEl = document.createElement("div"); bEl.setAttribute("role", "status"); }
    if (!vEl) { vEl = document.createElement("div"); vEl.setAttribute("aria-hidden", "true"); }
    if (bEl.parentNode !== host()) host().appendChild(bEl);
    const ms = BANNER_MS[kind] || 3200, veil = TOP[kind] && motion();
    if (veil && vEl.parentNode !== host()) host().appendChild(vEl);
    vEl.className = "fx-veil k-" + kind;
    bEl.className = "fx-banner k-" + kind + (kind === "week" ? " dm-invert" : "");
    icon = plain(icon);
    // a top rung always carries its mark: the caller's dot-matrix code, or a plain square
    if (!icon && TOP[kind]) icon = "■";
    bEl.innerHTML = `<div class="b-l"><span>${kind === "info" ? "Notice" : "Log"}</span><span class="b-tm">${hhmm()}</span></div>` +
      `${icon ? `<div class="b-i" aria-hidden="true">${icon}</div>` : ""}<div class="b-t">${plain(title)}</div>${sub ? `<div class="b-s">${plain(sub)}</div>` : ""}`;
    void bEl.offsetWidth;
    bEl.classList.add("show");
    if (veil) vEl.classList.add("show");
    clearTimeout(bT);
    bT = setTimeout(() => { bEl.classList.remove("show"); vEl.classList.remove("show"); }, ms);
    return ms;
  }
  // kind: "" (plain), "half" or "combo" (live: a signal cap), "warn" (the alert cap)
  function toast(html, kind = "") {
    if (!tEl) { tEl = document.createElement("div"); tEl.setAttribute("role", "status"); }
    if (tEl.parentNode !== host()) host().appendChild(tEl);
    tEl.className = "fx-toast" + (kind ? " k-" + kind : "");
    tEl.innerHTML = `<span class="t-cap" aria-hidden="true"></span><span class="t-b">${plain(html)}</span>`;
    void tEl.offsetWidth;
    tEl.classList.add("show");
    clearTimeout(tT);
    tT = setTimeout(() => tEl.classList.remove("show"), 2100);
  }
  // A badge drops in at the top of the screen: right answers in a row, a record, a level, a badge earned.
  // Two at most are on screen; the rest wait their turn, so each one is seen for its full three seconds.
  // tier: bronze | silver | gold | epic | level (the fill of its code cell says which). icon: a short mono code
  // ("R05", "L07"). Like the banner, it carries information, so it shows with effects off too (without the burst).
  function badge(icon, title, sub = "", tier = "gold") {
    bdQ.push([icon, title, sub, tier]);
    bdNext();
  }
  function bdNext() {
    if (!bdWrap) { bdWrap = document.createElement("div"); bdWrap.className = "fx-badges"; bdWrap.setAttribute("role", "status"); }
    // the badges on screen belonged to the dialog that has closed: don't bring them back over the page
    if (bdWrap.parentNode !== host()) { bdWrap.replaceChildren(); host().appendChild(bdWrap); }
    while (bdQ.length && bdWrap.querySelectorAll(".fx-badge:not(.out)").length < 2) bdShow(...bdQ.shift());
  }
  function bdShow(icon, title, sub, tier) {
    const el = document.createElement("div");
    el.className = "fx-badge k-" + tier + (tier === "epic" ? " dm-invert" : "");
    el.innerHTML = `<span class="bd-i" aria-hidden="true">${plain(icon) || "■"}</span><span class="bd-x"><span class="bd-t">${plain(title)}</span>${sub ? `<span class="bd-s">${plain(sub)}</span>` : ""}</span>`;
    bdWrap.appendChild(el);
    // a dot-matrix burst round the code cell once the badge has landed
    setTimeout(() => {
      if (!el.isConnected || !motion()) return;
      ensure();
      const p = center(el.querySelector(".bd-i")), big = tier === "epic" || tier === "level";
      frame(p.x, p.y, "edge", 0, 20);
      grid(p.x, p.y, big ? 4 : 3, big ? MIX.epic : MIX.sig, 0, 8);
      pixels(p.x, p.y, big ? 26 : 14, { speed: 6.5, gravity: 0.14, ttl: [30, 60], size: [3, 5], colors: big ? MIX.epic : MIX.sig });
    }, 420);
    setTimeout(() => { el.classList.add("out"); bdNext(); }, 3000);
    setTimeout(() => el.remove(), 3500);
  }
  // the heat of a run of n right answers: 1 up to 3, 5, 10, 15, 20, 30 in a row
  const heat = n => (tier(n) >= 5 ? MIX.epic : tier(n) >= 2 ? MIX.hot : MIX.sig);

  return {
    // one step done. n = how many steps of the day are done now (the note climbs); big = a long step such as a lab or a lecture
    step(el, { n = 1, big = false } = {}) {
      sound("note", n - 1);
      if (!motion()) return;
      ensure();
      const p = center(el);
      frame(p.x, p.y, "edge");
      grid(p.x, p.y, big ? 5 : 3);
      burst(p.x, p.y, big ? 70 : 36, { speed: big ? 10.5 : 7.5, spread: Math.PI * 1.3, ttl: [40, 80], size: [3, 7] });
      if (big) { frame(p.x, p.y, "ink", 140); pixels(p.x, p.y, 16, { speed: 9 }); rocket(R(W * 0.3, W * 0.7), 180); }
    },
    // a block of the day done (a lecture, its labs, a build…)
    block(el) {
      sound("block");
      if (!motion()) return;
      ensure();
      const p = center(el);
      frame(p.x, p.y, "edge"); frame(p.x, p.y, "ink", 160);
      grid(p.x, p.y, 6, MIX.base);
      pixels(p.x, p.y, 28, { speed: 11 });
      cannons(48);
      rocket(R(W * 0.2, W * 0.45), 260); rocket(R(W * 0.55, W * 0.8), 520);
    },
    // every step of the day done: the quiz is open
    quizOpen() {
      sound("unlock");
      if (!motion()) return;
      ensure();
      const x = W / 2, y = H * 0.42;
      frame(x, y, "edge"); frame(x, y, "ink", 150); frame(x, y, "edge", 300);
      grid(x, y, 7, MIX.sig, 80);
      pixels(x, y, 34, { speed: 10, colors: MIX.epic });
    },
    // a small dot-matrix burst: a right answer, a self-check you knew. No sound of its own.
    sparkle(el) {
      if (!motion()) return;
      ensure();
      const p = center(el);
      grid(p.x, p.y, 2, MIX.sig, 0, 8);
      pixels(p.x, p.y, 12, { speed: 5.5, ttl: [24, 46], size: [3, 5], gravity: 0.1 });
    },
    // A right answer in a quiz (not the mock exam). n = right answers in a row now: the note climbs with it and the
    // burst grows and heats up. el = the verdict, meter = the combo meter in the quiz header (it gets brackets).
    right(n, el, meter) {
      sound("right", n);
      if (!motion()) return;
      ensure();
      const p = center(el);
      grid(p.x, p.y, Math.min(2 + (n >> 1), 5), heat(n), 0, 8);
      pixels(p.x, p.y, Math.min(12 + n * 2, 34), { speed: 5.5 + Math.min(n, 10) * 0.25, ttl: [24, 50], size: [3, 6], gravity: 0.1, colors: heat(n) });
      if (!meter) return;
      const m = center(meter);
      frame(m.x, m.y, n >= 5 ? "sig" : "edge", 0, 18);
      if (n >= 3) burst(m.x, m.y, 8 + n, { speed: 4, gravity: 0.06, ttl: [40, 70], size: [3, 4], shapes: ["px"], colors: heat(n) });
    },
    // A wrong answer in a quiz. was = the run it ended: from 3 on, the meter cracks and its pieces fall (in alert).
    wrong(was, meter) {
      sound("wrong");
      if (was >= 3) sound("broke");
      if (!motion() || was < 3 || !meter) return;
      ensure();
      const m = center(meter);
      burst(m.x, m.y, Math.min(14 + was * 2, 50), { speed: 4.5, gravity: 0.3, ttl: [30, 60], size: [3, 7], shapes: ["sq", "bar", "px"], colors: MIX.broke });
    },
    // A streak mark (3, 5, 10, 15, 20, 25, 30 in a row): the burst grows with the tier. From 5: corner bursts;
    // from 10: the quiz's edge steps out, a scan line, falling packets and rising ones; from 20 the epic mix.
    combo(n, el, meter) {
      sound("right", n);
      setTimeout(() => sound("combo", n), 120);
      if (!motion()) return;
      ensure();
      const t = tier(n), p = center(el), m = meter ? center(meter) : p, cols = heat(n);
      frame(p.x, p.y, "edge"); frame(m.x, m.y, t >= 5 ? "sig" : "ink", 90);
      grid(p.x, p.y, Math.min(3 + t, 9), cols, 0, 9);
      pixels(p.x, p.y, Math.min(16 + n * 2, 64), { speed: 7.5 + t, colors: cols });
      burst(m.x, m.y, 18 + t * 8, { speed: 5 + t, angle: Math.PI / 2, spread: Math.PI * 1.1, ttl: [40, 80], size: [3, 7], colors: cols });
      if (t >= 2) cannons(20 + t * 14, cols);
      if (t >= 3) {
        glow(t >= 5 ? "var(--signal)" : "var(--ink)");
        scan(0, t >= 5 ? "sig" : "edge", 34);
        rain(10 + t * 8, cols);
        for (let i = 0; i < t - 1; i++) rocket(R(W * 0.15, W * 0.85), 150 + i * 220, t >= 5);
      }
    },
    // a quiz passed with every answer right
    perfect() {
      sound("finale");
      if (!motion()) return;
      ensure();
      scan(0, "sig", 36);
      grid(W / 2, H * 0.35, 9, MIX.epic, 120, 12);
      rain(70, MIX.epic);
      cannons(120, MIX.epic);
      for (let i = 0; i < 6; i++) rocket(R(W * 0.12, W * 0.88), 200 + i * 240);
    },
    // a quiz passed (the day's celebration follows when the results are closed)
    pass() {
      sound("fanfare");
      if (!motion()) return;
      ensure();
      cannons(70);
      grid(W / 2, H * 0.35, 6, MIX.sig, 0, 12);
      pixels(W / 2, H * 0.35, 30, { speed: 11 });
      rocket(R(W * 0.25, W * 0.75), 250);
    },
    tick(el) { sound("pop"); if (!motion()) return; ensure(); const p = center(el); burst(p.x, p.y, 22, { speed: 6, spread: Math.PI * 1.2, ttl: [35, 65], size: [3, 6] }); },
    group(el) { sound("chime"); if (!motion()) return; ensure(); const p = center(el); grid(p.x, p.y, 4); burst(p.x, p.y, 70, { speed: 10, spread: Math.PI * 1.4, ttl: [50, 90] }); },
    // The top rungs, much bigger than a passed or perfect quiz: scan lines, brackets and a dot-matrix burst from the
    // banner, waves of corner bursts, columns from the bottom, falling packets in waves and big rising packets.
    // Each rung longer and fuller than the one below.
    day() {
      sound("day");
      if (!motion()) return;
      ensure();
      const x = W / 2, y = H * 0.38;
      scan(0, "edge", 40);
      frame(x, y, "edge"); frame(x, y, "ink", 160); frame(x, y, "edge", 320);
      filaments(x, y, 5, 80);
      grid(x, y, 10, MIX.base, 120, 12);
      pixels(x, y, 50, { speed: 14 });
      for (let k = 0; k < 3; k++) later(k * 600, () => cannons(150));
      rain(60); later(1400, () => rain(40));
      fountain(x, 2400, 300);
      for (let i = 0; i < 10; i++) rocket(R(W * 0.12, W * 0.88), 250 + i * 260, true);
    },
    week() {
      sound("week");
      if (!motion()) return;
      ensure();
      const x = W / 2, y = H * 0.38;
      scan(0, "edge", 40); scan(1500, "sig", 40);
      ["edge", "ink", "sig", "edge"].forEach((c, k) => frame(x, y, c, k * 170, 30));
      filaments(x, y, 7, 80); filaments(W * 0.18, H * 0.8, 4, 1500); filaments(W * 0.82, H * 0.8, 4, 1500);
      grid(x, y, 13, MIX.hot, 120, 12); grid(x, y, 8, MIX.epic, 1500, 14);
      pixels(x, y, 80, { speed: 16, colors: MIX.hot });
      for (let k = 0; k < 5; k++) later(k * 560, () => cannons(170, MIX.hot));
      for (let k = 0; k < 3; k++) later(k * 1100, () => rain(60, MIX.hot));
      fountain(W * 0.2, 3800, 200, MIX.hot); fountain(W * 0.8, 3800, 200, MIX.hot);
      for (let i = 0; i < 14; i++) rocket(R(W * 0.08, W * 0.92), 200 + i * 220, true);
      for (let i = 0; i < 6; i++) rocket(W * (0.1 + i * 0.16), 3600, true);   // the closing volley
    },
    all() {
      sound("all");
      setTimeout(() => sound("finale"), 7200);
      if (!motion()) return;
      ensure();
      const x = W / 2, y = H * 0.38;
      scan(0, "sig", 44); scan(2300, "edge", 44); scan(4600, "sig", 44);
      ["edge", "sig", "ink", "edge", "sig", "ink", "edge", "sig", "ink"].forEach((c, k) => frame(x, y, c, k * 150, 32));
      for (const [at, fx, fy, n] of [[80, x, y, 9], [2300, W * 0.15, H * 0.75, 5], [2300, W * 0.85, H * 0.75, 5], [4600, x, y, 9]]) filaments(fx, fy, n, at);
      grid(x, y, 16, MIX.epic, 120, 12); grid(x, y, 12, MIX.sig, 2300, 14); grid(x, y, 16, MIX.epic, 4600, 12);
      pixels(x, y, 110, { speed: 18, colors: MIX.epic });
      for (let k = 0; k < 8; k++) later(k * 600, () => cannons(180, MIX.epic));
      for (let k = 0; k < 5; k++) later(k * 1200, () => rain(60, MIX.epic));
      fountain(W * 0.15, 6000, 200, MIX.epic); fountain(x, 6000, 600, MIX.epic); fountain(W * 0.85, 6000, 200, MIX.epic);
      for (let i = 0; i < 26; i++) rocket(R(W * 0.06, W * 0.94), 150 + i * 210, true);
      for (const at of [2300, 4600, 7200]) for (let i = 0; i < 8; i++) rocket(W * (0.07 + i * 0.123), at, true);   // volleys on the beats
    },
    small(el) { sound("clean"); if (!motion()) return; ensure(); const p = center(el); grid(p.x, p.y, 3); burst(p.x, p.y, 40, { speed: 8, spread: Math.PI * 1.3 }); },
    banner, toast, badge, sound,
    unlock() { if (soundOn) ac(); },
    // fx-off on <html> stops the decorative CSS loops too (the combo meter's pulse); prefers-reduced-motion stops them all
    set(o) { if ("fx" in o) { fxOn = !!o.fx; document.documentElement.classList.toggle("fx-off", !fxOn); } if ("sound" in o) soundOn = !!o.sound; }
  };
})();
