/* Datum - the one script. Dot-matrix characters, dot charts, dials, real barcodes, a halftone sphere and the backdrop,
   all as SVG strings, plus the little page glue (backdrops, a count-up, theme and motion switches).
   Browser: window.Datum, and it wires the page by itself on load.  Node: require('./datum.js').  No dependencies.
   Colour comes from bundle.css (.dm-dot-*, .dm-ht, .dm-bd-*), so everything follows the theme. */
(function (root) {
  'use strict';

  var FONT = {
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
    '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
    '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
    ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
    '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####']
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }
  function dot(cls, cx, cy, r, i) {
    return '<circle class="' + cls + '"' + ' cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
  }

  /* dotNumeral('03', {pitch: 10}) - digits, capitals A-Z and % / . : - on a 5x7 matrix. Lower case is drawn as capitals.
     opts: pitch (px between dot centres, default 8), off (draw unlit dots, default true), label (aria-label). */
  function dotNumeral(text, opts) {
    opts = opts || {};
    var p = opts.pitch || 8, r = +(p * 0.36).toFixed(2), off = opts.off !== false;
    var chars = String(text).toUpperCase().split(''), out = [];
    chars.forEach(function (ch, i) {
      var g = FONT[ch] || FONT[' '];
      for (var y = 0; y < 7; y++) for (var x = 0; x < 5; x++) {
        var on = g[y].charAt(x) === '#';
        if (on || off) out.push(dot(on ? 'dm-dot-on' : 'dm-dot-off', (i * 6 + x) * p + p / 2, y * p + p / 2, r, on ? i * 6 + x + y : null));
      }
    });
    var w = (chars.length * 6 - 1) * p, h = 7 * p;
    return '<svg class="dm-dotnum" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
      '" role="img" aria-label="' + esc(opts.label || text) + '">' + out.join('') + '</svg>';
  }

  /* dotRidge([7.5, 7.75, 2.2, 0, ...], {max: 8, mark: 2}) - one dot column group per value.
     opts: rows (default 10), max (default: largest value), pitch (8), colWidth (dots per value, 3),
     gap (empty dot columns between values, 1), mark (index drawn in .dm-dot-live), label (aria-label). */
  function dotRidge(values, opts) {
    opts = opts || {};
    var rows = opts.rows || 10, p = opts.pitch || 8, cw = opts.colWidth || 3;
    var gap = opts.gap == null ? 1 : opts.gap, r = +(p * 0.36).toFixed(2);
    var max = opts.max || Math.max.apply(null, values.concat([1])), out = [];
    values.forEach(function (v, i) {
      var lit = v > 0 ? Math.max(1, Math.round(Math.min(v, max) / max * rows)) : 0;
      for (var c = 0; c < cw; c++) for (var y = 0; y < rows; y++) {
        var on = rows - y <= lit;
        out.push(dot(on ? (i === opts.mark ? 'dm-dot-live' : 'dm-dot-on') : 'dm-dot-off',
          (i * (cw + gap) + c) * p + p / 2, y * p + p / 2, r, on ? i * 2 + (rows - y) : null));
      }
    });
    var w = (values.length * (cw + gap) - gap) * p, h = rows * p;
    return '<svg class="dm-ridge" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
      '" role="img" aria-label="' + esc(opts.label || 'Dot chart') + '">' + out.join('') + '</svg>';
  }

  /* ---------- Barcode (Code 39) ---------- */
  /* Built from the code's own rule, not a lookup table: each character is five bars and four spaces,
     the bars carry a two-of-five pattern and the position of the one wide space names the group. */
  var C39_BARS = ['10001', '01001', '11000', '00101', '10100', '01100', '00011', '10010', '01010', '00110'];
  var C39_GROUPS = [['1234567890', '0100'], ['ABCDEFGHIJ', '0010'], ['KLMNOPQRST', '0001'], ['UVWXYZ-. *', '1000']];
  var C39 = { '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010' };
  C39_GROUPS.forEach(function (g) {
    g[0].split('').forEach(function (ch, i) {
      var b = C39_BARS[i], sp = g[1], out = '';
      for (var k = 0; k < 5; k++) out += b.charAt(k) + (k < 4 ? sp.charAt(k) : '');
      C39[ch] = out;
    });
  });

  /* barcode('SAA-C03-D03', {height: 24}) - a real, scannable Code 39 barcode of the text.
     Accepts A-Z 0-9 space - . $ / + %; lower case is raised, anything else becomes '-'.
     opts: height (px, default 24), unit (width of a narrow bar in px, default 1), label (aria-label). */
  function barcode(text, opts) {
    opts = opts || {};
    var u = opts.unit || 1, h = opts.height || 24, wide = 3, x = 10 * u, out = '';
    var clean = String(text).toUpperCase().replace(/[^A-Z0-9 \-.$\/+%]/g, '-');
    ('*' + clean + '*').split('').forEach(function (ch) {
      var p = C39[ch];
      for (var k = 0; k < 9; k++) {
        var w = (p.charAt(k) === '1' ? wide : 1) * u;
        if (k % 2 === 0) out += '<rect x="' + x + '" y="0" width="' + w + '" height="' + h + '"/>';
        x += w;
      }
      x += u;   /* gap between characters */
    });
    var W = x - u + 10 * u;
    return '<svg class="dm-barcode" viewBox="0 0 ' + W + ' ' + h + '" width="' + W + '" height="' + h + '" role="img" aria-label="' +
      esc(opts.label || 'Barcode: ' + clean) + '" data-code="' + esc(clean) + '">' + out + '</svg>';
  }

  /* ---------- Dial ---------- */
  /* dial(68, {target: 72}) - a 270-degree ring of ticks, lit clockwise up to the value.
     opts: max (100), ticks (40), size (px, 112), target (a longer tick at that value), label (aria-label). */
  function dial(value, opts) {
    opts = opts || {};
    var max = opts.max || 100, n = opts.ticks || 40, size = opts.size || 112, c = size / 2;
    var ro = c - 7, ri = ro - 10, lit = Math.round(Math.max(0, Math.min(value, max)) / max * n), out = '';
    function at(frac, r) { var a = (135 + frac * 270) * Math.PI / 180; return n2(c + Math.cos(a) * r) + ' ' + n2(c + Math.sin(a) * r); }
    for (var i = 0; i < n; i++) {
      var f = i / (n - 1), cls = i < lit ? (i === lit - 1 ? 'dm-tick-live' : 'dm-tick-on') : 'dm-tick-off';
      out += '<path class="' + cls + '"' + ' d="M' + at(f, ri) + 'L' + at(f, ro) + '"/>';
    }
    if (opts.target != null) {
      var tf = Math.max(0, Math.min(opts.target, max)) / max;
      out += '<path class="dm-tick-target" d="M' + at(tf, ri - 6) + 'L' + at(tf, ro + 6) + '"/>';
    }
    return '<svg class="dm-dial__ring" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' +
      esc(opts.label || value + ' of ' + max) + '">' + out + '</svg>';
  }

  /* ---------- Shared ---------- */
  function hash(s) {
    s = String(s); var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function n2(v) { return +v.toFixed(2); }
  function px(v) { return Math.round(v) + 0.5; }
  function pol(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [n2(cx + Math.cos(a) * r), n2(cy + Math.sin(a) * r)]; }
  function circle(cls, cx, cy, r, extra) { return '<circle class="' + cls + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"' + (extra || '') + '/>'; }
  function diamond(cx, cy, r) { return '<path class="dm-bd-mark" d="M' + (cx - r) + ' ' + cy + 'L' + cx + ' ' + (cy - r) + 'L' + (cx + r) + ' ' + cy + 'L' + cx + ' ' + (cy + r) + 'Z"/>'; }
  function drift(cx, cy, period, from, to, inner) {
    var st = 'transform-origin:' + cx + 'px ' + cy + 'px;--dm-period:' + Math.round(period) + 's';
    if (from != null) st += ';--dm-from:' + n2(from) + 'deg;--dm-to:' + n2(to) + 'deg;animation-delay:' + Math.round(period * -0.58) + 's';
    return '<g class="dm-bd-drift" style="' + st + '">' + inner + '</g>';
  }

  /* ---------- Sphere ---------- */
  /* sphere({size: 320, pitch: 7, light: [-0.55, -0.5]}) - a ball shaded by dot size on a 45-degree screen.
     The subject of a cover, a poster or a hero when there is no photograph.
     opts: size (px, 320), pitch (px between dots, 7), light (x and y of the light, each -1 to 1), label (aria-label). */
  function sphere(opts) {
    opts = opts || {};
    var S = opts.size || 320, p = opts.pitch || 7, c = S / 2, rad = c - 1, levels = 6, paths = [], i;
    var L = opts.light || [-0.55, -0.5], lz = Math.sqrt(Math.max(0, 1 - L[0] * L[0] - L[1] * L[1]));
    for (i = 0; i < levels; i++) paths.push('');
    var d = p / Math.SQRT2, n = Math.ceil(S / d);
    for (var u = -n; u <= n; u++) for (var v = -n; v <= n; v++) {
      var x = (u - v) * d, y = (u + v) * d, rr = (x * x + y * y) / (rad * rad);
      if (rr >= 0.985) continue;
      var z = Math.sqrt(1 - rr), lam = x / rad * L[0] + y / rad * L[1] + z * lz;
      var k = Math.round(Math.pow(Math.max(0, lam), 0.85) * levels);
      if (k > 0) paths[k - 1] += 'M' + n2(c + x) + ' ' + n2(c + y) + 'h0';
    }
    var out = '';
    for (i = 0; i < levels; i++) if (paths[i]) out += '<path class="dm-ht" stroke-width="' + n2((i + 1) / levels * p * 0.9) + '" d="' + paths[i] + '"/>';
    return '<svg class="dm-sphere" viewBox="0 0 ' + S + ' ' + S + '" width="' + S + '" height="' + S + '" role="img" aria-label="' +
      esc(opts.label || 'Sphere') + '"><circle class="dm-ht-limb" cx="' + c + '" cy="' + c + '" r="' + rad + '"/>' + out + '</svg>';
  }

  /* ---------- Backdrop ---------- */
  /* One figure per view: large, precise, low in contrast, and still. Each figure is a composition, not a scatter:
     its parts are placed by rule and related by one ratio (0.618). The seed only turns or shifts the composition.
       orbit    concentric rings about a centre, axes, one 45-degree diagonal, a ticked quadrant, one satellite
       horizon  the limb of a body rising from below, its light, one orbit, a few stars
       terrain  a ridge plotted in dots
       grid     a fine grid with registration marks, and nothing else */
  var PHI = 0.618;

  function figOrbit(W, H, cx, cy, s, R, id, o) {
    var R0 = Math.round(0.44 * Math.min(W, H) * s), r1 = Math.round(R0 * PHI * PHI), r2 = Math.round(R0 * PHI), r4 = Math.round(R0 / PHI);
    var q = Math.floor(R() * 4), a0 = (o.turn == null ? q : o.turn) * 90, dg = a0 + 225, sat = a0 + 123 + R() * 24, lv = a0 + 292 + R() * 36, b = '', t, a, p, e;
    var defs = '<radialGradient id="' + id + 'l" gradientUnits="userSpaceOnUse" cx="' + cx + '" cy="' + cy + '" r="' + r4 + '"><stop class="dm-bd-l0" offset="0"/><stop class="dm-bd-l1" offset="1"/></radialGradient>';
    if (o.glow !== false) b += '<circle fill="url(#' + id + 'l)" cx="' + cx + '" cy="' + cy + '" r="' + r4 + '"/>';
    b += '<path class="dm-bd-line" shape-rendering="crispEdges" d="M0 ' + px(cy) + 'H' + W + 'M' + px(cx) + ' 0V' + H + '"/>';
    b += circle('dm-bd-fine', cx, cy, r4) + circle('dm-bd-line', cx, cy, R0) + circle('dm-bd-line dm-bd-dash', cx, cy, r2) + circle('dm-bd-line', cx, cy, r1);
    for (t = '', a = 0; a <= 90; a += 3) { p = pol(cx, cy, R0, a0 + a); e = pol(cx, cy, R0 + (a % 15 === 0 ? 10 : 5), a0 + a); t += 'M' + p[0] + ' ' + p[1] + 'L' + e[0] + ' ' + e[1]; }
    b += '<path class="dm-bd-mark" d="' + t + '"/>';
    p = pol(cx, cy, r1, dg); e = pol(cx, cy, r4, dg);
    b += '<path class="dm-bd-line" d="M' + p[0] + ' ' + p[1] + 'L' + e[0] + ' ' + e[1] + '"/>';
    p = pol(cx, cy, R0, dg); b += circle('dm-bd-node', p[0], p[1], 2.5);
    p = pol(cx, cy, r2, dg); b += circle('dm-bd-ring', p[0], p[1], 4);
    p = pol(cx, cy, R0, sat); b += circle('dm-bd-line', p[0], p[1], Math.round(R0 * Math.pow(PHI, 4))) + circle('dm-bd-node', p[0], p[1], 1.5);
    b += diamond(cx, cy, 5);
    p = pol(cx, cy, R0, lv);
    b += drift(cx, cy, 2 * Math.PI * R0 / 6, null, null, circle('dm-bd-live-ring', p[0], p[1], 8) + circle('dm-bd-live', p[0], p[1], 3));
    return { defs: defs, body: b };
  }

  function figHorizon(W, H, cx, cy, s, R, id, o) {
    var Rp = Math.round(1.15 * Math.max(W, H * 1.2) * s), py = cy + Rp, g = Math.round(0.26 * H), Ro = Rp + Math.round(0.11 * H), b = '', i;
    var defs = '<radialGradient id="' + id + 'g" gradientUnits="userSpaceOnUse" cx="' + cx + '" cy="' + py + '" r="' + (Rp + g) + '"><stop class="dm-bd-g0" offset="' + n2(Rp / (Rp + g)) + '"/><stop class="dm-bd-g1" offset="1"/></radialGradient>' +
      '<radialGradient id="' + id + 'r" gradientUnits="userSpaceOnUse" cx="' + cx + '" cy="' + py + '" r="' + Rp + '"><stop class="dm-bd-g1" offset="' + n2(1 - 0.09 * H / Rp) + '"/><stop class="dm-bd-g0" offset="1"/></radialGradient>';
    function limbY(x) { var dx = x - cx; return Math.abs(dx) >= Rp ? H : py - Math.sqrt(Rp * Rp - dx * dx); }
    var n = Math.round(30 * (o.density == null ? 1 : o.density)), sizes = [0.6, 0.6, 0.9, 0.9, 1.3];
    for (i = 0; i < n; i++) {
      var x = n2(R() * W), y = n2(R() * R() * (limbY(x) - g * 0.5)), r = sizes[Math.floor(R() * sizes.length)], op = n2(0.3 + R() * 0.55);
      if (y > 4) b += '<circle class="dm-bd-star" cx="' + x + '" cy="' + y + '" r="' + r + '" opacity="' + op + '"/>';
    }
    if (o.glow !== false) b += '<circle fill="url(#' + id + 'g)" cx="' + cx + '" cy="' + py + '" r="' + (Rp + g) + '"/>';
    b += circle('dm-bd-line dm-bd-dash', cx, py, Ro);
    b += circle('dm-bd-body', cx, py, Rp);
    if (o.glow !== false) b += '<circle fill="url(#' + id + 'r)" opacity=".5" cx="' + cx + '" cy="' + py + '" r="' + Rp + '"/>';
    b += circle('dm-bd-limb', cx, py, Rp);
    b += '<path class="dm-bd-line" shape-rendering="crispEdges" d="M0 ' + px(cy) + 'H' + W + '"/>' + diamond(cx, cy, 5);
    var th = Math.asin(Math.min(0.99, 0.22 * W / Ro)) * 180 / Math.PI, p = pol(cx, py, Ro, -90 - th), sweep = Math.asin(Math.min(0.99, 0.58 * W / Ro)) * 180 / Math.PI;
    b += circle('dm-bd-ring', p[0], p[1], 4);
    b += drift(cx, py, 2 * sweep * Math.PI / 180 * Ro / 6, -sweep, sweep, circle('dm-bd-live-ring', cx, py - Ro, 8) + circle('dm-bd-live', cx, py - Ro, 3));
    return { defs: defs, body: b };
  }

  function figTerrain(W, H, cx, cy, s, R, id, o) {
    var p = 7, rows = 20, cols = Math.ceil(W / p) + 1, A = 0.4 * H * s, gap = Math.max(9, Math.round(0.021 * H * s)), j0 = Math.round(rows * 0.4);
    var peaks = [[cx, 0.085 * W, 1], [cx - (0.15 + R() * 0.08) * W, 0.07 * W, 0.4 + R() * 0.16], [cx + (0.13 + R() * 0.08) * W, 0.075 * W, 0.5 + R() * 0.14], [cx - 0.36 * W, 0.12 * W, 0.16], [cx + 0.34 * W, 0.1 * W, 0.2]];
    var f1 = R() * 6.28, f2 = R() * 6.28, f3 = R() * 6.28, d = ['', '', ''], top = [], i, j, k;
    for (i = 0; i <= cols; i++) top.push(H + 9);
    /* near rows first: a far dot is drawn only where no nearer ridge hides it */
    for (j = rows - 1; j >= 0; j--) {
      var yb = cy + A + (j - j0) * gap, depth = Math.exp(-Math.pow((j - j0) / (rows * 0.42), 2));
      for (i = 0; i <= cols; i++) {
        var x = i * p, env = 0;
        for (k = 0; k < peaks.length; k++) env += peaks[k][2] * Math.exp(-Math.pow((x - peaks[k][0]) / peaks[k][1], 2));
        var rough = (Math.sin(x * 0.013 + f1 + j * 0.35) + 0.6 * Math.sin(x * 0.031 + f2 - j * 0.52) + 0.35 * Math.sin(x * 0.071 + f3 + j * 0.9)) / 1.95;
        var h = Math.min(1, env) * (0.7 + 0.3 * rough) * depth + 0.012 * rough, y = yb - A * h;
        if (y >= top[i] - 1) continue;
        top[i] = y;
        if (h < 0.05 && (i % 2 || Math.abs(x - cx) > W * (0.3 + 0.012 * ((i * 7 + j * 5) % 17)))) continue;
        d[h > 0.48 ? 2 : h > 0.16 ? 1 : 0] += 'M' + n2(x) + ' ' + n2(y) + 'h0';
      }
    }
    return { defs: '', body: '<path class="dm-bd-dots" stroke-width="1.1" opacity=".5" d="' + d[0] + '"/><path class="dm-bd-dots" stroke-width="1.6" opacity=".8" d="' + d[1] + '"/><path class="dm-bd-dots" stroke-width="2.2" d="' + d[2] + '"/>' };
  }

  function gridLines(W, H, step) {
    var d = '', m = '', x, y, c, r;
    for (x = step, c = 1; x < W; x += step, c++) d += 'M' + px(x) + ' 0V' + H;
    for (y = step, r = 1; y < H; y += step, r++) d += 'M0 ' + px(y) + 'H' + W;
    for (x = step * 2, c = 0; x < W; x += step * 4, c++) for (y = step * 2; y < H; y += step * 3) m += 'M' + (px(x) - 5) + ' ' + px(y) + 'h11M' + px(x) + ' ' + (px(y) - 5) + 'v11';
    return '<path class="dm-bd-fine" shape-rendering="crispEdges" d="' + d + '"/><path class="dm-bd-mark" shape-rendering="crispEdges" d="' + m + '"/>';
  }

  var FIGURES = {
    orbit: { at: [0.7, 0.44], draw: figOrbit },
    horizon: { at: [0.6, 0.66], draw: figHorizon },
    terrain: { at: [0.66, 0.3], draw: figTerrain },
    grid: { at: [0.5, 0.5], draw: function () { return { defs: '', body: '' }; } }
  };

  /* backdrop({figure: 'orbit', width: 1440, height: 900, seed: 'home'}) - an SVG string.
     opts: figure (orbit | horizon | terrain | grid), width, height, seed (same seed, same drawing),
     at ([x, y] as fractions of the box: the centre of an orbit, the crest of a horizon, the summit of a terrain),
     turn (0 to 3: which quarter of an orbit carries the scale, clockwise from lower right; the seed picks if unset),
     scale (1), grid (true or a step in px: a fine grid under the figure), ghost (a short real string, set huge and faint),
     glow (false removes the soft light), density (stars of a horizon, 1). */
  function backdrop(opts) {
    opts = opts || {};
    var W = Math.round(opts.width || 1440), H = Math.round(opts.height || 900);
    var name = FIGURES[opts.figure] ? opts.figure : 'orbit', F = FIGURES[name];
    var seed = typeof opts.seed === 'number' ? opts.seed : hash(opts.seed == null ? 'datum' : opts.seed);
    var at = opts.at || F.at, cx = Math.round(at[0] * W), cy = Math.round(at[1] * H);
    var out = F.draw(W, H, cx, cy, opts.scale == null ? 1 : opts.scale, rng(seed), 'dm' + (seed >>> 0).toString(36) + name.charAt(0), opts), under = '';
    if (opts.ghost) under += '<text class="dm-bd-ghost" x="' + n2(-0.012 * W) + '" y="' + n2(H * 0.985) + '" style="font-size:' + Math.round(H * 0.58) + 'px">' + esc(opts.ghost) + '</text>';
    if (opts.grid || name === 'grid') under += gridLines(W, H, typeof opts.grid === 'number' ? opts.grid : 64);
    return '<svg class="dm-bd" data-figure="' + name + '" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H +
      '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + (out.defs ? '<defs>' + out.defs + '</defs>' : '') + under + out.body + '</svg>';
  }

  /* ---------- Browser glue ---------- */
  var doc = root.document;
  function still() {
    return doc.documentElement.getAttribute('data-dm-motion') === 'off' || !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* mountBackdrop(el, opts) - draws the backdrop into el (a .dm-backdrop inside a .dm-ground) at el's own size,
     and again when that size really changes. Grain is on unless opts.grain is false. */
  function mountBackdrop(el, opts) {
    opts = opts || {};
    var lastW = 0, lastH = 0, timer = null;
    if (opts.grain !== false) el.classList.add('dm-backdrop--grain');
    function draw() {
      var box = el.getBoundingClientRect(), o = {}, k;
      for (k in opts) o[k] = opts[k];
      o.width = lastW = Math.max(1, Math.round(box.width)); o.height = lastH = Math.max(1, Math.round(box.height));
      el.innerHTML = backdrop(o);
    }
    draw();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () {
      var box = el.getBoundingClientRect();
      if (Math.round(box.width) === lastW && Math.round(box.height) === lastH) return;
      clearTimeout(timer); timer = setTimeout(draw, 120);
    }).observe(el);
    return draw;
  }

  /* count(el) - the first number in el counts up once, keeping its padding and decimals. For the one hero figure of a view.
     Screen readers get the final text through aria-label. Does nothing when motion is off. */
  function count(el, opts) {
    opts = opts || {};
    var text = el.getAttribute('data-dm-text');
    if (text == null) { text = el.textContent; el.setAttribute('data-dm-text', text); }
    var m = /^(\D*?)(\d+(?:\.\d+)?)([\s\S]*)$/.exec(text);
    if (!m || still()) { el.textContent = text; return; }
    var to = parseFloat(m[2]), dec = (m[2].split('.')[1] || '').length, width = m[2].length, dur = opts.duration || 640, t0 = null;
    el.setAttribute('aria-label', text);
    function frame(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4), s = (to * e).toFixed(dec);
      while (s.length < width) s = '0' + s;
      el.textContent = k >= 1 ? text : m[1] + s + m[3];
      if (k < 1) root.requestAnimationFrame(frame);
    }
    root.requestAnimationFrame(frame);
  }

  /* init(scope) - runs by itself when the page has loaded; call it again on content you add later.
       [data-dm-backdrop='{"figure":"orbit"}']  mounts a backdrop with those options
       [data-dm-count]                          counts its number up once
       [data-set-theme="dark|light"]            a button that sets <html data-theme>, remembered
       [data-set-motion="on|off"]               a button that sets <html data-dm-motion>, remembered */
  function sync() {
    var h = doc.documentElement, th = h.getAttribute('data-theme') || 'dark', mo = h.getAttribute('data-dm-motion') || 'on';
    [].forEach.call(doc.querySelectorAll('[data-set-theme]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-theme') === th)); });
    [].forEach.call(doc.querySelectorAll('[data-set-motion]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-motion') === mo)); });
  }
  function init(scope) {
    scope = scope || doc;
    [].forEach.call(scope.querySelectorAll('[data-dm-backdrop]'), function (el) {
      var o = {};
      try { o = JSON.parse(el.getAttribute('data-dm-backdrop') || '{}'); } catch (e) {}
      if (!el.firstChild) mountBackdrop(el, o);
    });
    [].forEach.call(scope.querySelectorAll('[data-dm-count]'), function (el) { count(el); });
    sync();
  }
  if (doc) {
    doc.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-set-theme],[data-set-motion]');
      if (!b) return;
      var h = doc.documentElement, th = b.getAttribute('data-set-theme'), mo = b.getAttribute('data-set-motion');
      try {
        if (th) { h.setAttribute('data-theme', th); root.localStorage.setItem('dm-theme', th); }
        if (mo) { h.setAttribute('data-dm-motion', mo); root.localStorage.setItem('dm-motion', mo); }
      } catch (err) {}
      sync();
    });
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { init(); }); else init();
  }

  var api = { dotNumeral: dotNumeral, dotRidge: dotRidge, barcode: barcode, dial: dial, sphere: sphere, backdrop: backdrop,
    mountBackdrop: mountBackdrop, count: count, init: init, glyphs: Object.keys(FONT).join('') };
  root.Datum = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* To apply a saved theme and motion choice before first paint, put this in <head>, before the stylesheets:
   <script>try{var d=document.documentElement,t=localStorage.getItem('dm-theme'),m=localStorage.getItem('dm-motion');
   if(t)d.setAttribute('data-theme',t);if(m)d.setAttribute('data-dm-motion',m)}catch(e){}<\/script> */
