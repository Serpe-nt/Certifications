// Draws a course diagram (window.DIAGRAMS, data in site/diagrams/cN.js) as a blueprint SVG string. No DOM, no state.
// Areas are containers (Region, VPC, Availability Zone, subnet) drawn back to front; nodes are services; links are arrows
// from one box's edge to another's. Every area or node with an entry in `parts` is clickable (data-part).
window.DG = (() => {
  const U = 40;   // px per grid unit
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Break a label into lines that fit wpx at the given font size (about 0.55 em per character).
  function lines(text, wpx, size) {
    const max = Math.max(4, Math.floor(wpx / (size * 0.55))), out = [];
    let cur = "";
    for (const word of String(text).split(/\s+/)) {
      if (cur && (cur + " " + word).length > max) { out.push(cur); cur = word; } else cur = cur ? cur + " " + word : word;
    }
    if (cur) out.push(cur);
    return out;
  }
  const mid = b => [(b.x + b.w / 2) * U, (b.y + b.h / 2) * U];
  // Where the line from a's centre towards b's centre leaves a's box.
  function edge(a, b) {
    const [ax, ay] = mid(a), [bx, by] = mid(b), dx = bx - ax, dy = by - ay;
    const t = Math.min(dx ? (a.w * U / 2) / Math.abs(dx) : Infinity, dy ? (a.h * U / 2) / Math.abs(dy) : Infinity);
    return [ax + dx * t, ay + dy * t];
  }
  const hot = (parts, id) => (parts[id] ? ` data-part="${esc(id)}" tabindex="0" role="button" aria-label="${esc(parts[id].name || id)}"` : "");
  function svg(dg, key = "dg") {
    const all = {}, parts = dg.parts || {};
    (dg.areas || []).forEach(a => { all[a.id] = a; });
    (dg.nodes || []).forEach(n => { all[n.id] = n; });
    const W = dg.w * U, H = dg.h * U, mk = `dg-ar-${esc(key)}`;
    let h = `<svg class="dg" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(dg.title)}">` +
      `<defs><marker id="${mk}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>`;
    // An area's label is drawn again above the arrows (with a halo, style.css .dg-al), so an arrow never crosses it; the
    // copy inside the area's group stays for its text and its click target, hidden.
    let al = "";
    for (const a of dg.areas || []) {
      al += `<text class="dg-al" x="${a.x * U + 8}" y="${a.y * U + 16}" aria-hidden="true">${esc(a.label)}</text>`;
      h += `<g class="dg-area${a.dash ? " dash" : ""}${a.kind ? " k-" + esc(a.kind) : ""}${parts[a.id] ? " hot" : ""}"${hot(parts, a.id)}>` +
        `<rect x="${a.x * U}" y="${a.y * U}" width="${a.w * U}" height="${a.h * U}"/>` +
        `<text x="${a.x * U + 8}" y="${a.y * U + 16}">${esc(a.label)}</text></g>`;
    }
    for (const [f, t, label] of dg.links || []) {
      const a = all[f], b = all[t];
      if (!a || !b) continue;
      const [x1, y1] = edge(a, b), [x2, y2] = edge(b, a);
      // a label sits above a mostly level arrow and to the right of a mostly upright one, never on the line
      const up = Math.abs(y2 - y1) > Math.abs(x2 - x1), lx = (x1 + x2) / 2 + (up ? 7 : 0), ly = (y1 + y2) / 2 + (up ? 4 : -6);
      h += `<g class="dg-link"><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" marker-end="url(#${mk})"/>` +
        (label ? `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${up ? "start" : "middle"}">${esc(label)}</text>` : "") + `</g>`;
    }
    h += al;
    for (const n of dg.nodes || []) {
      const [cx, cy] = mid(n), ls = lines(n.label, n.w * U - 12, 12.5);
      h += `<g class="dg-node${parts[n.id] ? " hot" : ""}"${hot(parts, n.id)}>` +
        `<rect x="${n.x * U}" y="${n.y * U}" width="${n.w * U}" height="${n.h * U}"/>` +
        ls.map((l, i) => `<text x="${cx}" y="${(cy + (i - (ls.length - 1) / 2) * 15 + 4.5).toFixed(1)}" text-anchor="middle">${esc(l)}</text>`).join("") + `</g>`;
    }
    return h + `</svg>`;
  }
  return { svg, lines, U };
})();
