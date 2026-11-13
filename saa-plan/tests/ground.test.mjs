// The ground (site/ground.js): one SVG string, the same for the same seed, no broken numbers at any window size,
// and on a phone only the grid and its marks (Datum: no figure below 860 px).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.runInNewContext(readFileSync(new URL("../site/ground.js", import.meta.url), "utf8"), ctx);
const G = ctx.window.Ground;

test("ground: seeded, sized, no NaN", () => {
  for (const [width, height] of [[1440, 900], [1920, 1080], [2560, 1440], [860, 600], [390, 800], [1, 1]]) {
    for (const quiet of [false, true]) {
      const svg = G.draw({ width, height, seed: "d3", quiet, top: 48, ghost: quiet ? "03" : "" });
      assert.match(svg, /^<svg class="ground"/);
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${width}x${height} quiet=${quiet}`);
      assert.equal(svg, G.draw({ width, height, seed: "d3", quiet, top: 48, ghost: quiet ? "03" : "" }), "same seed, same drawing");
    }
  }
  const wide = G.draw({ width: 1440, height: 900, seed: "overview", top: 48 });
  assert.ok((wide.match(/class="g-line"/g) || []).length > 6 && /g-fil/.test(wide) && /g-blob/.test(wide));
  const phone = G.draw({ width: 390, height: 800, seed: "overview", top: 48 });
  assert.ok(/g-line/.test(phone) && !/g-fil|g-plate|g-disc/.test(phone), "a phone gets the grid and marks only");
  assert.doesNotMatch(G.draw({ width: 1440, height: 900, seed: "x", ghost: "<b>" }), /<b>/, "the ghost is escaped");
});
