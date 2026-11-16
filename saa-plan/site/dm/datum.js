/* Datum 6 - the one script. Survey figures (a seeded terrain and its contour plan), diagrams (fan, orbit, stack),
   dot-matrix characters, dot charts, dials and real barcodes as SVG strings, a palette maker for a project's two colours,
   plus the little page glue (figures by attribute, a count-up, theme and motion switches).
   Browser: window.Datum, and it wires the page by itself on load.  Node: require('./datum.js').  No dependencies.
   Colour comes from bundle.css (.dm-dot-*, .dm-tick-*, .dm-barcode), so everything follows the theme. */
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
  function n2(v) { return +v.toFixed(2); }

  /* ---------- Survey figures: the drawing a datum produces ---------- */
  /* One seeded relief is seen two ways: terrain() draws it from the side as ridgelines, contour() from above as a plan.
     The same seed gives the same ground in both, so a bay can carry the plan behind the view.
     Everything is an SVG string; colour comes from bundle.css (.dm-fig-*), so figures follow the theme and the signal. */
  var FIG = 0;
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function noise(seed) {
    function h(ix, iy) { var x = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ seed; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967295; }
    return function (x, y) { var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      var a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
  }
  function fbm(n, x, y, oct) { var s = 0, a = .5, f = 1, t = 0; for (var o = 0; o < oct; o++) { s += a * n(x * f, y * f); t += a; a *= .5; f *= 2.03; } return s / t; }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* relief(seed, {peak: [u, v]}) - a height function h(u, v) in 0..1 over the unit square: one summit, two shoulders, ridges.
     u runs left to right, v from far to near. The seed is any string: use the project's name or code. */
  function relief(seed, opts) {
    opts = opts || {}; seed = seed == null ? 'datum' : seed;
    var n = noise(hash(seed)), r = rng(hash('p:' + seed));
    var pk = opts.peak || [.5 + (r() - .5) * .14, .4 + (r() - .5) * .08], side = r() < .5 ? -1 : 1;
    var p2 = [pk[0] + side * (.25 + r() * .1), pk[1] + .14 + r() * .1], p3 = [pk[0] - side * (.3 + r() * .12), pk[1] + .26 + r() * .1];
    function cone(u, v, c, rad) { var dx = u - c[0], dy = (v - c[1]) * 1.25; return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / rad); }
    return function (u, v) {
      var shape = Math.max(Math.pow(cone(u, v, pk, .72), .96), .6 * Math.pow(cone(u, v, p2, .46), 1.15), .42 * Math.pow(cone(u, v, p3, .44), 1.1));
      var rid = 1 - Math.abs(2 * fbm(n, u * 2.6 + 11, v * 2.6 + 5, 4) - 1), rough = fbm(n, u * 5 + 3, v * 5 + 9, 3), foot = fbm(n, u * 1.6 + 40, v * 1.6 + 17, 2);
      return Math.max(0, shape * (.68 + .32 * rid * rid) + shape * .16 * (rough - .5) * (1 - shape * .5) + .1 * foot * (1 - shape) * (1 - shape));
    };
  }

  /* terrain({seed: 'saa-c03', level: .46}) - the relief as ridgelines, far to near, hidden lines removed.
     The datum level is one contour in signal that wraps the summit; ground above it is drawn stronger than ground below.
     opts: seed, w (720), h (460), rows (34), cols (100), relief (height as a share of h, .6), level (0..1, false for none),
           summit (where the summit stands, from the top: px, or a share of h up to 1; it sets the height, so the summit can sit on the datum line),
           mesh (lines up the slope, 10; 0 for none), peak ([u, v]), marks ([{u, v, label}]: a spot mark with a real label), label.
     The svg carries data-kx / data-ky: the summit as a share of its box, where the datum line and its key belong. */
  function terrain(opts) {
    opts = opts || {};
    var W = opts.w || 720, H = opts.h || 460, rows = opts.rows || 34, cols = opts.cols || 100, id = 'dmf' + (++FIG);
    var R = relief(opts.seed, opts), amp = (opts.relief == null ? .6 : opts.relief) * H, mesh = opts.mesh == null ? 10 : opts.mesh;
    var level = opts.level === false ? null : (opts.level == null ? .46 : opts.level), i, j, k, zmax = 0;
    function sc(v) { return .62 + .38 * v; }
    function base(v) { return H * (.5 + .47 * v); }
    function ua(j, v) { return .5 + (j / cols - .5) * 1.1 / sc(v); }
    var z = [], Y = [], X = [];
    for (j = 0; j <= cols; j++) X[j] = r1(j / cols * (W + 8) - 4);
    var si = 0;
    for (i = 0; i < rows; i++) { z[i] = []; for (j = 0; j <= cols; j++) { z[i][j] = R(ua(j, i / (rows - 1)), i / (rows - 1)); if (z[i][j] > zmax) { zmax = z[i][j]; si = i; } } }
    if (opts.summit != null) { var vs = si / (rows - 1); amp = (base(vs) - (opts.summit <= 1 ? opts.summit * H : opts.summit)) / (.72 + .28 * vs); }
    var sum = [0, 0, 0];
    for (i = 0; i < rows; i++) { var v = i / (rows - 1), b = base(v), a = amp * (.72 + .28 * v); Y[i] = [];
      for (j = 0; j <= cols; j++) { z[i][j] /= zmax; Y[i][j] = r1(b - z[i][j] * a); if (z[i][j] > sum[2]) sum = [X[j], Y[i][j], z[i][j]]; } }
    function proj(u, v) { var zz = R(u, v) / zmax; return [r1(W / 2 + (u - .5) * (W + 8) / 1.1 * sc(v)), r1(base(v) - zz * amp * (.72 + .28 * v))]; }
    var out = '';
    for (i = 0; i < rows; i++) {
      var d = '', hi = '', pen = false, op = r1(.34 + .66 * Math.pow(i / (rows - 1), .8));
      for (j = 0; j <= cols; j++) {
        d += (j ? 'L' : 'M') + X[j] + ' ' + Y[i][j];
        if (level != null) {
          var up = z[i][j] >= level;
          if (j && up !== (z[i][j - 1] >= level)) { var t = (level - z[i][j - 1]) / (z[i][j] - z[i][j - 1]), cx = r1(X[j - 1] + (X[j] - X[j - 1]) * t), cy = r1(Y[i][j - 1] + (Y[i][j] - Y[i][j - 1]) * t);
            hi += (up ? 'M' : 'L') + cx + ' ' + cy; pen = up; }
          if (up) { hi += (pen ? 'L' : 'M') + X[j] + ' ' + Y[i][j]; pen = true; }
        }
      }
      out += '<path class="dm-fig-body" style="fill-opacity:' + r1(.34 + .66 * Math.pow(i / (rows - 1), .6)) + '" d="' + d + 'V' + (H + 6) + 'H-4Z"/><path class="dm-fig-line" style="opacity:' + op + '" d="' + d + '"/>';
      if (hi) out += '<path class="dm-fig-line dm-fig-hi" style="opacity:' + Math.min(1, op + .2) + '" d="' + hi + '"/>';
      if (i === rows - 1) break;
      var v0 = i / (rows - 1), v1 = (i + 1) / (rows - 1), m = '', c = '';
      if (mesh) for (k = -4; k <= mesh + 4; k++) { var u = k / mesh, pa = proj(u, v0), pb = proj(u, v1); if (pa[0] > -20 && pa[0] < W + 20) m += 'M' + pa[0] + ' ' + pa[1] + 'L' + pb[0] + ' ' + pb[1]; }
      if (m) out += '<path class="dm-fig-mesh" style="opacity:' + r1(op * .7) + '" d="' + m + '"/>';
      if (level != null) for (j = 0; j < cols; j++) {
        var tl = z[i][j] >= level, tr = z[i][j + 1] >= level, br = z[i + 1][j + 1] >= level, bl = z[i + 1][j] >= level, code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
        if (!code || code === 15) continue;
        var e = function (side) { var a0, a1, x0, y0, x1, y1;
          if (side === 0) { a0 = z[i][j]; a1 = z[i][j + 1]; x0 = X[j]; y0 = Y[i][j]; x1 = X[j + 1]; y1 = Y[i][j + 1]; }
          else if (side === 1) { a0 = z[i][j + 1]; a1 = z[i + 1][j + 1]; x0 = x1 = X[j + 1]; y0 = Y[i][j + 1]; y1 = Y[i + 1][j + 1]; }
          else if (side === 2) { a0 = z[i + 1][j]; a1 = z[i + 1][j + 1]; x0 = X[j]; y0 = Y[i + 1][j]; x1 = X[j + 1]; y1 = Y[i + 1][j + 1]; }
          else { a0 = z[i][j]; a1 = z[i + 1][j]; x0 = x1 = X[j]; y0 = Y[i][j]; y1 = Y[i + 1][j]; }
          var tt = (level - a0) / (a1 - a0); return r1(x0 + (x1 - x0) * tt) + ' ' + r1(y0 + (y1 - y0) * tt); };
        var pairs = MS[code];
        for (k = 0; k < pairs.length; k += 2) c += 'M' + e(pairs[k]) + 'L' + e(pairs[k + 1]);
      }
      if (c) out += '<path class="dm-fig-datum" d="' + c + '"/>';
    }
    var marks = '<path class="dm-fig-mark" d="M' + sum[0] + ' ' + (sum[1] - 9) + 'l8 14h-16z"/><circle class="dm-fig-node" cx="' + sum[0] + '" cy="' + sum[1] + '" r="1.6"/>';
    (opts.marks || []).forEach(function (mk) { var p = proj(mk.u, mk.v), ty = p[1] - 34;
      marks += '<path class="dm-fig-mark" d="M' + (p[0] - 5) + ' ' + p[1] + 'h10M' + p[0] + ' ' + (p[1] - 5) + 'v10M' + p[0] + ' ' + (p[1] - 8) + 'V' + (ty + 5) + '"/><rect class="dm-fig-patch" x="' + (p[0] + 2) + '" y="' + (ty - 8) + '" width="' + r1(String(mk.label).length * 8.1 + 10) + '" height="17"/><text class="dm-fig-meta" x="' + (p[0] + 7) + '" y="' + (ty + 4) + '">' + esc(mk.label) + '</text>'; });
    return '<svg class="dm-fig dm-fig--terrain" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" preserveAspectRatio="xMidYMax slice" role="img" aria-label="' + esc(opts.label || 'Terrain figure') +
      '" data-kx="' + r1(sum[0] / W * 100) + '" data-ky="' + r1(sum[1] / H * 100) + '"><defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="' + id +
      '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '"><rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'g)"/></mask></defs><g mask="url(#' + id + ')">' + out + '</g>' + marks + '</svg>';
  }
  /* Marching squares: which sides of a cell (0 top, 1 right, 2 bottom, 3 left) a contour joins, by corner code */
  var MS = { 1: [3, 2], 2: [2, 1], 3: [3, 1], 4: [0, 1], 5: [3, 0, 2, 1], 6: [0, 2], 7: [3, 0], 8: [3, 0], 9: [0, 2], 10: [0, 1, 3, 2], 11: [0, 1], 12: [3, 1], 13: [2, 1], 14: [3, 2] };

  /* contour({seed: 'saa-c03'}) - the same relief from above: a plan of contour lines for the back of a bay or a sheet.
     Every fourth line is an index line, and the line at the datum level is drawn in signal.
     opts: seed, w (960), h (640), cell (grid step in px, 16), levels (11), level (the datum level, .46; false for none),
           span (how much ground the plan shows, 1.25), peak, label. */
  function contour(opts) {
    opts = opts || {};
    var W = opts.w || 960, H = opts.h || 640, cell = opts.cell || 16, nL = opts.levels || 11, span = opts.span || 1.25;
    var level = opts.level === false ? null : (opts.level == null ? .46 : opts.level), R = relief(opts.seed, opts);
    var nx = Math.ceil(W / cell), ny = Math.ceil(H / cell), g = [], i, j, zmax = 0, asp = H / W;
    for (j = 0; j <= ny; j++) for (i = 0; i <= nx; i++) { var zz = R(.5 + (i / nx - .5) * span, .42 + (j / ny - .5) * span * asp * 1.25); g.push(zz); if (zz > zmax) zmax = zz; }
    function G(i, j) { return g[j * (nx + 1) + i] / zmax; }
    var out = '', li, datumAt = -1, best = 9;
    for (li = 0; li < nL; li++) { var lv = .07 + li * (.88 / (nL - 1)); if (level != null && Math.abs(lv - level) < best) { best = Math.abs(lv - level); datumAt = li; } }
    for (li = 0; li < nL; li++) {
      var L = li === datumAt ? level : .07 + li * (.88 / (nL - 1)), pts = {}, segs = [], at = {};
      var P = function (i, j, dir) { var key = dir + ':' + i + ':' + j; if (!pts[key]) { var a = G(i, j), b = dir ? G(i, j + 1) : G(i + 1, j), t = (L - a) / (b - a); pts[key] = dir ? [i * cell, (j + t) * cell] : [(i + t) * cell, j * cell]; } return key; };
      for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
        var code = (G(i, j) >= L ? 8 : 0) | (G(i + 1, j) >= L ? 4 : 0) | (G(i + 1, j + 1) >= L ? 2 : 0) | (G(i, j + 1) >= L ? 1 : 0);
        if (!code || code === 15) continue;
        var pr = MS[code];
        for (var k = 0; k < pr.length; k += 2) { var ka = pr[k] === 0 ? P(i, j, 0) : pr[k] === 1 ? P(i + 1, j, 1) : pr[k] === 2 ? P(i, j + 1, 0) : P(i, j, 1), s2 = pr[k + 1],
          kb = s2 === 0 ? P(i, j, 0) : s2 === 1 ? P(i + 1, j, 1) : s2 === 2 ? P(i, j + 1, 0) : P(i, j, 1), si = segs.length; segs.push([ka, kb, false]); (at[ka] = at[ka] || []).push(si); (at[kb] = at[kb] || []).push(si); }
      }
      var d = '';
      for (var s = 0; s < segs.length; s++) {
        if (segs[s][2]) continue;
        var chain = [segs[s][0], segs[s][1]]; segs[s][2] = true;
        for (var pass = 0; pass < 2; pass++) { var grow = true; while (grow) { grow = false; var end = chain[chain.length - 1], list = at[end];
          for (var q = 0; q < list.length; q++) { var sg = segs[list[q]]; if (sg[2]) continue; sg[2] = true; chain.push(sg[0] === end ? sg[1] : sg[0]); grow = true; break; } } chain.reverse(); }
        if (chain.length < 4) continue;
        var closed = chain[0] === chain[chain.length - 1], p = chain.map(function (key) { return pts[key]; }), n = p.length;
        if (closed) { d += 'M' + r1((p[0][0] + p[1][0]) / 2) + ' ' + r1((p[0][1] + p[1][1]) / 2); for (q = 1; q < n; q++) { var nx2 = p[q === n - 1 ? 1 : q + 1]; d += 'Q' + r1(p[q][0]) + ' ' + r1(p[q][1]) + ' ' + r1((p[q][0] + nx2[0]) / 2) + ' ' + r1((p[q][1] + nx2[1]) / 2); } d += 'Z'; }
        else { d += 'M' + r1(p[0][0]) + ' ' + r1(p[0][1]); for (q = 1; q < n - 1; q++) d += 'Q' + r1(p[q][0]) + ' ' + r1(p[q][1]) + ' ' + r1((p[q][0] + p[q + 1][0]) / 2) + ' ' + r1((p[q][1] + p[q + 1][1]) / 2); d += 'L' + r1(p[n - 1][0]) + ' ' + r1(p[n - 1][1]); }
      }
      if (d) out += '<path class="' + (li === datumAt ? 'dm-fig-datum' : li % 4 === 0 ? 'dm-fig-line dm-fig-index' : 'dm-fig-line') + '" d="' + d + '"/>';
    }
    return '<svg class="dm-fig dm-fig--contour" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(opts.label || 'Contour plan') + '">' + out + '</svg>';
  }

  /* ---------- Diagrams: figures that carry the project's own structure ---------- */
  /* Labels are the project's real names; a diagram never invents a node. One item may be live: it is drawn in signal and carries the pulse. */
  function cutBox(x, y, s, cut, cls) { return '<path class="' + cls + '" d="M' + x + ' ' + y + 'h' + s + 'v' + (s - cut) + 'l-' + cut + ' ' + cut + 'h-' + (s - cut) + 'z"/>'; }
  function figText(cls, x, y, s, anchor) { return s == null ? '' : '<text class="' + cls + '" x="' + r1(x) + '" y="' + r1(y) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>'; }
  function figSvg(kind, W, H, label, body) { return '<svg class="dm-fig dm-fig--' + kind + '" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(label) + '">' + body + '</svg>'; }

  /* fan({from: {label: 'Question', meta: 'IN'}, to: [{label: 'A record', meta: '0.82', live: true}, ...]}) - one source, many ends.
     opts: w (640), h (420), label. */
  function fan(opts) {
    opts = opts || {};
    var W = opts.w || 640, H = opts.h || 420, to = opts.to || [], from = opts.from || {}, n = to.length, x0 = 86, y0 = H / 2, x1 = Math.round(W * .56), pad = 34, out = '', top = '';
    to.forEach(function (t, i) { var y = n === 1 ? y0 : r1(pad + i * (H - pad * 2) / (n - 1)), d = 'M' + x0 + ' ' + y0 + 'C' + r1(x0 + (x1 - x0) * .55) + ' ' + y0 + ' ' + r1(x0 + (x1 - x0) * .45) + ' ' + y + ' ' + x1 + ' ' + y;
      var part = '<path class="dm-fig-line' + (t.live ? ' dm-fig-live' : '') + '" d="' + d + '"/>' + (t.live ? '<path class="dm-fig-pulse" pathLength="100" d="' + d + '"/>' : '') +
        '<rect class="dm-fig-node' + (t.live ? ' dm-fig-live' : '') + '" x="' + (x1 - 4) + '" y="' + (y - 4) + '" width="8" height="8"/>' + figText('dm-fig-text', x1 + 16, y + 4.5, t.label) + figText('dm-fig-meta', x1 + 16, y + 21, t.meta);
      if (t.live) top += part; else out += part; });
    out += top + cutBox(x0 - 22, y0 - 22, 44, 10, 'dm-fig-core') + '<path class="dm-fig-glyph" d="M' + (x0 - 7) + ' ' + y0 + 'h14M' + x0 + ' ' + (y0 - 7) + 'v14"/>' + figText('dm-fig-text', x0 - 22, y0 + 44, from.label) + figText('dm-fig-meta', x0 - 22, y0 - 32, from.meta);
    return figSvg('fan', W, H, opts.label || 'Diagram: ' + (from.label || 'source') + ' to ' + n + ' ends', out);
  }

  /* orbit({hub: {label: 'Core'}, rings: [[{label: 'Zones', a: 210}], [{label: 'Records', a: 20, live: true}, ...]]}) - a centre and what turns about it.
     Each ring is a list of nodes; a is the bearing in degrees, clockwise from north. opts: w (520), h (520), label. */
  function orbit(opts) {
    opts = opts || {};
    var W = opts.w || 520, H = opts.h || 520, cx = W / 2, cy = H / 2, rings = opts.rings || [], hub = opts.hub || {}, R0 = Math.min(W / 2 - 96, H / 2 - 44), out = '', top = '';
    rings.forEach(function (ring, ri) { var rad = r1(R0 * (ri + 1) / rings.length);
      out += '<circle class="dm-fig-line' + (ri % 2 ? ' dm-fig-dash' : '') + '" cx="' + cx + '" cy="' + cy + '" r="' + rad + '"/>';
      ring.forEach(function (nd) { var a = (nd.a - 90) * Math.PI / 180, x = r1(cx + Math.cos(a) * rad), y = r1(cy + Math.sin(a) * rad), right = Math.cos(a) >= 0, d = 'M' + cx + ' ' + cy + 'L' + x + ' ' + y;
        if (nd.live) top += '<path class="dm-fig-line dm-fig-live" d="' + d + '"/><path class="dm-fig-pulse" pathLength="100" d="' + d + '"/>';
        top += '<path class="dm-fig-node' + (nd.live ? ' dm-fig-live' : '') + '" d="M' + x + ' ' + (y - 6) + 'l6 6-6 6-6-6z"/>' + figText('dm-fig-text', x + (right ? 14 : -14), y + 4.5, nd.label, right ? null : 'end') + figText('dm-fig-meta', x + (right ? 14 : -14), y + 20, nd.meta, right ? null : 'end'); }); });
    var ticks = ''; for (var t = 0; t < 72; t++) { var ta = t * 5 * Math.PI / 180, ra = R0 + 14, rb = R0 + (t % 6 ? 20 : 26); ticks += 'M' + r1(cx + Math.cos(ta) * ra) + ' ' + r1(cy + Math.sin(ta) * ra) + 'L' + r1(cx + Math.cos(ta) * rb) + ' ' + r1(cy + Math.sin(ta) * rb); }
    out = '<path class="dm-fig-mesh" d="' + ticks + '"/><path class="dm-fig-line dm-fig-dash" d="M' + cx + ' 8V' + (H - 8) + 'M8 ' + cy + 'H' + (W - 8) + '"/>' + out + top + cutBox(cx - 22, cy - 22, 44, 10, 'dm-fig-core') + '<path class="dm-fig-glyph" d="M' + cx + ' ' + (cy - 8) + 'l8 8-8 8-8-8z"/>' + figText('dm-fig-text', cx, cy + 44, hub.label, 'middle');
    return figSvg('orbit', W, H, opts.label || 'Diagram: ' + (hub.label || 'centre') + ' and its parts', out);
  }

  /* stack({layers: [{label: 'Questions', meta: '312'}, {label: 'Lessons', meta: '12', live: true}, ...]}) - plates in order, top first.
     opts: w (560), h (440), label. */
  function stack(opts) {
    opts = opts || {};
    var W = opts.w || 560, H = opts.h || 440, layers = opts.layers || [], n = layers.length, rw = Math.min(170, W * .3), rh = rw * .42, th = 9, cx = rw + 24, out = '';
    var gap = n > 1 ? Math.min(92, (H - rh * 2 - th - 24) / (n - 1)) : 0, y0 = (H - (gap * (n - 1) + th)) / 2;
    out += '<path class="dm-fig-line dm-fig-dash" d="M' + cx + ' 6V' + (H - 6) + '"/>';
    for (var i = n - 1; i >= 0; i--) { var L = layers[i], y = r1(y0 + i * gap), cls = L.live ? ' dm-fig-live' : '';
      out += '<path class="dm-fig-plate' + cls + '" d="M' + (cx - rw) + ' ' + y + 'L' + cx + ' ' + r1(y + rh) + 'L' + (cx + rw) + ' ' + y + 'v' + th + 'L' + cx + ' ' + r1(y + rh + th) + 'L' + (cx - rw) + ' ' + (y + th) + 'z"/>' +
        '<path class="dm-fig-plate dm-fig-top' + cls + '" d="M' + cx + ' ' + r1(y - rh) + 'L' + (cx + rw) + ' ' + y + 'L' + cx + ' ' + r1(y + rh) + 'L' + (cx - rw) + ' ' + y + 'z"/>' +
        '<path class="dm-fig-line' + cls + '" d="M' + (cx + rw) + ' ' + y + 'H' + (cx + rw + 44) + '"/><rect class="dm-fig-node' + cls + '" x="' + (cx + rw + 40) + '" y="' + (y - 4) + '" width="8" height="8"/>' +
        figText('dm-fig-text', cx + rw + 60, y + 4.5, L.label) + figText('dm-fig-meta', cx + rw + 60, y + 21, L.meta); }
    return figSvg('stack', W, H, opts.label || 'Diagram: ' + n + ' layers', out);
  }

  /* ---------- Palette: two colours in, a checked set of tokens out ---------- */
  /* palette({tone: '#0d2a2e', signal: '#ff5a1f'}) - tone is the hue of the ground (the dark or the paper of the reference),
     signal is its one accent. Returns {night: {...}, day: {...}, css}: every colour token for both themes (and dm-hue, which
     turns the grade of a picture toward the tone), with signal-text
     moved until it reads at 4.5:1 on sheet and mist, and on-signal chosen for 4.5:1 on signal. Paste css after tokens.css. */
  function lin(c) { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
  function gam(c) { c = c <= .0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - .055; return Math.round(Math.max(0, Math.min(1, c)) * 255); }
  function rgbOf(hex) { hex = String(hex).replace('#', ''); if (hex.length === 3) hex = hex.replace(/./g, '$&$&'); return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]; }
  function lchOf(hex) { var c = rgbOf(hex), r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
    var l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    var L = .2104542553 * l + .793617785 * m - .0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, B = .0259040371 * l + .7827717662 * m - .808675766 * s;
    return [L, Math.sqrt(A * A + B * B), Math.atan2(B, A)]; }
  function hexOf(L, C, h) {
    for (var tries = 0; tries < 40; tries++) { var A = C * Math.cos(h), B = C * Math.sin(h), l = Math.pow(L + .3963377774 * A + .2158037573 * B, 3), m = Math.pow(L - .1055613458 * A - .0638541728 * B, 3), s = Math.pow(L - .0894841775 * A - 1.291485548 * B, 3);
      var r = 4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, g = -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, b = -.0041960863 * l - .7034186147 * m + 1.707614701 * s;
      if (C < .002 || (r > -.001 && r < 1.001 && g > -.001 && g < 1.001 && b > -.001 && b < 1.001)) return '#' + [r, g, b].map(function (c) { return ('0' + gam(c).toString(16)).slice(-2); }).join('').toUpperCase();
      C *= .94; }
    return '#000000'; }
  function lum(hex) { var c = rgbOf(hex); return .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]); }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function palette(opts) {
    opts = opts || {};
    var t = lchOf(opts.tone || '#0B1012'), s = lchOf(opts.signal || '#FF4A1C'), h = t[2], c = Math.min(Math.max(t[1], .008), .03), k = c / .018;
    function ramp(dark) {
      var p = dark ? { ground: hexOf(.135, c * 1.1, h), 'ground-lit': hexOf(.3, Math.min(.062, c * 2.6), h), sheet: hexOf(.185, c, h), mist: hexOf(.235, c * 1.05, h), line: hexOf(.295, c * 1.1, h), off: hexOf(.38, c * 1.1, h), steel: hexOf(.62, .028 * k, h), ink: hexOf(.955, .008, h), 'ink-2': hexOf(.76, .024 * k, h) }
        : { ground: hexOf(.845, c * .9, h), 'ground-lit': hexOf(.925, c * .7, h), sheet: hexOf(.972, .005, h), mist: hexOf(.928, c * .5, h), line: hexOf(.882, c * .6, h), off: hexOf(.79, c * .9, h), steel: hexOf(.62, .028 * k, h), ink: hexOf(.2, c * .9, h), 'ink-2': hexOf(.43, .03 * k, h) };
      p['on-ink'] = dark ? p.ground : p.sheet;
      var sl = dark ? Math.max(s[0], .66) : Math.min(Math.max(s[0], .58), .68); p.signal = hexOf(sl, s[1], s[2]);
      /* on-signal is the dark or the light end, whichever reads; a signal of middling lightness is moved a little until one of them does */
      var dk = hexOf(.12, c, h), lt = hexOf(.985, .003, h), i;
      function onSig() { return ratio(dk, p.signal) >= ratio(lt, p.signal) ? dk : lt; }
      p['on-signal'] = onSig();
      for (i = 0; i < 14 && ratio(p['on-signal'], p.signal) < 4.5; i++) { sl += p['on-signal'] === dk ? .01 : -.01; p.signal = hexOf(sl, s[1], s[2]); p['on-signal'] = onSig(); }
      var tl = sl, st = p.signal; for (i = 0; i < 60 && (ratio(st, p.sheet) < 4.5 || ratio(st, p.mist) < 4.5); i++) { tl += dark ? .01 : -.01; st = hexOf(tl, s[1], s[2]); } p['signal-text'] = st;
      var gl = rgbOf(dark ? p.ground : '#FFFFFF'), ed = rgbOf(dark ? p.ink : '#FFFFFF');
      p.glass = 'rgba(' + gl.join(',') + (dark ? ',0.5)' : ',0.66)'); p['glass-edge'] = 'rgba(' + ed.join(',') + (dark ? ',0.2)' : ',0.8)');
      return p; }
    var night = ramp(true), day = ramp(false), tc = rgbOf(opts.tone || '#164550'), mx = Math.max(tc[0], tc[1], tc[2]), mn = Math.min(tc[0], tc[1], tc[2]), hh = 191;
    if (mx !== mn) hh = (mx === tc[0] ? ((tc[1] - tc[2]) / (mx - mn)) % 6 : mx === tc[1] ? (tc[2] - tc[0]) / (mx - mn) + 2 : (tc[0] - tc[1]) / (mx - mn) + 4) * 60;
    /* dm-hue turns the grade of a picture toward the tone: the hue of the tone less the hue of sepia */
    night['dm-hue'] = day['dm-hue'] = Math.round(((hh - 40) % 360 + 360) % 360) + 'deg';
    function block(sel, p) { return sel + ' { ' + Object.keys(p).map(function (key) { return '--' + key + ': ' + p[key] + ';'; }).join(' ') + ' }'; }
    return { night: night, day: day, ratio: ratio, css: block(':root, [data-theme="night"]', night) + '\n' + block('[data-theme="day"]', day) };
  }

  /* ---------- Page glue ---------- */
  var doc = root.document;
  function still() {
    return doc.documentElement.getAttribute('data-dm-motion') === 'off' || !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
       [data-dm-count]                          counts its number up once
       [data-set-theme="day|night"]             a button that sets <html data-theme>, remembered
       [data-set-motion="on|off"]               a button that sets <html data-dm-motion>, remembered */
  function sync() {
    var h = doc.documentElement, th = h.getAttribute('data-theme') || 'night', mo = h.getAttribute('data-dm-motion') || 'on';
    [].forEach.call(doc.querySelectorAll('[data-set-theme]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-theme') === th)); });
    [].forEach.call(doc.querySelectorAll('[data-set-motion]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-motion') === mo)); });
  }
  /* figure(el) - draws the figure an element asks for: data-dm-fig="terrain|contour|fan|orbit|stack", its options as JSON in data-opts.
     A terrain or contour with no size takes the size of its element. A terrain hands its summit to its parent (the bay) as
     --dm-kx / --dm-ky, so the light, the arcs and the plan sit on it, and to its .dm-hero as --dm-key, where the key of the datum line stands. */
  var FIGS = { terrain: terrain, contour: contour, fan: fan, orbit: orbit, stack: stack };
  function figure(el) {
    var kind = el.getAttribute('data-dm-fig'), fn = FIGS[kind], o = {};
    if (!fn) return;
    try { o = JSON.parse(el.getAttribute('data-opts') || '{}'); } catch (err) { if (root.console) root.console.error('datum.js: data-opts is not JSON', el); }
    if ((kind === 'terrain' || kind === 'contour') && !o.w && el.clientWidth > 40 && el.clientHeight > 40) { o.w = Math.round(el.clientWidth); o.h = Math.round(el.clientHeight); }
    el.innerHTML = fn(o);
    if (kind === 'terrain') { var svg = el.firstChild, host = el.parentNode, hero = el.closest && el.closest('.dm-hero'), hb = host.getBoundingClientRect(), eb = el.getBoundingClientRect(), kx = eb.left + eb.width * svg.getAttribute('data-kx') / 100;
      if (hb.width && eb.width) { host.style.setProperty('--dm-kx', r1((kx - hb.left) / hb.width * 100) + '%'); host.style.setProperty('--dm-ky', r1((eb.top - hb.top + eb.height * svg.getAttribute('data-ky') / 100) / hb.height * 100) + '%');
        if (hero) hero.style.setProperty('--dm-key', r1(kx - hero.getBoundingClientRect().left) + 'px'); } }
    /* A terrain or plan is drawn at the size of its element, so it is drawn again when that size changes */
    if ((kind === 'terrain' || kind === 'contour') && !el.dmWatch && root.ResizeObserver) { var seen = el.clientWidth + 'x' + el.clientHeight, timer;
      el.dmWatch = new root.ResizeObserver(function () { var now = el.clientWidth + 'x' + el.clientHeight; if (now === seen) return; seen = now; clearTimeout(timer); timer = setTimeout(function () { figure(el); }, 120); }); el.dmWatch.observe(el); }
  }
  /* fit(el) - sets a .dm-mega word to the exact width of its .dm-band. Runs on load, when the fonts arrive and when the band changes size. */
  function fit(el) {
    var band = el.parentNode, w = band.clientWidth; if (!w) return;
    el.style.fontSize = '100px'; el.style.width = 'max-content'; var m = el.offsetWidth; el.style.width = '';
    el.style.fontSize = m ? Math.min(440, Math.floor(100 * w / m * 10) / 10) + 'px' : '';
    if (!band.dmWatch && root.ResizeObserver) { var seen = w; band.dmWatch = new root.ResizeObserver(function () { if (band.clientWidth !== seen) { seen = band.clientWidth; fit(el); } }); band.dmWatch.observe(band); }
  }
  function init(scope) {
    scope = scope || doc;
    var megas = scope.querySelectorAll('.dm-band > .dm-mega');
    [].forEach.call(megas, fit);
    if (megas.length && doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { [].forEach.call(megas, fit); });
    [].forEach.call(scope.querySelectorAll('[data-dm-fig]'), function (el) { figure(el); });
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

  var api = { dotNumeral: dotNumeral, dotRidge: dotRidge, barcode: barcode, dial: dial, count: count, init: init, glyphs: Object.keys(FONT).join(''),
    relief: relief, terrain: terrain, contour: contour, fan: fan, orbit: orbit, stack: stack, figure: figure, fit: fit, palette: palette, contrast: ratio };
  root.Datum = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* To apply a saved theme and motion choice before first paint, put this in <head>, before the stylesheets:
   <script>try{var d=document.documentElement,t=localStorage.getItem('dm-theme'),m=localStorage.getItem('dm-motion');
   if(t)d.setAttribute('data-theme',t);if(m)d.setAttribute('data-dm-motion',m)}catch(e){}<\/script> */
