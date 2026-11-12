/* Field Manual art - dot-matrix characters, dot charts, dials, real barcodes and generated backdrops as SVG strings.
   Browser: window.FieldManualArt.  Node: require('./field-manual-art.js').  No dependencies.
   Colour comes from bundle.css (.fm-dot-*, .fm-bd-*), so everything follows the theme. */
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
    return '<circle class="' + cls + '"' + (i == null ? '' : ' style="--i:' + i + '"') + ' cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
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
        if (on || off) out.push(dot(on ? 'fm-dot-on' : 'fm-dot-off', (i * 6 + x) * p + p / 2, y * p + p / 2, r, on ? i * 6 + x + y : null));
      }
    });
    var w = (chars.length * 6 - 1) * p, h = 7 * p;
    return '<svg class="fm-dotnum" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
      '" role="img" aria-label="' + esc(opts.label || text) + '">' + out.join('') + '</svg>';
  }

  /* dotRidge([7.5, 7.75, 2.2, 0, ...], {max: 8, mark: 2}) - one dot column group per value.
     opts: rows (default 10), max (default: largest value), pitch (8), colWidth (dots per value, 3),
     gap (empty dot columns between values, 1), mark (index drawn in .fm-dot-live), label (aria-label). */
  function dotRidge(values, opts) {
    opts = opts || {};
    var rows = opts.rows || 10, p = opts.pitch || 8, cw = opts.colWidth || 3;
    var gap = opts.gap == null ? 1 : opts.gap, r = +(p * 0.36).toFixed(2);
    var max = opts.max || Math.max.apply(null, values.concat([1])), out = [];
    values.forEach(function (v, i) {
      var lit = v > 0 ? Math.max(1, Math.round(Math.min(v, max) / max * rows)) : 0;
      for (var c = 0; c < cw; c++) for (var y = 0; y < rows; y++) {
        var on = rows - y <= lit;
        out.push(dot(on ? (i === opts.mark ? 'fm-dot-live' : 'fm-dot-on') : 'fm-dot-off',
          (i * (cw + gap) + c) * p + p / 2, y * p + p / 2, r, on ? i * 2 + (rows - y) : null));
      }
    });
    var w = (values.length * (cw + gap) - gap) * p, h = rows * p;
    return '<svg class="fm-ridge" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
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
    return '<svg class="fm-barcode" viewBox="0 0 ' + W + ' ' + h + '" width="' + W + '" height="' + h + '" role="img" aria-label="' +
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
      var f = i / (n - 1), cls = i < lit ? (i === lit - 1 ? 'fm-tick-live' : 'fm-tick-on') : 'fm-tick-off';
      out += '<path class="' + cls + '"' + (i < lit ? ' style="--i:' + i + '"' : '') + ' d="M' + at(f, ri) + 'L' + at(f, ro) + '"/>';
    }
    if (opts.target != null) {
      var tf = Math.max(0, Math.min(opts.target, max)) / max;
      out += '<path class="fm-tick-target" d="M' + at(tf, ri - 6) + 'L' + at(tf, ro + 6) + '"/>';
    }
    return '<svg class="fm-dial__ring" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' +
      esc(opts.label || value + ' of ' + max) + '">' + out + '</svg>';
  }

  /* ---------- Backdrop ---------- */

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
  var DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  function n2(v) { return +v.toFixed(2); }
  function pathOf(pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + n2(p[0]) + ' ' + n2(p[1]); }).join('');
  }
  /* Parallel copy of a polyline at distance d, mitred at the joints. */
  function offset(pts, d) {
    var lines = [], out = [], i;
    for (i = 0; i < pts.length - 1; i++) {
      var dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / l * d, ny = dx / l * d;
      lines.push([pts[i][0] + nx, pts[i][1] + ny, dx, dy, pts[i + 1][0] + nx, pts[i + 1][1] + ny]);
    }
    out.push([lines[0][0], lines[0][1]]);
    for (i = 0; i < lines.length - 1; i++) {
      var a = lines[i], b = lines[i + 1], den = a[2] * b[3] - a[3] * b[2];
      if (Math.abs(den) < 1e-6) { out.push([a[4], a[5]]); continue; }
      var t = ((b[0] - a[0]) * b[3] - (b[1] - a[1]) * b[2]) / den;
      out.push([a[0] + a[2] * t, a[1] + a[3] * t]);
    }
    var z = lines[lines.length - 1];
    out.push([z[4], z[5]]);
    return out;
  }
  function inRects(p, rects) {
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (p[0] > r[0] && p[0] < r[0] + r[2] && p[1] > r[1] && p[1] < r[1] + r[3]) return true;
    }
    return false;
  }

  function simplify(pts) {
    var out = [], i;
    for (i = 0; i < pts.length; i++) {
      var p = pts[i], l = out[out.length - 1];
      if (l && Math.abs(l[0] - p[0]) < 0.01 && Math.abs(l[1] - p[1]) < 0.01) continue;
      if (out.length > 1) {
        var k = out[out.length - 2];
        if (Math.abs((l[0] - k[0]) * (p[1] - l[1]) - (l[1] - k[1]) * (p[0] - l[0])) < 0.01) { out[out.length - 1] = p; continue; }
      }
      out.push(p);
    }
    return out;
  }
  /* Turn every 90-degree corner of an orthogonal polyline into a 45-degree one. */
  function chamfered(pts, c) {
    pts = simplify(pts);
    var out = [pts[0]], i;
    for (i = 1; i < pts.length - 1; i++) {
      var a = pts[i - 1], b = pts[i], n = pts[i + 1];
      var l1 = Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2)), l2 = Math.sqrt(Math.pow(n[0] - b[0], 2) + Math.pow(n[1] - b[1], 2));
      var k = Math.min(c, l1 / 2, l2 / 2);
      out.push([b[0] + (a[0] - b[0]) / l1 * k, b[1] + (a[1] - b[1]) / l1 * k]);
      out.push([b[0] + (n[0] - b[0]) / l2 * k, b[1] + (n[1] - b[1]) / l2 * k]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  var STYLES = {
    circuit:   { plates: 8, solids: true,  pads: 4, lines: 5, circles: 1, rays: false, globe: true,  lattice: false, traces: 12, bundle: 0.45, bits: 14 },
    blueprint: { plates: 3, solids: false, pads: 1, lines: 8, circles: 3, rays: true,  globe: true,  lattice: false, traces: 5,  bundle: 0.2,  bits: 9 },
    grid:      { plates: 4, solids: false, pads: 1, lines: 3, circles: 0, rays: false, globe: false, lattice: true,  traces: 3,  bundle: 0,    bits: 6 }
  };
  var SIDES = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
  function sidePoint(r, side, t) {
    t = t == null ? 0.5 : t;
    return side === 'top' ? [r[0] + r[2] * t, r[1]] : side === 'bottom' ? [r[0] + r[2] * t, r[1] + r[3]] :
      side === 'left' ? [r[0], r[1] + r[3] * t] : [r[0] + r[2], r[1] + r[3] * t];
  }
  function port(p, side, cls) {
    var n = SIDES[side], v = n[0] === 0;
    return '<rect class="' + cls + '" x="' + n2(v ? p[0] - 6 : (n[0] > 0 ? p[0] : p[0] - 4)) + '" y="' + n2(v ? (n[1] > 0 ? p[1] : p[1] - 4) : p[1] - 6) +
      '" width="' + (v ? 12 : 4) + '" height="' + (v ? 4 : 12) + '"/>';
  }
  /* A wire between two panels: leaves one side, turns only at 45 degrees, plugs into the other. */
  function linkPath(L) {
    var g = L.gap == null ? 16 : L.gap, n1 = SIDES[L.fromSide], n2v = SIDES[L.toSide];
    var S = sidePoint(L.a, L.fromSide, L.fromAt), T = sidePoint(L.b, L.toSide, L.toAt);
    var S1 = [S[0] + n1[0] * g, S[1] + n1[1] * g], T1 = [T[0] + n2v[0] * g, T[1] + n2v[1] * g], E;
    if (L.fromSide === L.toSide) {
      if (n1[0] === 0) { var Y = n1[1] > 0 ? Math.max(S1[1], T1[1]) : Math.min(S1[1], T1[1]); S1[1] = Y; T1[1] = Y; }
      else { var X = n1[0] > 0 ? Math.max(S1[0], T1[0]) : Math.min(S1[0], T1[0]); S1[0] = X; T1[0] = X; }
      E = T1;
    } else E = n1[0] === 0 ? [T1[0], S1[1]] : [S1[0], T1[1]];
    var cls = 'fm-bd-link' + (L.live ? ' fm-bd-link-live' : ''), pc = 'fm-bd-port' + (L.live ? ' fm-bd-port-live' : '');
    var dd = pathOf(chamfered([S, S1, E, T1, T], 12));
    return '<path class="' + cls + '" pathLength="1" d="' + dd + '"/><path class="fm-bd-packet' + (L.live ? ' fm-bd-packet-live' : '') + '" pathLength="1" d="' + dd + '"/>' +
      port(S, L.fromSide, pc) + port(T, L.toSide, pc);
  }

  /* backdrop({width, height, seed}) - the layered page ground. Everything sits on a 48px lattice at 0, 45 or 90 degrees
     and clusters around two anchors, so it reads as composed rather than scattered.
     It is pure geometry: it holds no text except `ghost`.
     opts: width, height (px; default 1440 x 1024)
           seed    (number or string; same seed, same drawing - use the page id)
           style   ('circuit' default: plates, bold strokes, wire bundles | 'blueprint': construction circles, rays
                    and long lines | 'grid': a quiet dot lattice with a few plates, for reading pages)
           unit    (lattice pitch, default 48)
           density (0.4 sparse - 1.6 dense, default 1)
           ghost   (optional real index drawn huge and tone-on-tone, e.g. the day number '03')
           grain   (fine noise over the ground, default true)
           frame   (draw the perimeter frame, default true), inset (its distance from the edge, default 12)
           top     (y where the frame starts, e.g. below a rail; default = inset)
           clear   ([[x, y, w, h], ...] areas that keep only the quietest layers: put small text there)
           echoes  ([[x, y, w, h], ...] panels that get an offset outline behind them)
           links   ([{a: [x,y,w,h], b: [x,y,w,h], fromSide, toSide, fromAt, toAt, live}] wires between panels;
                    sides are 'top' | 'right' | 'bottom' | 'left', fromAt/toAt are 0-1 along the side) */
  function backdrop(opts) {
    opts = opts || {};
    var W = opts.width || 1440, H = opts.height || 1024, u = opts.unit || 48;
    var seed = typeof opts.seed === 'number' ? opts.seed : hash(opts.seed == null ? 'field-manual' : opts.seed);
    var R = rng(seed), d = opts.density == null ? 1 : opts.density;
    var id = 'fmbd' + (seed >>> 0).toString(36);
    var cols = Math.ceil(W / u), rows = Math.ceil(H / u), clear = opts.clear || [];
    function ri(a, b) { a = Math.round(a); b = Math.max(a, Math.round(b)); return a + Math.floor(R() * (b - a + 1)); }
    function pick(a) { return a[Math.floor(R() * a.length)]; }
    var S = STYLES[opts.style] || STYLES.circuit;
    function count(n) { return n <= 0 ? 0 : Math.max(1, Math.round(n * d)); }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    /* two anchors on opposite corners; half the seeds mirror them */
    var flip = R() < 0.5;
    var A1 = [ri(cols * 0.62, cols - 2), ri(1, rows * 0.38)], A2 = [ri(1, cols * 0.34), ri(rows * 0.58, rows - 2)];
    if (flip) { A1[0] = cols - A1[0]; A2[0] = cols - A2[0]; }
    function near(A, s) { return [clamp(A[0] + ri(-s, s), 0, cols - 1), clamp(A[1] + ri(-s, s), 0, rows - 1)]; }

    /* A walk on the lattice: starts on an edge heading inward, turns 45 degrees at a time. */
    function walk(maxSeg, half, A) {
      var o = half ? u / 2 : 0, p, dir, side;
      if (A) {
        var dd = [A[0], A[1], cols - A[0], rows - A[1]], mn = Math.min.apply(null, dd);
        side = dd.indexOf(mn);
      } else side = ri(0, 3);
      var cy = A ? clamp(A[1] + ri(-2, 2), 1, rows - 1) : ri(1, rows - 1), cx = A ? clamp(A[0] + ri(-2, 2), 1, cols - 1) : ri(1, cols - 1);
      if (side === 0) { p = [0, cy * u + o]; dir = 0; }
      else if (side === 1) { p = [cx * u + o, 0]; dir = 2; }
      else if (side === 2) { p = [W, cy * u + o]; dir = 4; }
      else { p = [cx * u + o, H]; dir = 6; }
      var home = dir, pts = [p], segs = ri(3, maxSeg);
      for (var s = 0; s < segs; s++) {
        var diag = dir % 2 === 1, len = (diag ? ri(1, 2) : ri(1, 5)) * u;
        p = [p[0] + DIRS[dir][0] * len, p[1] + DIRS[dir][1] * len];
        pts.push(p);
        var turn = pick([-1, 1]), nd = (dir + turn + 8) % 8, off = (nd - home + 8) % 8;
        if (off > 2 && off < 6) nd = (dir - turn + 8) % 8;   /* never head back out */
        dir = nd;
      }
      return pts;
    }
    function polyStr(poly) { return poly.map(function (q) { return n2(q[0]) + ',' + n2(q[1]); }).join(' '); }
    function cutRect(px, py, pw, ph, c, corner) {
      var P = [[px, py], [px + pw, py], [px + pw, py + ph], [px, py + ph]], poly = [];
      for (var k = 0; k < 4; k++) {
        if (k !== corner) { poly.push(P[k]); continue; }
        var prev = P[(k + 3) % 4], next = P[(k + 1) % 4];
        poly.push([P[k][0] + Math.sign(prev[0] - P[k][0]) * c, P[k][1] + Math.sign(prev[1] - P[k][1]) * c]);
        poly.push([P[k][0] + Math.sign(next[0] - P[k][0]) * c, P[k][1] + Math.sign(next[1] - P[k][1]) * c]);
      }
      return poly;
    }

    var ghost = '', plates = '', solids = '', pads = '', lines = '', circles = '', plus = '', frame = '', traces = '', bits = '', live = '', echo = '', links = '', fx = '';
    var i, x, y, q;

    /* 0. ghost index */
    if (opts.ghost != null && opts.ghost !== '') {
      ghost = '<text class="fm-bd-ghost" x="' + (W - u / 2) + '" y="' + (H - u / 2) + '" text-anchor="end">' + esc(opts.ghost) + '</text>';
    }

    /* 1. plates: tone-on-tone panels with one cut corner; some hatched, some dotted; most sit near an anchor */
    for (i = 0; i < count(S.plates); i++) {
      q = R() < 0.7 ? near(i % 2 ? A1 : A2, 4) : [ri(-1, cols - 2), ri(0, rows - 1)];
      var poly = cutRect(q[0] * u, q[1] * u, ri(2, 6) * u, ri(1, 4) * u, u / 2, ri(0, 3));
      var roll = R(), fill = roll < 0.45 ? 'class="fm-bd-plate"' : roll < 0.7 ? 'class="fm-bd-plate-sunk"' :
        roll < 0.88 ? 'fill="url(#' + id + '-h)"' : 'fill="url(#' + id + '-d)"';
      plates += '<polygon ' + fill + ' style="--i:' + i + '" points="' + polyStr(poly) + '"/>';
      if (roll >= 0.45) plates += '<polygon class="fm-bd-line" points="' + polyStr(poly) + '"/>';
    }

    /* 2. solids: two bold mid-tone strokes, one from each anchor - the loudest shapes in the drawing */
    if (S.solids) solids = '<path class="fm-bd-solid" pathLength="1" d="' + pathOf(walk(4, false, A1)) + '"/><path class="fm-bd-solid" pathLength="1" style="--i:3" d="' + pathOf(walk(3, false, A2)) + '"/>';

    /* 3. pads: thick tone-on-tone strokes with a hairline edge */
    for (i = 0; i < count(S.pads); i++) {
      var pp = pathOf(walk(4, false, i < 2 ? (i ? A2 : A1) : null));
      pads += '<path class="fm-bd-pad-edge" pathLength="1" style="--i:' + (i + 2) + '" d="' + pp + '"/><path class="fm-bd-pad" pathLength="1" style="--i:' + (i + 2) + '" d="' + pp + '"/>';
    }

    /* 4. long lattice lines */
    for (i = 0; i < count(S.lines); i++) {
      if (R() < 0.5) { x = ri(1, cols - 1) * u + 0.5; lines += 'M' + x + ' 0V' + H; }
      else { y = ri(1, rows - 1) * u + 0.5; lines += 'M0 ' + y + 'H' + W; }
    }
    lines = '<path class="fm-bd-line" d="' + lines + '"/>';

    /* 5. a construction circle on one anchor: dashed inner ring, cross, tick scale */
    for (i = 0; i < S.circles; i++) {
    var cc0 = i === 0 ? A1 : near(i % 2 ? A2 : A1, 5);
    var cx = cc0[0] * u, cy = cc0[1] * u, r = ri(i ? 2 : 4, i ? 5 : 7) * u, tk = '';
    circles += '<circle class="fm-bd-line" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
      '<circle class="fm-bd-line fm-bd-dash" cx="' + cx + '" cy="' + cy + '" r="' + (r - u / 2) + '"/>' +
      '<circle class="fm-bd-line" cx="' + cx + '" cy="' + cy + '" r="' + u + '"/>' +
      '<path class="fm-bd-line" d="M' + (cx - r - u) + ' ' + (cy + 0.5) + 'H' + (cx + r + u) + 'M' + (cx + 0.5) + ' ' + (cy - r - u) + 'V' + (cy + r + u) + '"/>';
    var a0 = ri(0, 7) * 45;
    for (var a = a0; a <= a0 + 135; a += 5) {
      var rad = a * Math.PI / 180, l = a % 15 === 0 ? 10 : 5;
      tk += 'M' + n2(cx + Math.cos(rad) * r) + ' ' + n2(cy + Math.sin(rad) * r) + 'L' + n2(cx + Math.cos(rad) * (r + l)) + ' ' + n2(cy + Math.sin(rad) * (r + l));
    }
    circles += '<path class="fm-bd-tick" d="' + tk + '"/>';
    if (i === 0) fx += '<g class="fm-bd-sweep" style="transform-origin:' + cx + 'px ' + cy + 'px"><path class="fm-bd-tick" d="M' + cx + ' ' + (cy + 0.5) + 'h' + r + '"/>' +
      '<rect class="fm-bd-bit" x="' + (cx + r - 10) + '" y="' + (cy - 3) + '" width="10" height="6"/></g>';
    }
    /* rays: long 45-degree lines through the first anchor, and nested arcs on the second */
    if (S.rays) {
      var ax = A1[0] * u, ay = A1[1] * u, L = W + H, ry0 = '';
      ry0 += 'M' + (ax - L) + ' ' + (ay - L) + 'L' + (ax + L) + ' ' + (ay + L) + 'M' + (ax - L) + ' ' + (ay + L) + 'L' + (ax + L) + ' ' + (ay - L);
      ry0 += 'M' + (ax - L + 2 * u) + ' ' + (ay - L) + 'L' + (ax + L + 2 * u) + ' ' + (ay + L);
      circles += '<path class="fm-bd-line" d="' + ry0 + '"/>';
      for (i = 2; i <= 6; i += 2) circles += '<circle class="fm-bd-line' + (i === 4 ? ' fm-bd-dash' : '') + '" cx="' + (A2[0] * u) + '" cy="' + (A2[1] * u) + '" r="' + (i * u + u / 2) + '"/>';
    }
    /* ...and a wireframe globe on the other */
    if (S.globe) {
    var gx = A2[0] * u, gy = A2[1] * u, gr = ri(2, 3) * u, gl = '';
    [0.5, -0.5, 0.82, -0.82].forEach(function (f) {
      var hw = Math.sqrt(1 - f * f) * gr;
      gl += 'M' + n2(gx - hw) + ' ' + n2(gy + f * gr + 0.5) + 'H' + n2(gx + hw);
    });
    fx += '<circle class="fm-bd-globe" cx="' + gx + '" cy="' + gy + '" r="' + gr + '"/>' +
      '<ellipse class="fm-bd-globe fm-bd-turn" style="--i:1" cx="' + gx + '" cy="' + gy + '" rx="' + n2(gr * 0.36) + '" ry="' + gr + '"/>' +
      '<ellipse class="fm-bd-globe fm-bd-turn" style="--i:3" cx="' + gx + '" cy="' + gy + '" rx="' + n2(gr * 0.72) + '" ry="' + gr + '"/>' +
      '<path class="fm-bd-globe" d="' + gl + 'M' + (gx - gr - 12) + ' ' + (gy + 0.5) + 'H' + (gx + gr + 12) + 'M' + (gx + 0.5) + ' ' + (gy - gr - 12) + 'V' + (gy + gr + 12) + '"/>';
    }

    /* 6. registration marks on every second lattice point */
    for (x = 2 * u; x < W; x += 2 * u) for (y = 2 * u; y < H; y += 2 * u) {
      if (!inRects([x, y], clear)) plus += 'M' + (x - 4) + ' ' + (y + 0.5) + 'h9M' + (x + 0.5) + ' ' + (y - 4) + 'v9';
    }
    plus = '<path class="fm-bd-plus" d="' + plus + '"/>';
    if (S.lattice) plus = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + '-l)"/>' + plus;

    /* 7. perimeter frame: cut corners, a notch top and bottom, corner brackets, rulers */
    if (opts.frame !== false) {
      var m = opts.inset == null ? 12 : opts.inset, t0 = opts.top == null ? m : opts.top, cc = 24, nh = 8;
      var n1 = ri(3, Math.max(4, cols - 8)) * u, nw = ri(2, 4) * u, n3 = ri(3, Math.max(4, cols - 8)) * u, nw2 = ri(2, 4) * u;
      frame = '<path class="fm-bd-frame" pathLength="1" d="M' + (m + cc) + ' ' + (t0 + 0.5) + 'H' + n1 + 'l' + nh + ' ' + nh + 'h' + nw + 'l' + nh + ' ' + (-nh) +
        'H' + (W - m - cc) + 'L' + (W - m - 0.5) + ' ' + (t0 + cc) + 'V' + (H - m - cc) + 'L' + (W - m - cc) + ' ' + (H - m - 0.5) +
        'H' + (n3 + nw2 + 2 * nh) + 'l' + (-nh) + ' ' + (-nh) + 'h' + (-nw2) + 'l' + (-nh) + ' ' + nh + 'H' + (m + cc) +
        'L' + (m + 0.5) + ' ' + (H - m - cc) + 'V' + (t0 + cc) + 'Z"/>';
      var b = m + 8, bl = 14;
      frame += '<path class="fm-bd-bracket" d="M' + b + ' ' + (t0 + 8 + bl) + 'v' + (-bl) + 'h' + bl + 'M' + (W - b - bl) + ' ' + (t0 + 8) + 'h' + bl + 'v' + bl +
        'M' + (W - b) + ' ' + (H - b - bl) + 'v' + bl + 'h' + (-bl) + 'M' + (b + bl) + ' ' + (H - b) + 'h' + (-bl) + 'v' + (-bl) + '"/>';
      var ry = ri(2, Math.max(2, rows - 7)) * u, rt = '';
      for (y = 0; y <= 4 * u; y += 6) rt += 'M' + (m + 0.5) + ' ' + (ry + y + 0.5) + 'h' + (y % 48 === 0 ? 10 : y % 24 === 0 ? 7 : 4);
      var rx = ri(2, Math.max(2, cols - 9)) * u;
      for (x = 0; x <= 6 * u; x += 6) rt += 'M' + (rx + x + 0.5) + ' ' + (H - m - 0.5) + 'v' + (-(x % 48 === 0 ? 10 : x % 24 === 0 ? 7 : 4));
      frame += '<path class="fm-bd-tick" d="' + rt + '"/>';
    }

    /* 8. traces: thin wires, some in bundles of three, ending in a ring, an octagon or a block */
    for (i = 0; i < count(S.traces); i++) {
      var pts = walk(5, i % 2 === 1, i < 6 ? (i % 2 ? A1 : A2) : null), end = pts[pts.length - 1], bundle = R() < S.bundle;
      var st = ' pathLength="1" style="--i:' + i + '" d="';
      traces += '<path class="fm-bd-trace"' + st + pathOf(pts) + '"/>';
      if (bundle) traces += '<path class="fm-bd-trace"' + st + pathOf(offset(pts, 6)) + '"/><path class="fm-bd-trace"' + st + pathOf(offset(pts, -6)) + '"/>';
      if (i < 5) traces += '<path class="fm-bd-packet"' + st + pathOf(pts) + '"/>';
      var kind = R();
      if (end[0] < 8 || end[0] > W - 8 || end[1] < 8 || end[1] > H - 8) continue;
      if (kind < 0.3) bits += '<circle class="fm-bd-ring" cx="' + end[0] + '" cy="' + end[1] + '" r="4"/>';
      else if (kind < 0.5) {
        bits += '<polygon class="fm-bd-star" points="' + polyStr([[0, -11], [2.5, -2.5], [11, 0], [2.5, 2.5], [0, 11], [-2.5, 2.5], [-11, 0], [-2.5, -2.5]]
          .map(function (v) { return [end[0] + v[0], end[1] + v[1]]; })) + '"/>';
      } else if (kind < 0.8) {
        var s = 9, o8 = s * 0.4142;
        bits += '<polygon class="fm-bd-ring" points="' + polyStr([[-o8, -s], [o8, -s], [s, -o8], [s, o8], [o8, s], [-o8, s], [-s, o8], [-s, -o8]]
          .map(function (v) { return [end[0] + v[0], end[1] + v[1]]; })) + '"/>';
      } else bits += '<rect class="fm-bd-bit" x="' + (end[0] - 4) + '" y="' + (end[1] - 4) + '" width="8" height="8"/>';
    }

    /* 9. bits: blocks, bars, slant runs and chevron runs on the lattice */
    for (i = 0; i < count(S.bits); i++) {
      q = R() < 0.6 ? near(i % 2 ? A1 : A2, 5) : [ri(1, cols - 1), ri(1, rows - 1)];
      x = q[0] * u; y = q[1] * u;
      var bk = R(), j, n;
      if (bk < 0.15) bits += '<rect class="fm-bd-bit" x="' + (x + 6) + '" y="' + (y + 6) + '" width="6" height="6"/>';
      else if (bk < 0.3) {
        n = ri(4, 7); var rc = '';
        for (j = 0; j < n; j++) rc += '<circle class="fm-bd-ringchain" cx="' + (x + 14 + j * 10) + '" cy="' + (y + 16) + '" r="8"/>';
        bits += rc;
      }
      else if (bk < 0.5) bits += '<rect class="fm-bd-bit" x="' + (x + 6) + '" y="' + (y - 9) + '" width="' + pick([12, 24, 36]) + '" height="3"/>';
      else if (bk < 0.8) {
        n = ri(3, 7); var sl = '';
        for (j = 0; j < n; j++) sl += 'M' + (x + 8 + j * 10 + 4) + ' ' + (y + 8) + 'h6l-4 10h-6z';
        bits += '<path class="' + (R() < 0.6 ? 'fm-bd-bit' : 'fm-bd-trace') + '" d="' + sl + '"/>';
      } else {
        n = ri(3, 5); var ch = '';
        for (j = 0; j < n; j++) ch += '<path class="fm-bd-chev" style="--i:' + j + '" d="M' + (x + 8 + j * 8) + ' ' + (y + 8) + 'l5 5-5 5"/>';
        bits += ch;
      }
    }

    /* 10. one live accent, on the first anchor */
    x = clamp(A1[0] + ri(-2, 2), 1, cols - 2) * u; y = clamp(A1[1] + ri(-1, 2), 1, rows - 1) * u;
    live = '<rect class="fm-bd-live" x="' + x + '" y="' + (y - 3) + '" width="' + u + '" height="6"/>' +
      '<rect class="fm-bd-live" x="' + (x + u + 6) + '" y="' + (y - 3) + '" width="6" height="6"/>';

    /* 11. echoes and links: the only layers that know where the panels are */
    (opts.echoes || []).forEach(function (e) {
      var o = 8, ep = cutRect(e[0] + o, e[1] + o, e[2], e[3], 12, 2);
      echo += '<polygon class="fm-bd-echo" points="' + polyStr(ep) + '"/>' +
        '<rect class="fm-bd-bit" x="' + (e[0] + e[2] + o - 3) + '" y="' + (e[1] + o + 12) + '" width="6" height="24"/>' +
        '<rect class="fm-bd-bit" x="' + (e[0] + o + 12) + '" y="' + (e[1] + e[3] + o - 3) + '" width="36" height="6"/>';
    });
    (opts.links || []).forEach(function (L) { links += linkPath(L); });

    /* 12. twinkles and a scan line: only visible when motion is on */
    for (i = 0; i < count(7); i++) {
      x = ri(1, Math.max(1, Math.floor((cols - 1) / 2))) * 2 * u; y = ri(1, Math.max(1, Math.floor((rows - 1) / 2))) * 2 * u;
      if (!inRects([x, y], clear)) fx += '<path class="fm-bd-twinkle" style="--i:' + i + '" d="M' + (x - 4) + ' ' + (y + 0.5) + 'h9M' + (x + 0.5) + ' ' + (y - 4) + 'v9"/>';
    }
    fx += '<rect class="fm-bd-scan" width="' + W + '" height="2" style="--h:' + H + 'px"/>';

    function mask(sfx) {
      if (!clear.length) return ['', ''];
      return ['<mask id="' + id + sfx + '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/>' +
        clear.map(function (c) { return '<rect x="' + n2(c[0]) + '" y="' + n2(c[1]) + '" width="' + n2(c[2]) + '" height="' + n2(c[3]) + '" fill="#000"/>'; }).join('') + '</mask>',
        ' mask="url(#' + id + sfx + ')"'];
    }
    var m1 = mask('-m'), m2 = mask('-n'), maskDef = m1[0], maskAttr = m1[1];
    var grain = opts.grain === false ? '' : '<rect class="fm-bd-grain" width="' + W + '" height="' + H + '" filter="url(#' + id + '-g)"/>';
    var defs = '<defs>' +
      '<pattern id="' + id + '-h" width="8" height="8" patternUnits="userSpaceOnUse"><path class="fm-bd-line" d="M-2 2l4-4M0 8l8-8M6 10l4-4"/></pattern>' +
      '<pattern id="' + id + '-d" width="8" height="8" patternUnits="userSpaceOnUse"><circle class="fm-bd-speck" cx="4" cy="4" r="1"/></pattern>' +
      '<pattern id="' + id + '-l" width="' + (u / 2) + '" height="' + (u / 2) + '" patternUnits="userSpaceOnUse"><circle class="fm-bd-speck" cx="' + (u / 4) + '" cy="' + (u / 4) + '" r="1"/></pattern>' +
      (grain ? '<filter id="' + id + '-g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="' + (seed % 997) + '" result="n"/>' +
        '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.62" result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/></filter>' : '') +
      maskDef + '</defs>';

    /* Two layers: everything that never moves (including the grain filter) and everything that does,
       so the moving layer can repaint without re-rasterising the still one. */
    var head = ' viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" preserveAspectRatio="xMinYMin slice" aria-hidden="true" focusable="false">';
    return '<svg class="fm-bd fm-bd-still"' + head + defs + ghost + plates + '<g' + maskAttr + '>' + solids + pads + '</g>' + lines + circles + plus + frame + grain + echo + '</svg>' +
      '<svg class="fm-bd fm-bd-moving"' + head + '<defs>' + m2[0] + '</defs><g' + m2[1] + '>' + traces + bits + live + '</g>' + fx + links + '</svg>';
  }

  /* mountBackdrop(el, opts) - browser only. Fills el (a .fm-backdrop) at its own size and redraws, debounced, when it resizes.
     Inside el.parentNode:  [data-fm-clear] elements become clear areas,  [data-fm-echo] elements get an echo,
     and opts.links = [{from: '#a', to: '#b', fromSide: 'right', toSide: 'left', live: true}] wires two elements together. */
  function mountBackdrop(el, opts) {
    opts = opts || {};
    var host = el.parentNode;
    function rectOf(n, box, padding) {
      var r = n.getBoundingClientRect(), p = padding || 0;
      return [r.left - box.left - p, r.top - box.top - p, r.width + 2 * p, r.height + 2 * p];
    }
    var lastW = 0, lastH = 0, timer = null;
    function draw() {
      var box = el.getBoundingClientRect(), o = {}, k;
      for (k in opts) o[k] = opts[k];
      o.width = Math.max(1, Math.round(box.width)); o.height = Math.max(1, Math.round(box.height));
      if (lastW) el.setAttribute('data-fm-redraw', '');   /* later draws skip the boot animation */
      lastW = o.width; lastH = o.height;
      o.clear = (opts.clear || []).concat([].map.call(host.querySelectorAll('[data-fm-clear]'), function (n) { return rectOf(n, box, 8); }));
      o.echoes = (opts.echoes || []).concat([].map.call(host.querySelectorAll('[data-fm-echo]'), function (n) { return rectOf(n, box); }));
      o.links = (opts.links || []).map(function (L) {
        if (L.a && L.b) return L;
        var a = host.querySelector(L.from), b = host.querySelector(L.to), c = {};
        if (!a || !b) return null;
        for (k in L) c[k] = L[k];
        c.a = rectOf(a, box); c.b = rectOf(b, box);
        return c;
      }).filter(Boolean);
      el.innerHTML = backdrop(o);
    }
    draw();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () {
      var box = el.getBoundingClientRect();
      if (Math.round(box.width) === lastW && Math.round(box.height) === lastH) return;
      clearTimeout(timer); timer = setTimeout(draw, 120);
    }).observe(host);
    return draw;
  }

  var api = { dotNumeral: dotNumeral, dotRidge: dotRidge, barcode: barcode, dial: dial, backdrop: backdrop, mountBackdrop: mountBackdrop, glyphs: Object.keys(FONT).join('') };
  root.FieldManualArt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
