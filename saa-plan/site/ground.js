// The ground behind the page, drawn the way the owner's "Excimer" poster is built: a modular grid of yellow-tinted
// hairlines with a dot at every crossing, a few yellow crosshairs locked onto crossings, charcoal plates (some with a
// halftone of dots, crosses or triangles), black discs with a cross like screw heads, one broad black ring, two arrow
// marks pointing at the centre axis, and yellow filaments that run in from the edges to a junction.
// It holds no information except the day's real number as a ghost (Datum's rule), is seeded with the view so each day
// keeps its own drawing, and is coloured only by classes (style.css), so every colour stays a token.
// Ground.draw({width, height, seed, ghost, top, quiet}) returns one SVG string; app.js bdDraw() puts it in #bd.
window.Ground = (() => {
  const n2 = v => Math.round(v * 10) / 10;
  function rng(seed) {
    let h = 2166136261;
    for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function draw(o) {
    const W = Math.max(1, o.width | 0), H = Math.max(1, o.height | 0), top = o.top || 0, quiet = !!o.quiet;
    const R = rng(o.seed || "ground"), pick = a => a[(R() * a.length) | 0];
    const wide = W >= 860;   // a phone has no empty ground to give the figure: grid and marks only (Datum)
    // the module: the centre line of the window is a grid line, the first row starts under the rail
    const c = Math.round(Math.min(230, Math.max(150, W / 7)));
    const xs = [], ys = [];
    for (let x = W / 2 - Math.ceil(W / 2 / c) * c; x <= W + 1; x += c) xs.push(n2(x));
    for (let y = top + c * 0.5; y <= H + 1; y += c) ys.push(n2(y));
    const out = [], defs = [];
    let i = 0;

    defs.push(
      `<pattern id="g-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle class="g-pat" cx="4.5" cy="4.5" r="1.6"/></pattern>`,
      `<pattern id="g-xs" width="12" height="12" patternUnits="userSpaceOnUse"><path class="g-pat-l" d="M3 3L9 9M9 3L3 9"/></pattern>`,
      `<pattern id="g-tris" width="12" height="11" patternUnits="userSpaceOnUse"><path class="g-pat" d="M6 2L10 9H2Z"/></pattern>`,
      `<pattern id="g-stripes" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="g-pat" width="6" height="14"/></pattern>`);

    // plates: whole cells, sometimes two side by side, some printed with a halftone
    const cells = [];
    for (let a = 0; a < xs.length - 1; a++) for (let b = 0; b < ys.length - 1; b++) cells.push([a, b]);
    if (wide) {
      const nPlates = quiet ? 3 : 6;
      for (let k = 0; k < nPlates && cells.length; k++) {
        const [a, b] = cells.splice((R() * cells.length) | 0, 1)[0], w = R() < 0.35 && a < xs.length - 2 ? 2 : 1;
        const x = xs[a], y = ys[b], cw = (xs[a + w] - x), fill = pick(["", "", "g-dots", "g-xs", "g-tris", "g-stripes"]);
        out.push(`<rect class="g-plate" x="${x}" y="${y}" width="${n2(cw)}" height="${c}" style="--i:${k}"/>`);
        if (fill) out.push(`<rect class="g-tex" x="${n2(x + c * 0.12)}" y="${n2(y + c * 0.12)}" width="${n2(cw - c * 0.24)}" height="${n2(c * 0.76)}" fill="url(#${fill})" style="--i:${k}"/>`);
      }
      // black discs with a cross (screw heads), in a pair or alone, each on a plate in a cell near the top corners
      const nDisc = quiet ? 1 : 1 + ((R() * 3) | 0);
      for (let k = 0; k < nDisc; k++) {
        const a = R() < 0.5 ? k : xs.length - 2 - k, b = (R() * Math.min(2, ys.length - 1)) | 0;
        if (a < 0 || a >= xs.length - 1 || b >= ys.length - 1) continue;
        const cx = n2((xs[a] + xs[a + 1]) / 2), cy = n2((ys[b] + ys[b + 1]) / 2), r = n2(c * 0.36), s = n2(r * 0.55);
        out.push(`<rect class="g-plate" x="${xs[a]}" y="${ys[b]}" width="${n2(xs[a + 1] - xs[a])}" height="${c}" style="--i:${k}"/>`);   // a disc sits on its plate, as on the poster
        out.push(`<g class="g-disc" style="--i:${k}"><circle cx="${cx}" cy="${cy}" r="${r}"/><path d="M${cx - s} ${cy}H${cx + s}M${cx} ${cy - s}V${cy + s}"/></g>`);
      }
      // one broad ring, half off the window at the bottom
      if (!quiet) {
        const cx = n2(pick([xs[1], xs[xs.length - 2]] .filter(v => v != null)) || W * 0.2), cy = n2(H - c * 0.2);
        out.push(`<circle class="g-ring" cx="${cx}" cy="${cy}" r="${n2(c * 1.05)}" stroke-width="${n2(c * 0.34)}"/>`);
      }
    }

    // the grid: hairlines that draw in one after another, a dot on every crossing
    for (const x of xs) out.push(`<path class="g-line" pathLength="1" d="M${x} ${top}V${H}" style="--i:${i++}"/>`);
    for (const y of ys) out.push(`<path class="g-line" pathLength="1" d="M0 ${y}H${W}" style="--i:${i++}"/>`);
    let dots = "";
    for (const x of xs) for (const y of ys) dots += `M${x} ${y}h.01`;
    out.push(`<path class="g-node" d="${dots}"/>`);

    // crosshairs locked onto a few crossings; the first is the one live mark of the view
    const nx = Math.max(1, xs.length - 2), ny = Math.max(1, ys.length - 1), taken = new Set();
    const nCross = wide ? (quiet ? 3 : 5) : 2;
    for (let k = 0; k < nCross; k++) {
      const a = 1 + ((R() * nx) | 0), b = (R() * ny) | 0, key = a + "," + b;
      if (taken.has(key) || xs[a] == null || ys[b] == null) continue;
      taken.add(key);
      const x = xs[a], y = ys[b];
      out.push(`<path class="g-cross${k ? "" : " is-live"}" d="M${x - 11} ${y}H${x + 11}M${x} ${y - 11}V${y + 11}" style="--i:${k}"/>`);
    }

    // two arrow marks at the edges, pointing at the centre axis, on one row
    if (wide && ys.length > 3) {
      const y = ys[2 + ((R() * (ys.length - 3)) | 0)];
      out.push(`<path class="g-tri" d="M${xs[0] + c * 0.4} ${y - 7}l10 7l-10 7z"/>`, `<path class="g-tri" d="M${xs[xs.length - 1] - c * 0.4} ${y - 7}l-10 7l10 7z"/>`);
    }

    // filaments: yellow strands that run out from a junction to beyond the window's edges, drawn on arrival. The
    // junction sits in ground the page leaves open: on the overview the masthead band between the title and the
    // numbers, in the day view the right-hand column under the sidebar's panels.
    if (wide) {
      const [jx, jy] = quiet ? [W * (0.84 + R() * 0.06), H * (0.74 + R() * 0.12)] : [W * (0.52 + R() * 0.1), top + (H - top) * (0.14 + R() * 0.1)];
      {
        const j = 0, arms = 4 + ((R() * 2) | 0), tips = [], a0 = R() * Math.PI * 2;
        for (let k = 0; k < arms; k++) {
          // each arm leaves in its own direction and wanders: four points, joined by a smooth curve (Catmull-Rom as cubics)
          const a = a0 + (k / arms) * Math.PI * 2 + (R() - 0.5) * 0.6, len = Math.max(W, H) * (0.55 + R() * 0.45);
          const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, p = [[jx, jy]];
          for (const f of [0.22, 0.55, 1]) { const w = (R() - 0.5) * len * 0.22 * (f < 1 ? 1 : 0.5); p.push([jx + ux * len * f + px * w, jy + uy * len * f + py * w]); }
          let d = `M${n2(jx)} ${n2(jy)}`;
          for (let s = 0; s < 3; s++) {
            const p0 = p[Math.max(0, s - 1)], p1 = p[s], p2 = p[s + 1], p3 = p[Math.min(3, s + 2)];
            d += `C${n2(p1[0] + (p2[0] - p0[0]) / 6)} ${n2(p1[1] + (p2[1] - p0[1]) / 6)} ${n2(p2[0] - (p3[0] - p1[0]) / 6)} ${n2(p2[1] - (p3[1] - p1[1]) / 6)} ${n2(p2[0])} ${n2(p2[1])}`;
          }
          const b = Math.atan2(p[1][1] - jy, p[1][0] - jx);
          tips.push([jx + Math.cos(b) * 16, jy + Math.sin(b) * 16]);
          out.push(`<path class="g-fil" pathLength="1" d="${d}" style="--i:${k}"/>`);
        }
        // the junction: the strands thicken into one body with concave sides
        tips.sort((p, q) => Math.atan2(p[1] - jy, p[0] - jx) - Math.atan2(q[1] - jy, q[0] - jx));
        let d = `M${n2(tips[0][0])} ${n2(tips[0][1])}`;
        for (let k = 1; k <= tips.length; k++) { const t = tips[k % tips.length]; d += `Q${n2(jx)} ${n2(jy)} ${n2(t[0])} ${n2(t[1])}`; }
        out.push(`<path class="g-blob" d="${d}Z" style="--i:${j}"/>`);
      }
    }

    const ghost = o.ghost ? `<text class="g-ghost" x="${n2(W - c * 0.25)}" y="${n2(H - c * 0.2)}" text-anchor="end">${esc(o.ghost)}</text>` : "";
    return `<svg class="ground" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">` +
      `<defs>${defs.join("")}</defs>${ghost}${out.join("")}</svg>`;
  }
  return { draw };
})();
