// End-to-end check of the real page in headless Chromium. Day and step ids are read from the plan (window.PLAN), not written here.
// Needs the site served (Go server with a fresh database for the sync checks) and Playwright on NODE_PATH:
//   NODE_PATH=$(npm root -g) BASE=http://localhost:8090/ node tests/e2e.mjs
// PW_CHANNEL=msedge (or chrome) drives an installed browser instead of Playwright's own Chromium.
// Writes screenshots to $SHOTS (default: a temp folder). Exits non-zero on the first failure.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080/";
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), "saa-shots-"));
const KEY = "saa-plan-v2";
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const errors = [];
let step = "";
const t0 = Date.now();
function log(s) { step = s; console.log(`· ${s}`); }

function track(page) {
  // A 409 is the server's normal "someone else saved first" answer; the page merges and retries. The offline check cuts the network on purpose.
  page.on("console", m => { if (m.type() === "error" && !/status of 409|ERR_INTERNET_DISCONNECTED/.test(m.text())) errors.push(`[${step}] ${m.text()}`); });
  page.on("pageerror", e => errors.push(`[${step}] ${e.message}`));
  page.on("dialog", d => d.accept());
  return page;
}
// GIPHY is not reached from the tests: its GIFs are answered with a 1×1 picture (or refused, to check the fallback).
const GIF1 = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const GIPHY = "https://media.giphy.com/**";
const stubGifs = ctx => ctx.route(GIPHY, r => r.fulfill({ contentType: "image/gif", body: GIF1 }));
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, ...opts });
  await stubGifs(ctx);
  return { ctx, page: track(await ctx.newPage()) };
}
// The results GIF on screen: its GIPHY id, and which outcome's list (ace, pass, fail) it comes from.
const gifOn = page => page.evaluate(() => {
  const img = document.querySelector("#qz-body .qz-res.has-gif .qz-gif img");
  const id = img && (/media\.giphy\.com\/media\/([A-Za-z0-9]+)\/giphy\.gif$/.exec(img.src) || [])[1];
  return id ? { id, o: Object.keys(window.GIFS).find(o => window.GIFS[o].some(g => g[0] === id)) } : null;
});
const serverState = page => page.evaluate(() => fetch("api/state").then(r => r.ok ? r.json() : null).catch(() => null));
const hash = page => page.evaluate(() => location.hash);
// Open a day's card: a step id, "quiz", or nothing for the day's first open step.
async function openCard(page, day, at = "") {
  await page.evaluate(h => { location.hash = h; }, `#${day}${at ? "/" + at : ""}`);
  await page.waitForFunction(([d, a]) => !document.getElementById("flow").hidden && (a ? location.hash === `#${d}/${a}` : location.hash.startsWith(`#${d}/`)), [day, at]);
}
// "Mark complete" ignores clicks for a moment after a card appears (double-click guard), so wait it out.
async function complete(page) { await page.waitForTimeout(380); await page.click("#fl-nav [data-complete]"); }
const stepOn = (page, id) => page.evaluate(id => document.querySelector(`#fl-strip [data-at="${id}"]`).classList.contains("on"), id);
async function goHome(page) { if (await page.locator("#flow").isVisible()) await page.click("#flow [data-home]"); }
const kind = v => v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
const openPanel = (page, id) => page.evaluate(id => { document.getElementById(id).open = true; }, id);
const state = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || "null"), KEY);
async function setState(page, fn) {
  await page.evaluate(([k, src]) => {
    const s = JSON.parse(localStorage.getItem(k) || "{}");
    new Function("s", src)(s);
    localStorage.setItem(k, JSON.stringify(s));
  }, [KEY, `(${fn})(s)`]);
}
// Mark a day's items ticked straight in storage (the UI path is tested on Day 1).
const tickDays = (page, days) => page.evaluate(([k, days]) => {
  const s = JSON.parse(localStorage.getItem(k) || "{}");
  s.ticks = s.ticks || {};
  for (const d of window.PLAN) if (d.id && days.includes(d.day)) for (const g of d.groups) for (const it of g.items) s.ticks[it[0]] = true;
  localStorage.setItem(k, JSON.stringify(s));
}, [KEY, days]);

// Answer the question on screen: right or wrong, by reading the key from window.QUIZ.
async function answer(page, right = true) {
  const s = await state(page);
  const id = s.run.ids[s.run.i];
  const q = await page.evaluate(id => window.QUIZ.find(x => x.id === id), id);
  const picks = right ? q.a : [...Array(q.o.length).keys()].filter(i => !q.a.includes(i)).slice(0, q.a.length);
  for (const oi of picks) await page.click(`#qz-body [data-o="${oi}"]`);
  return { id, q };
}

let srv = null;
try {
  // ---------- first visit ----------
  log("first visit renders the overview, bank loaded");
  let { ctx, page } = await newPage();
  // Run against a fresh server database: the page uploads this browser's state on first sync.
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await setState(page, s => { s.settings = { start: new Date().toISOString().slice(0, 10), fx: false, sound: false }; });
  await page.reload();
  const bank = await page.evaluate(() => ({ n: window.QUIZ.length, days: [...new Set(window.QUIZ.map(q => q.day))] }));
  console.log(`  bank: ${bank.n} questions, pools ${bank.days.join(",")}`);
  assert.ok(bank.n >= 300, "question bank should be loaded");
  // Days and steps come from the plan, so these checks hold when the plan changes.
  const P = await page.evaluate(() => {
    const days = window.PLAN.filter(d => d.id).map(d => ({ id: d.id, day: d.day, quiz: d.quiz || "", ids: d.groups.flatMap(g => g.items.map(it => it[0])) }));
    const check = window.PLAN.filter(d => d.id).flatMap(d => d.groups.filter(g => g.t === "check" && g.items.length > 1).map(g => ({ day: d.id, ids: g.items.map(it => it[0]) })))[0];
    // a step with topics, key points and docs of its own: the card with every kind of helper material
    const help = Object.keys(window.STEP_TAGS).find(id => window.KEYS[id] && (window.KEYS[id].k || []).length >= 2 && (window.KEYS[id].docs || []).length);
    return { days, check, help, mockAfter: window.MOCK_AFTER };
  });
  const dayOfStep = id => P.days.find(d => d.ids.includes(id)).id;
  const D1 = P.days[0], LAST = P.days[P.days.length - 1];
  const QA = P.days.find(d => d.quiz === "tags");            // the first day that ends with a quiz on its own topics
  const QB = P.days[QA.day], OD = P.days[QB.day];            // the day after it (failed, then retaken), and the one after that
  assert.equal(QB.quiz, "tags", "these checks expect two quiz days in a row");
  assert.ok(P.check.day === QA.id && P.check.ids[0] !== QA.ids[QA.ids.length - 2], "these checks expect the first quiz day to have a self-check block of several cards");
  const [ck1, ck2] = P.check.ids, HELP = P.help, HELPDAY = dayOfStep(HELP);
  console.log(`  plan: ${P.days.length} days; first quiz days ${QA.day} and ${QB.day}; helper card ${HELP}`);
  assert.ok(await page.locator("#home").isVisible() && await page.locator("#flow").isHidden(), "the overview is the first screen");
  assert.equal(await page.locator("#map .dt").count(), P.days.length, "one tile per day");
  assert.equal(await page.locator("#stats .st").count(), 6);
  assert.match(await page.textContent("#stats .st-lv"), /Level\s*1/, "a level cell, starting at level 1");
  assert.match(await page.textContent("#next"), /Start Day 1/);
  await page.screenshot({ path: path.join(SHOTS, "01-overview.png"), fullPage: false });

  log("today first: the day and its next step at the top, with one big button; the numbers and the tiles further down");
  const topBox = () => page.evaluate(() => {
    const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
    return { next: r("#next"), day: r("#next .nx-day"), go: r("#next .nx-go"), big: r("#next .nx-go .big"), stats: r("#stats"), map: r("#map"), h: innerHeight };
  });
  let tb = await topBox();
  assert.ok(tb.next.b <= tb.stats.t && tb.stats.t <= tb.map.t, "the card for today comes first, then the numbers, then the day tiles");
  assert.ok(tb.go.l >= tb.day.r && Math.abs(tb.go.t - tb.day.t) < 2, `the next step beside the day: ${JSON.stringify([tb.day, tb.go])}`);
  assert.ok(tb.big.b <= tb.h, "the big button is on the first screen");
  assert.equal(await page.locator("#next .primary").count(), 1, "one orange button on the card");
  assert.equal(await page.locator("#next .segs i").count(), D1.ids.length + (D1.quiz ? 1 : 0), "one segment per card of the day");
  await page.setViewportSize({ width: 1920, height: 1080 });
  tb = await topBox();
  assert.ok(tb.next.w > 1100 && tb.go.l >= tb.day.r && tb.big.b <= tb.h, `a full-screen window: the overview takes more of it, still side by side: ${JSON.stringify(tb.next)}`);
  await page.screenshot({ path: path.join(SHOTS, "01b-overview-wide.png") });
  await page.setViewportSize({ width: 1200, height: 900 });

  // ---------- one step per card ----------
  log("Start Day 1 opens the first step alone on a card");
  await page.click('#next a[href="#d1"]');
  await page.waitForSelector("#flow:not([hidden])");
  const [s1, s2, s3] = await page.evaluate(() => window.PLAN.find(d => d.id === "d1").groups.flatMap(g => g.items.map(it => it[0])));
  assert.equal(await hash(page), `#d1/${s1}`);
  assert.equal(await page.locator("#card .c-t").count(), 1, "one step on screen");
  const n1 = await page.evaluate(() => window.PLAN.find(d => d.id === "d1").groups.reduce((a, g) => a + g.items.length, 0));
  const q1 = D1.quiz ? 1 : 0;
  assert.equal((await page.textContent("#fl-count")).trim(), `Step 1 of ${n1 + q1}`);
  assert.equal(await page.locator("#fl-strip .dot").count(), n1 + q1, "a dot per step, plus one for the quiz on a quiz day");
  assert.ok(await page.locator(".tb").isHidden(), "the big title block steps aside");

  log("Mark complete moves on, Next skips, Back and the arrow keys return, Undo reopens");
  await complete(page);
  assert.equal(await hash(page), `#d1/${s2}`);
  assert.ok((await state(page)).ticks[s1]);
  await page.click("#fl-nav [data-complete]");            // an instant second click must not complete the next card
  assert.ok(!(await state(page)).ticks[s2], "double click completes one step only");
  await page.click("#fl-nav [data-next]");                // skip the second step
  assert.equal(await hash(page), `#d1/${s3}`);
  await page.keyboard.press("ArrowLeft");
  assert.equal(await hash(page), `#d1/${s2}`);
  await page.click("#fl-nav [data-back]");
  assert.equal(await hash(page), `#d1/${s1}`);
  assert.match(await page.textContent("#fl-nav .fl-mid"), /Completed/);
  assert.ok(await stepOn(page, s1));
  await page.click("#fl-nav [data-undo]");
  assert.ok(!(await state(page)).ticks[s1]);
  await page.reload();
  assert.equal(await hash(page), `#d1/${s1}`, "a reload stays on the card");

  // ---------- something to see when a step and a block are finished ----------
  log("finishing a step shows what is left; finishing a block of the day gets a banner");
  const g0 = await page.evaluate(() => window.PLAN.find(d => d.id === "d1").groups[0].items.map(it => it[0]));
  assert.ok(g0.length >= 2 && g0[0] === s1, "these checks expect Day 1 to open with a block of several steps");
  await goHome(page);
  await page.click("#b-fx");                                 // effects on for this part (the run starts with them off; the switch is on the overview)
  assert.equal((await state(page)).settings.fx, true);
  await openCard(page, D1.id, s1);
  await complete(page);
  await page.waitForSelector(".fx-toast.show");
  assert.match(await page.textContent(".fx-toast"), new RegExp(`1 of ${n1}`), "the toast counts the steps of the day");
  assert.ok(await page.evaluate(id => document.querySelector(`#fl-strip [data-at="${id}"]`).classList.contains("pop"), s1), "the finished step's dot pops");
  for (let i = 1; i < g0.length; i++) await complete(page);
  await page.waitForSelector(".fx-banner.k-block.show");
  assert.match(await page.textContent(".fx-banner"), /Block 1 of \d+ done/);
  assert.ok(await page.locator("#fl-strip .fl-g.wave").count() === 1, "the finished block's dots bounce");
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(SHOTS, "02a-block-done.png") });
  assert.ok(await page.locator("canvas.fx-canvas").count() === 1, "effects draw on a canvas");
  await goHome(page);
  await page.click("#b-fx");
  assert.equal((await state(page)).settings.fx, false, "effects are off again for the rest of the run");

  log("the quiz card stays locked while steps are open, and lists them");
  await openCard(page, QA.id, "quiz");
  assert.ok(await page.locator("#fl-nav [data-quiz-start]").isDisabled());
  assert.equal(await page.locator("#card .c-open li").count(), QA.ids.length);
  await page.click("#card .c-open li:first-child button");
  assert.equal(await hash(page), `#${QA.id}/${QA.ids[0]}`);

  // ---------- helper material on the card ----------
  log("a step card carries key points; its panels carry AWS docs, terms, exam topics, practice and its own notes");
  await openCard(page, HELPDAY, HELP);
  assert.ok(await page.locator("#card .c-key li").count() >= 2, "key points");
  if (await page.evaluate(id => !!window.KEYS[id].why, HELP)) {
    assert.ok(await page.evaluate(() => { const t = document.querySelector("#card .c-t"), where = document.querySelector("#card .c-where"), w = document.querySelector("#card .c-why"), k = document.querySelector("#card .c-key"); return !!w && w.compareDocumentPosition(k) & 4 && (!where || (t.compareDocumentPosition(where) & 4 && where.compareDocumentPosition(w) & 4)); }), "where to do it right after the title, then why it exists, then the details");
    assert.ok(await page.locator("#card .c-key .k-list .k-l").count() >= 2, "labelled points");
  }
  assert.ok(await page.locator("#side-r .c-tags li").count() >= 1, "exam topics in the exam panel");
  const links = await page.$$eval("#side-l .c-docs a", as => as.map(a => [a.href, a.target, a.rel]));
  assert.ok(links.length >= 1 && links.every(([h, t, r]) => /^https:\/\/(docs\.)?aws\.amazon\.com\//.test(h) && t === "_blank" && r.includes("noopener")), "AWS docs open in a new tab");
  await page.fill(`#card [data-inote="${HELP}"]`, "look at this again");
  await page.waitForTimeout(600);
  assert.equal((await state(page)).inotes[HELP], "look at this again");
  assert.ok(await page.evaluate(() => document.querySelector('#side-l details[data-sec="terms"]').open), "terms start open in their panel");
  await page.screenshot({ path: path.join(SHOTS, "02-step-card.png"), fullPage: true });

  log("wide screens: the article with the sidebar (On the exam, then Look it up) to its right, centred together; narrower screens: both under it; only the page scrolls");
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  const box3 = () => Promise.all(["#side-l", "#card", "#side-r", "#fl-strip"].map(sel => page.$eval(sel, el => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; })));
  // no part of the day view keeps its own scroll bar: what doesn't fit lengthens the page
  const ownScroll = () => page.evaluate(() => [...document.querySelectorAll("#flow *")].filter(e => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1).map(e => e.id || e.className));
  let [pl, pc, pr, ps] = await box3();
  const mid = b => (b.l + b.r) / 2;
  assert.ok(pc.r <= pr.l && Math.abs(pr.t - pc.t) < 2 && pl.t >= pr.b && Math.abs(pl.l - pr.l) < 2, `the sidebar right of the article, level with its top, Look it up under On the exam: ${JSON.stringify([pc, pr, pl])}`);
  const vw = await page.evaluate(() => document.body.getBoundingClientRect().width);   // the page's width without the scroll bar's gutter (clientWidth counts it in some browsers)
  assert.ok(pc.r - pc.l > 900 && Math.abs(pc.l - (vw - pr.r)) < 12 && Math.abs(mid(ps) - mid(pc)) < 2, `a wide article, centred with its sidebar, the dots over the article: ${JSON.stringify([pc, pr, ps])}`);
  assert.deepEqual(await ownScroll(), [], "nothing scrolls on its own");
  const [bk, bn] = await page.evaluate(id => { const d = window.PLAN.find(x => x.groups && x.groups.some(g => g.items.some(it => it[0] === id))); return [d.groups.findIndex(g => g.items.some(it => it[0] === id)) + 1, d.groups.length]; }, HELP);
  assert.equal(await page.locator("#fl-strip .fl-g.cur").count(), 1, "the block you are in is underlined in the strip");
  if (bn > 1) assert.match(await page.textContent("#fl-blk"), new RegExp(`, block ${bk} of ${bn}$`), "and named under it");
  const navKeys = await page.$$eval("#fl-nav [aria-keyshortcuts]", bs => bs.map(b => b.getAttribute("aria-keyshortcuts")).join(" "));
  assert.ok(/ArrowLeft/.test(navKeys) && /ArrowRight/.test(navKeys) && /Enter/.test(navKeys), `the bar's buttons name their keys: ${navKeys}`);
  await page.screenshot({ path: path.join(SHOTS, "02b-step-card-wide.png") });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.waitForTimeout(300);
  [pl, pc, pr, ps] = await box3();
  assert.ok(pr.t >= pc.b && pl.t >= pr.b && Math.abs(mid(ps) - mid(pc)) < 2, "under the card: On the exam, then Look it up; the dots over the card's middle");
  assert.deepEqual(await ownScroll(), [], "nothing scrolls on its own");
  await page.click('#side-l details[data-sec="terms"] > summary');      // fold it
  await page.click("#fl-nav [data-next]");
  if (await page.locator('#side-l details[data-sec="terms"]').count())
    assert.ok(!(await page.evaluate(() => document.querySelector('#side-l details[data-sec="terms"]').open)), "a folded helper list stays folded on the next card");

  log("a rewritten card reads like an article: course, headline, where, lessons; a step you carry out lists its actions and how you know it worked");
  {
    const rw = await page.evaluate(() => {
      const ids = Object.keys(window.KEYS).filter(id => window.KEYS[id].head);
      const day = id => window.PLAN.find(x => x.groups && x.groups.some(g => g.items.some(it => it[0] === id))).id;
      const lect = ids.find(id => !window.KEYS[id].do && /^<b>[^<]+<\/b>\s*→/.test(window.PLAN.flatMap(x => x.groups || []).flatMap(g => g.items).find(it => it[0] === id)[1]));
      const act = ids.find(id => window.KEYS[id].do && window.KEYS[id].done);
      return { lect, lday: lect && day(lect), act, aday: act && day(act), head: lect && window.KEYS[lect].head, n: act && window.KEYS[act].do.length };
    });
    if (rw.lect) {
      await openCard(page, rw.lday, rw.lect);
      assert.equal(await page.textContent("#card .c-hl"), rw.head, "the card's own headline");
      assert.ok(await page.evaluate(() => { const k = document.querySelector("#card .c-kick"), t = document.querySelector("#card .c-hl"), w = document.querySelector("#card .c-where"), l = document.querySelector("#card .c-les"), y = document.querySelector("#card .c-why"); return !!(k && w && l && y) && k.compareDocumentPosition(t) & 4 && t.compareDocumentPosition(w) & 4 && w.compareDocumentPosition(l) & 4 && l.compareDocumentPosition(y) & 4; }), "course, headline, where, lessons, then why it exists");
      assert.ok(await page.locator("#card .c-why p").count() === 2, "the problem, then the idea, in one box");
    }
    if (rw.act) {
      await openCard(page, rw.aday, rw.act);
      assert.equal(await page.locator("#card .c-do li").count(), rw.n, "the step's numbered actions");
      assert.match(await page.textContent("#card .c-done"), /^Done when:/);
    }
    await openCard(page, HELPDAY, HELP);
  }

  log("step practice: three questions on this step");
  // a tampered GIF pointer in this browser's preferences must not break the results
  await page.evaluate(() => { const u = JSON.parse(localStorage.getItem("saa-plan-v2-ui") || "{}"); u.gif = { ace: -1, pass: -1, fail: "x" }; localStorage.setItem("saa-plan-v2-ui", JSON.stringify(u)); });
  await page.reload();
  await openCard(page, HELPDAY, HELP);
  await page.click(`#side-r [data-step-quiz="${HELP}"]`);
  let s = await state(page);
  assert.equal(s.run.kind, "step");
  assert.equal(s.run.ids.length, 3);
  assert.ok(await page.evaluate(([ids, step]) => ids.every(id => { const q = window.QUIZ.find(x => x.id === id); return q.ref.includes(step) || q.tags.some(t => window.STEP_TAGS[step].includes(t)); }), [s.run.ids, HELP]), "questions that name the step or are on its topics");
  log("quiz navigation: Previous and Next move without answering, the squares show right and wrong, Continue finds what is left");
  assert.equal(await page.locator("#qz-body .qz-map button").count(), 3, "one square per question");
  assert.ok(await page.locator('#qz-body [data-qz="prev"]').isDisabled(), "no Previous on the first question");
  await page.click('#qz-body [data-qz="skip"]');                       // Next leaves question 1 open
  assert.equal((await state(page)).run.i, 1);
  await answer(page, true); await page.click('#qz-body [data-qz="check"]');
  assert.match(await page.textContent('#qz-body [data-qz="next"]'), /Next question/);
  assert.equal(await page.locator("#qz-body .qz-map button.ok").count(), 1, "the answered square turns green");
  assert.match(await page.textContent("#qz-body .qz-verdict"), /\+10 XP/, "a right answer shows the XP it earns");
  await page.keyboard.press("ArrowLeft");                                // back to the open one
  s = await state(page);
  assert.ok(s.run.i === 0 && !s.run.ans[s.run.ids[0]] && await page.locator("#qz-body .qz-o").count() >= 4, "Previous shows question 1, still open");
  await answer(page, true); await page.click('#qz-body [data-qz="check"]');
  assert.match(await page.textContent('#qz-body [data-qz="next"]'), /Continue at question 3/, "the main button goes on to the question still open");
  assert.ok(await page.locator('#qz-body [data-qz="prev"]').isDisabled(), "nothing before the first question");
  await page.click('#qz-body [data-go="1"]');
  assert.ok(await page.locator("#qz-body .qz-verdict.ok").count() === 1 && await page.locator('#qz-body [data-qz="check"]').count() === 0, "an answered question shows its feedback, read-only");
  await page.click('#qz-body [data-qz="next"]');
  assert.equal((await state(page)).run.i, 2);
  await answer(page, true); await page.click('#qz-body [data-qz="check"]');
  assert.match(await page.textContent('#qz-body [data-qz="next"]'), /See results/);
  await page.click('#qz-body [data-qz="next"]');
  await page.waitForSelector("#qz-body .qz-res.ok");
  assert.equal(await page.locator("#qz-body .stars span.on").count(), 3, "three stars for every answer right");
  assert.match(await page.textContent("#qz-body .qz-rw"), /Level \d+[\s\S]*\+\d+ XP/, "the level and the XP this round earned");
  const g1 = await gifOn(page);
  assert.equal(g1 && g1.o, "ace", "every answer right: a GIF from the ace list");
  await page.click('#qz-body [data-qz="finish"]');
  assert.equal((await state(page)).run, null);
  assert.match(await page.textContent("#side-r .c-prac"), /answered 3/);

  // ---------- self-check card ----------
  log("self-check card: reveal the model answer, mark shaky");
  await openCard(page, QA.id, ck1);
  await page.click(`#card [data-flip="${ck1}"]`);
  assert.ok(await page.locator("#ca-" + ck1).isVisible());
  await page.click(`#card [data-conf="shaky"][data-cid="${ck1}"]`);
  assert.equal((await state(page)).conf[ck1], "shaky");
  assert.ok((await state(page)).ticks[ck1], "marking a card completes the step");
  assert.equal(await hash(page), `#${QA.id}/${ck2}`, "and moves on");
  await page.click("#fl-nav [data-back]");
  assert.match(await page.textContent(`#card [data-flip="${ck1}"]`), /Shaky/);

  // ---------- a day without a quiz ----------
  if (!D1.quiz) {
    log("a day without a quiz is done with its last step");
    await tickDays(page, P.days.filter(d => d.day < QA.day).map(d => d.day));   // every day in front of the first quiz day
    await page.reload();
    assert.equal(await page.getAttribute(`[data-day="${D1.id}"]`, "data-done"), "1");
    await openCard(page, D1.id);
    assert.equal(await hash(page), `#${D1.id}/done`, "a finished day opens on its summary");
    assert.equal(await page.locator("#fl-strip .dot.qd").count(), 0, "no quiz dot");
    await goHome(page);
  }

  // ---------- the first quiz day through the cards, then pass the quiz ----------
  log(`complete the last Day ${QA.day} steps → the quiz card; Enter starts the quiz`);
  // every step but the last two straight in storage; those two through the cards
  await page.evaluate(([k, ids]) => {
    const st = JSON.parse(localStorage.getItem(k));
    for (const id of ids.slice(0, -2)) st.ticks[id] = true;
    localStorage.setItem(k, JSON.stringify(st));
  }, [KEY, QA.ids]);
  await page.reload();
  await openCard(page, QA.id);
  assert.equal(await hash(page), `#${QA.id}/${QA.ids[QA.ids.length - 2]}`, "a day opens on its first open step");
  await complete(page);
  await complete(page);
  assert.equal(await hash(page), `#${QA.id}/quiz`, "after the last step comes the quiz card");
  assert.match(await page.textContent("#card"), /End-of-day quiz/);
  await page.waitForTimeout(300);                          // let the card finish fading in before the picture
  await page.screenshot({ path: path.join(SHOTS, "03-quiz-card.png") });
  await page.keyboard.press("Enter");
  await page.waitForSelector("#qz-body .qz-o");

  log("answer 30 questions right, with feedback after each");
  const asked = (await state(page)).run.ids;
  assert.equal(asked.length, 30);
  assert.ok(await page.evaluate(([ids, id]) => { const tp = window.QZ.topics(window.PLAN, window.STEP_TAGS)[id]; return ids.every(q => { const t = window.QUIZ.find(x => x.id === q).tags; return t.some(x => tp.own.has(x)) && t.every(x => tp.sofar.has(x)); }); }, [asked, QA.id]),
    "every question is on one of the day's topics, and none touches a topic taught later");
  // the combo meter: right answers in a row and a bar towards the next streak badge
  const meter = () => page.$eval("#qz-meta .qz-cb", el => ({ cls: el.className, txt: el.textContent, w: el.querySelector(".cb-m i").style.width }));
  let m = await meter();
  assert.ok(/0 in a row/.test(m.txt) && /3$/.test(m.txt) && m.w === "0%", "the combo meter is in the quiz header from the start, empty, aiming at 3: " + JSON.stringify(m));
  for (let i = 0; i < 30; i++) {
    await answer(page, true);
    if (i === 0) {
      // keyboard path on the first one: Enter checks
      await page.keyboard.press("Enter");
    } else await page.click('#qz-body [data-qz="check"]');
    await page.waitForSelector("#qz-body .qz-verdict.ok");
    if (i === 2) {
      await page.waitForSelector("#quiz .fx-badge");
      assert.match(await page.textContent("#quiz .fx-badges"), /3 in a row/, "a streak of right answers is called out inside the quiz");
      const top = await page.$eval("#quiz .fx-badges", el => el.getBoundingClientRect().top);
      assert.ok(top < 40, `the streak badge sits at the top of the screen (top ${top})`);
      assert.match(await page.textContent("#qz-meta"), /3 in a row/, "the run of right answers shows in the quiz header");
      m = await meter();
      assert.ok(/\bboom\b/.test(m.cls) && /\bh1\b/.test(m.cls) && m.w === "100%", "the meter fills and bursts at a streak mark: " + JSON.stringify(m));
    }
    if (i === 3) { m = await meter(); assert.ok(m.w === "50%" && /5$/.test(m.txt) && /\bup\b/.test(m.cls), "after a mark the bar starts again towards the next one: " + JSON.stringify(m)); }
    if (i === 9) assert.match((await meter()).cls, /\bh3\b/, "the meter heats up as the run grows");
    if (i === 0) assert.ok(await page.locator("#qz-body .qz-map button.ok.just").count() === 1, "the square just answered pops");
    if (i === 9) { await page.waitForTimeout(100); await page.screenshot({ path: path.join(SHOTS, "04c-streak-badge.png") }); }
    if (i === 0) {
      assert.ok(await page.locator("#qz-body .qz-study .qz-refs li").count() >= 1, "feedback shows where to study");
      // every option is explained, and the explanation sits visibly inside its option
      const inside = await page.$$eval("#qz-body .qz-fb li", lis => lis.map(li => {
        const w = li.querySelector(".qz-why"); if (!w) return false;
        const a = li.getBoundingClientRect(), b = w.getBoundingClientRect();
        return b.height > 0 && b.top >= a.top && b.bottom <= a.bottom + 1 && b.left >= a.left && b.right <= a.right + 1;
      }));
      assert.ok(inside.length >= 4 && inside.every(Boolean), "every option shows its explanation inside the option");
      await page.screenshot({ path: path.join(SHOTS, "04-feedback-right.png") });
      // on a wide screen, where to study moves out of the card into the free space to its left
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.waitForTimeout(350);                      // the panel slides in
      const [side, card] = await Promise.all(["#qz-body .qz-study", "#quiz"].map(s => page.$eval(s, el => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top }; })));
      assert.ok(side.r <= card.l - 8 && Math.abs(side.t - card.t) < 2, "on a wide screen, where to study sits left of the quiz card, level with its top");
      await page.screenshot({ path: path.join(SHOTS, "04b-feedback-wide.png") });
      await page.setViewportSize({ width: 1200, height: 900 });
    }
    await page.click('#qz-body [data-qz="next"]');
  }
  await page.waitForSelector("#qz-body .qz-res.ok");
  assert.match(await page.textContent("#qz-body .qz-score"), /30/);
  // badges take turns (two on screen at a time), so "Perfect score" may come after the last streak badge
  await page.waitForFunction(() => /Perfect score/.test(document.querySelector("#quiz .fx-badges").textContent), null, { timeout: 20000 });
  assert.ok(await page.locator("#quiz .fx-badge:not(.out)").count() <= 2, "at most two badges on screen at once");
  const g2 = await gifOn(page);
  assert.ok(g2 && g2.o === "ace" && g2.id !== g1.id, "the next ace result shows the next GIF in the rotation");
  await page.waitForTimeout(1400);                         // the stars and the XP bar settle
  await page.screenshot({ path: path.join(SHOTS, "05-result-pass.png") });
  const ach = (await state(page)).ach;
  for (const id of ["first", "row5", "row10", "row20", "row30", "pass1", "perfect"]) assert.ok(ach[id], `badge ${id} earned`);
  assert.equal((await state(page)).rowBest, 30, "the longest run of right answers is kept");
  await page.click('#qz-body [data-qz="finish"]');
  await page.waitForFunction(h => location.hash === h, `#${QA.id}/done`, { timeout: 3000 });
  // the top rung of the ladder: a big banner with an icon; the dimmed page round it is an effect, so not with effects off
  await page.waitForSelector(".fx-banner.show.k-day .b-i");
  assert.match(await page.textContent(".fx-banner"), new RegExp(`Day ${QA.day} complete`), "finishing a day gets the day's banner");
  assert.equal(await page.locator(".fx-veil.show").count(), 0, "no veil with effects off");
  assert.match(await page.textContent("#card .c-t"), new RegExp(`Day ${QA.day} is done`));
  assert.match(await page.textContent("#fl-nav"), new RegExp(`Start Day ${QB.day}`));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, "06-day-done.png") });
  s = await state(page);
  assert.ok(s.quiz[QA.id].passed && s.quiz[QA.id].best === 30);
  assert.ok(s.dayDone[QA.id]);
  await page.click(`#fl-nav a[href="#${QB.id}"]`);
  await page.waitForFunction(h => location.hash === h, `#${QB.id}/${QB.ids[0]}`);
  await goHome(page);
  assert.equal(await page.getAttribute(`[data-day="${QA.id}"]`, "data-done"), "1", "passing the quiz completes the day");
  assert.match(await page.textContent("#next"), new RegExp(`Start Day ${QB.day}`));

  // ---------- the next day: fail, then retake shows new questions ----------
  log(`Day ${QB.day}: miss 7 → fail at 23/30, notebook + review queue filled; every answer has its effect, a miss breaks the run`);
  await tickDays(page, [QB.day]);
  await page.reload();
  assert.equal(await page.getAttribute(`[data-day="${QB.id}"]`, "data-quiz"), "1", "day shows quiz pending");
  assert.equal(await page.getAttribute(`[data-day="${QB.id}"]`, "data-done"), "0");
  assert.match(await page.textContent("#next"), new RegExp(`Take the Day ${QB.day} quiz`));
  // every answer calls its effect (sound and stars inside; the switches decide what plays)
  await page.evaluate(() => { window.__ans = []; for (const k of ["right", "wrong", "combo"]) { const f = window.FX[k]; window.FX[k] = (...a) => { window.__ans.push([k, a[0]]); return f(...a); }; } });
  await page.click(`#next [data-quiz-start="${QB.id}"]`);
  const first = (await state(page)).run.ids.slice();
  assert.equal(first.length, 30);
  assert.equal(new Set(first).size, 30);
  const MISS = [0, 1, 2, 6, 7, 8, 9];                      // 6 ends a run of three
  for (let i = 0; i < 30; i++) {
    const ok = !MISS.includes(i);
    const { q } = await answer(page, ok);
    await page.click('#qz-body [data-qz="check"]');
    await page.waitForSelector(`#qz-body .qz-verdict.${ok ? "ok" : "bad"}`);
    if (i === 0) {
      assert.ok(await page.locator("#qz-body .qz-fb li.wrong").count() >= 1, "wrong pick is marked");
      assert.ok(await page.locator("#qz-body .qz-fb li.right").count() === q.a.length, "right answer is marked");
      assert.match(await page.textContent("#qz-meta .qz-cb"), /0 in a row/, "a miss with no run leaves the meter at 0");
      await page.fill("#qz-body [data-note]", "mixed up stateful and stateless");
      await page.screenshot({ path: path.join(SHOTS, "07-feedback-wrong.png") });
    }
    if (i === 6) assert.match(await page.textContent("#qz-meta .qz-cb.broke"), /Streak lost at 3/, "a miss after a run says the streak is lost");
    await page.click('#qz-body [data-qz="next"]');
  }
  {
    const calls = await page.evaluate(() => window.__ans);
    assert.equal(calls.filter(c => c[0] === "wrong").length, 7, "a wrong answer's effect on every miss");
    assert.equal(calls.length, 30, "one effect per answer");
    assert.deepEqual(calls.filter(c => c[0] === "combo").map(c => c[1]), [3, 3, 5, 10, 15, 20], "the streak marks burst");
    assert.deepEqual(calls.filter(c => c[0] === "wrong").map(c => c[1]), [0, 0, 0, 3, 0, 0, 0], "the wrong effect knows the run it ended");
  }
  await page.waitForSelector("#qz-body .qz-res.bad");
  assert.match(await page.textContent("#qz-body .qz-score"), /23/);
  assert.equal((await gifOn(page) || {}).o, "fail", "a failed quiz gets a GIF from the fail list");
  assert.equal(await page.locator("#qz-body .stars span.on").count(), 0);
  assert.ok(await page.locator("#qz-body .qz-missed > li").count() === 7);
  await page.screenshot({ path: path.join(SHOTS, "08-result-fail.png") });
  s = await state(page);
  assert.equal(Object.keys(s.book).length, 7);
  assert.equal(s.book[first[0]].note, "mixed up stateful and stateless");
  assert.equal(Object.keys(s.srs).length, 7);
  assert.ok(!s.quiz[QB.id].passed);

  log("retake draws the unseen questions");
  // what is left unseen in the day's own pool (earlier quizzes on shared topics used some of it up)
  const unseen = await page.evaluate(([k, id]) => {
    const st = JSON.parse(localStorage.getItem(k)), d = window.PLAN.find(x => x.id === id);
    return window.QZ.dayPool(d, window.QZ.topics(window.PLAN, window.STEP_TAGS), window.QUIZ).map(q => q.id).filter(q => !st.qs[q]);
  }, [KEY, QB.id]);
  const pre = await state(page);
  await page.click('#qz-body [data-qz="retake"]');
  const second = (await state(page)).run.ids;
  const fresh = second.filter(id => unseen.includes(id)).length;
  console.log(`  retake: ${fresh} of 30 not seen before (${unseen.length} were left in the day's pool)`);
  assert.equal(fresh, Math.min(30, unseen.length), "a retake shows every question not seen yet");
  assert.equal(new Set(second).size, 30, "and fills up with questions seen before, none twice");
  log("close mid-quiz keeps progress; resume from the overview");
  await answer(page, true);
  await page.click('#qz-body [data-qz="check"]');
  await page.click('#qz-body [data-qz="next"]');
  await page.click('#quiz .qz-x');
  await page.reload();
  assert.match(await page.textContent("#next"), /Resume quiz/);
  await page.click(`#next [data-quiz-start="${QB.id}"]`);
  assert.equal((await state(page)).run.i, 1);
  for (let i = 1; i < 30; i++) {
    await answer(page, true);
    await page.click('#qz-body [data-qz="check"]');
    await page.click('#qz-body [data-qz="next"]');
  }
  await page.waitForSelector("#qz-body .qz-res.ok");
  {
    // XP only for a right answer that teaches something: the first time, after a miss, or when due for review
    const after = (await state(page)).qs, t = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
    const repeats = second.filter(id => pre.qs[id] && pre.qs[id].last && !(pre.srs[id] && pre.srs[id].due <= t));
    console.log(`  XP rule: ${repeats.length} repeats answered right again`);
    assert.ok(repeats.length > 0 && repeats.every(id => after[id].right === pre.qs[id].right + 1 && after[id].xp === pre.qs[id].xp), "right again on a question already right (not due) earns no more XP");
    assert.ok(second.filter(id => !pre.qs[id]).every(id => after[id].xp === 1), "a first right answer earns XP");
  }
  await page.click('#qz-body [data-qz="finish"]');
  assert.equal(await page.getAttribute(`[data-day="${QB.id}"]`, "data-done"), "1");

  // ---------- notebook, weak spots, cheat sheet ----------
  log("notebook, weak spots, exam wording");
  await openPanel(page, "practice");
  await page.click('#pr-grid [data-sheet="notebook"]');
  await page.waitForSelector("#sheet[open]");
  await page.click('#sh-body [data-nb="all"]');
  assert.equal(await page.locator("#sh-body .nb > li").count(), 7, "all seven misses are in the notebook");
  await page.screenshot({ path: path.join(SHOTS, "09-notebook.png") });
  const dl = page.waitForEvent("download");
  await page.click("#sh-body [data-nb-export]");
  const md = fs.readFileSync(await (await dl).path(), "utf8");
  assert.match(md, /# SAA-C03 wrong-answer notebook/);
  await page.click("#sheet [data-sh-close]");
  await page.click('#pr-grid [data-sheet="weak"]');
  assert.ok(await page.locator("#sh-body .wk > li").count() >= 1);
  assert.match(await page.textContent("#sh-body"), /shaky/i);
  await page.screenshot({ path: path.join(SHOTS, "10-weak.png") });
  await page.click("#sh-body > .qz-refs [data-jump]");    // "Open step" leaves the sheet for that step's card
  assert.ok(await page.locator("#flow").isVisible() && await page.locator("#sheet[open]").count() === 0);
  assert.equal(await hash(page), `#${QA.id}/${ck1}`);
  await goHome(page);
  await openPanel(page, "practice");
  await page.click('#pr-grid [data-sheet="cues"]');
  assert.ok(await page.locator("#sh-body .cues tbody tr").count() >= 20);
  await page.click("#sheet [data-sh-close]");

  // ---------- warm-up and review (move the clock: make misses due) ----------
  log("due reviews show a warm-up, review clears them");
  await setState(page, s => { for (const id in s.srs) s.srs[id].due = "2000-01-01"; s.settings.start = "2000-01-01"; s.slipSkip = new Date().toISOString().slice(0, 10); });
  await page.reload();
  assert.ok(await page.locator("#next .nx-warm").count() === 1, "warm-up strip shown");
  await page.click('#next [data-warm="start"]');
  const wids = (await state(page)).run.ids.slice(), wn = wids.length;
  assert.ok(wn >= 1 && wn <= 5);
  for (let i = 0; i < wn; i++) { await answer(page, true); await page.click('#qz-body [data-qz="check"]'); await page.click('#qz-body [data-qz="next"]'); }
  await page.click('#qz-body [data-qz="finish"]');
  s = await state(page);
  assert.ok(Object.values(s.warm).includes("done"));
  assert.ok(wids.every(id => s.srs[id].step === 1), "on-time right answers move reviews to the next step");

  // ---------- slip guard ----------
  log("slip guard moves the remaining days");
  // start the plan so that the first unfinished day was planned for yesterday
  await page.evaluate(([k, n]) => { const s = JSON.parse(localStorage.getItem(k)); s.slipSkip = ""; const d = new Date(); d.setDate(d.getDate() - n); s.settings.start = d.toISOString().slice(0, 10); s.slips = []; localStorage.setItem(k, JSON.stringify(s)); }, [KEY, OD.day]);
  await page.reload();
  assert.ok(await page.locator("#slip").isVisible());
  await page.screenshot({ path: path.join(SHOTS, "11-slip.png") });
  await page.click('#slip [data-slip]:not([data-slip="skip"])');
  s = await state(page);
  assert.equal(s.slips.length, 1);
  assert.equal(s.slips[0].from, OD.day);
  assert.ok(await page.locator("#slip").isHidden(), "banner gone after the move: " + await page.textContent("#slip"));
  assert.equal(await page.getAttribute(`[data-day="${OD.id}"]`, "data-today"), "1", "the overdue day is today after the move");

  // ---------- focus timer logs time ----------
  log("focus timer logs minutes to the current day");
  await setState(page, s => { s.timer = { mode: "focus", running: true, endAt: Date.now() + 40 * 60000, left: 3000, from: 3000, min: false }; });
  await page.reload();
  await page.click('#timer [data-tm="toggle"]');
  s = await state(page);
  assert.ok(s.log[OD.id] >= 9 && s.log[OD.id] <= 11, `about 10 minutes logged, got ${s.log[OD.id]}`);

  // ---------- drill ----------
  log("which-service drill");
  await openPanel(page, "practice");
  await page.click('#pr-grid [data-drill]');
  await page.waitForSelector("#qz-body .dr-req");
  await page.keyboard.press("1");
  await page.waitForTimeout(1300);
  assert.match(await page.textContent("#qz-meta"), /Score/);
  await page.screenshot({ path: path.join(SHOTS, "12-drill.png") });
  await page.click('#quiz .qz-x');

  // ---------- mock exam ----------
  log(`mock exam locked until Days 1-${P.mockAfter} are done, then a timed 65-question run`);
  assert.ok(await page.locator("#pr-grid [data-mock]").isDisabled());
  await page.evaluate(k => {
    const s = JSON.parse(localStorage.getItem(k));
    for (const d of window.PLAN) if (d.id && d.day <= window.MOCK_AFTER) { for (const g of d.groups) for (const it of g.items) s.ticks[it[0]] = true; if (d.quiz) s.quiz[d.id] = { best: 28, passed: "2026-10-12", tries: [{ at: "2026-10-12", score: 28, n: 30 }] }; }
    localStorage.setItem(k, JSON.stringify(s));
  }, KEY);
  await page.reload();
  assert.equal(await page.locator('#map .dt[data-done="1"]').count(), P.mockAfter, "the days of new material are done, the exam-prep days are not");
  await openPanel(page, "practice");
  assert.ok(await page.locator("#pr-grid [data-mock]").isEnabled());
  await page.click("#pr-grid [data-mock]");
  await page.click('#qz-body [data-qz="go"]');
  s = await state(page);
  assert.equal(s.run.ids.length, 65);
  const doms = await page.evaluate(ids => [1, 2, 3, 4].map(d => ids.filter(id => window.QUIZ.find(q => q.id === id).dom === d).length), s.run.ids);
  console.log(`  mock domains: ${doms.join("/")}`);
  assert.deepEqual(doms, [20, 17, 15, 13]);
  assert.ok(await page.locator("#qz-body .qz-verdict").count() === 0, "no feedback during the mock");
  assert.equal(await page.locator("#quiz .qz-cb").count(), 0, "no combo meter in the mock: it stays exam-like");
  await page.evaluate(() => { window.__ans = []; for (const k of ["right", "wrong", "combo"]) { const f = window.FX[k]; window.FX[k] = (...a) => { window.__ans.push(k); return f(...a); }; } });
  for (let i = 0; i < 10; i++) { await answer(page, i % 2 === 0); await page.click('#qz-body [data-qz="mnext"]'); }
  assert.deepEqual(await page.evaluate(() => window.__ans), [], "no answer effects in the mock");
  await page.click('#qz-body [data-qz="flag"]');
  await page.click('#qz-body [data-qz="grid"]');
  assert.equal(await page.locator("#qz-body .mk-grid button.ans").count(), 10);
  assert.equal(await page.locator("#qz-body .mk-grid button.flag").count(), 1);
  await page.screenshot({ path: path.join(SHOTS, "13-mock-grid.png") });
  await page.click('#qz-body [data-qz="finish-mock"]');
  await page.waitForSelector("#qz-body .qz-res");
  assert.match(await page.textContent("#qz-body .qz-score"), /5 of 65/);
  await page.screenshot({ path: path.join(SHOTS, "14-mock-result.png") });
  await page.click('#qz-body [data-qz="finish"]');
  s = await state(page);
  assert.equal(s.mocks.length, 1);
  assert.equal(s.run, null);

  log("mock clock submits by itself when time is up");
  await openPanel(page, "practice");
  await page.click("#pr-grid [data-mock]");
  await page.click('#qz-body [data-qz="go"]');
  await setState(page, s => { s.run.end = Date.now() - 1000; });
  await page.reload();
  await page.waitForSelector("#quiz[open] .qz-res", { timeout: 5000 });
  assert.equal((await state(page)).mocks.length, 2);
  await page.click('#qz-body [data-qz="finish"]');

  // ---------- scores and the verdict on their own cards ----------
  log("a score typed on its step's card shows in the Scores panel; the verdict sits on its step");
  await openCard(page, dayOfStep("d7e4"), "d7e4");
  await page.fill('#card [data-score="qs7"]', "15");
  assert.equal((await state(page)).scores.qs7, "15");
  assert.equal(await page.inputValue('#scores [data-score="qs7"]'), "15");
  await openCard(page, dayOfStep("d11p1"), "d11p1");
  await page.fill('#card [data-score="pe"]', "780");
  await openCard(page, dayOfStep("d11p2"), "d11p2");
  assert.match(await page.textContent("#card [data-verdict]"), /GO/);
  await goHome(page);

  // ---------- server sync ----------
  log("progress reaches the server and comes back in a fresh browser");
  await page.waitForTimeout(1500);
  srv = await serverState(page);
  if (srv) {
    assert.ok(srv.rev > 0, "server has a revision");
    assert.ok(srv.doc.quiz[QA.id].passed, "server copy has the passed quiz");
    const fresh = await newPage();
    await fresh.page.goto(BASE);
    await fresh.page.waitForFunction(id => document.querySelector(`[data-day="${id}"]`)?.dataset.done === "1", QA.id, { timeout: 5000 });
    console.log(`  server rev ${srv.rev}; fresh browser restored Day ${QA.day} as complete`);
    await fresh.ctx.close();
  } else console.log("  (no backend on this address: skipped)");
  await ctx.close();

  // ---------- mobile + dark ----------
  log("mobile width and dark mode");
  ({ ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, colorScheme: "dark" }));
  await page.goto(BASE);
  if (srv) await page.waitForFunction(id => document.querySelector(`[data-day="${id}"]`)?.dataset.done === "1", QA.id, { timeout: 5000 });
  else { await tickDays(page, [D1.day, QA.day]); await page.reload(); }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 1, `no horizontal scroll on mobile (overflow ${overflow}px)`);
  const [mDay, mGo] = await page.$$eval("#next .nx-day, #next .nx-go", els => els.map(e => { const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom }; }));
  assert.ok(mGo.t >= mDay.b, "on a phone the next step comes under the day");
  await page.screenshot({ path: path.join(SHOTS, "15-mobile-dark.png") });
  await setState(page, s => { s.run = null; });
  await page.reload();
  await openPanel(page, "practice");
  await page.click('#pr-grid [data-sheet="notebook"]');
  await page.waitForSelector("#sheet[open]");
  await page.screenshot({ path: path.join(SHOTS, "16-mobile-notebook.png") });
  await page.click("#sheet [data-sh-close]");
  // a step card on a phone: nothing wider than the screen, the three buttons on screen
  await openCard(page, HELPDAY, HELP);
  const fit = await page.evaluate(() => ({
    over: document.documentElement.scrollWidth - innerWidth,
    nav: ["[data-back]", ".fl-mid", "[data-next]"].map(sel => { const r = document.querySelector("#fl-nav " + sel).getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; })
  }));
  assert.ok(fit.over <= 1, `a step card fits the phone width (overflow ${fit.over}px)`);
  assert.ok(fit.nav.every(Boolean), "Back, the main action and Next are on screen");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, "17-mobile-card.png") });
  await openCard(page, QA.id, "quiz");
  await page.click(`#flow [data-quiz-start="${QA.id}"]`);
  await page.waitForSelector("#quiz[open]");
  await answer(page, false);
  await page.click('#qz-body [data-qz="check"]');
  await page.screenshot({ path: path.join(SHOTS, "18-mobile-feedback.png"), fullPage: false });
  const qOverflow = await page.evaluate(() => { const d = document.getElementById("quiz"); return d.scrollWidth - d.clientWidth; });
  assert.ok(qOverflow <= 1, "quiz dialog fits the phone width");
  await ctx.close();

  log("a touch screen: no key hints, fields that don't make iOS zoom, no notification button, a tap shows a term");
  ({ ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.goto(BASE);
  await openCard(page, HELPDAY, HELP);
  assert.ok(await page.evaluate(() => matchMedia("(hover: none) and (pointer: coarse)").matches), "the browser says touch");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#card textarea")).fontSize), "16px");
  await page.tap("#card .g");
  assert.ok(await page.evaluate(() => { const g = document.querySelector("#card .g.show"); return !!g && getComputedStyle(g, "::after").position === "fixed"; }), "a tap shows the term, across the screen");
  await page.tap('#timer [data-tm="menu"]');
  assert.ok(await page.locator('#tm-pop [data-tm="perm"]').isHidden(), "no notification button: a phone stops the page when it is out of view");
  await page.tap(`#side-r [data-step-quiz="${HELP}"]`);
  await page.waitForSelector("#quiz[open]");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#qz-body .qz-hint .kbd")).display), "none", "no key hints");
  const bar = await page.evaluate(() => { const d = document.getElementById("quiz"); d.scrollTop = 2000; const h = d.querySelector(".qz-h").getBoundingClientRect(), b = d.querySelector(".qz-bar").getBoundingClientRect(); return b.top - h.bottom; });
  assert.ok(Math.abs(bar) <= 1, `the progress bar sticks under the header that wraps on a phone (${bar}px)`);
  await ctx.close();

  // ---------- regressions found in code review ----------
  if (srv) {
    log("two tabs keep each other current");
    const c = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const a = track(await c.newPage()), b = track(await c.newPage());
    const [e1, e2, e3] = LAST.ids;
    await a.goto(BASE + `#${LAST.id}/${e1}`); await b.goto(BASE + `#${LAST.id}/${e2}`);
    await a.waitForTimeout(800);
    await complete(a);
    await b.waitForFunction(id => document.querySelector(`#fl-strip [data-at="${id}"]`).classList.contains("on"), e1, { timeout: 3000 });
    await complete(b);
    await a.waitForFunction(id => document.querySelector(`#fl-strip [data-at="${id}"]`).classList.contains("on"), e2, { timeout: 3000 });
    await b.waitForTimeout(1500);
    let st = await serverState(b);
    assert.ok(st.doc.ticks[e1] && st.doc.ticks[e2], "server has both tabs' ticks");
    await c.close();

    log("two devices editing at once: the conflict merges instead of dropping one side");
    const d1 = await newPage(), d2 = await newPage();
    await d1.page.goto(BASE + `#${LAST.id}/${e3}`); await d2.page.goto(BASE + `#${LAST.id}/${e3}`);
    await d1.page.waitForTimeout(800); await d2.page.waitForTimeout(200);
    await complete(d1.page);
    await d1.page.waitForTimeout(1500);           // d1 saved; d2 hasn't seen it
    await d2.page.click('#fl-tools [data-sheet="daynotes"]');
    await d2.page.fill(`#sh-body textarea[data-notes="${LAST.id}"]`, "note from device two");
    await d2.page.waitForTimeout(2200);           // d2 saves with an old revision, gets 409, merges, saves again
    st = await serverState(d2.page);
    assert.ok(st.doc.ticks[e3] && st.doc.ticks[e1], "device one's tick survived");
    assert.equal(st.doc.notes[LAST.id], "note from device two", "device two's note survived");
    assert.ok(await stepOn(d2.page, e3), "the merged copy is on screen");
    await d1.ctx.close(); await d2.ctx.close();

    log("progress saved before the server existed is merged, not replaced");
    const old = await newPage();
    await old.page.goto(BASE);
    await old.page.evaluate(k => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({ ticks: { d13l1: true }, notes: { d13: "old note" }, inotes: { d13l1: "passport is in the drawer" }, settings: { start: "2026-10-12", fx: false, sound: false } })); }, KEY);
    await old.page.reload();
    await old.page.waitForTimeout(2000);
    st = await serverState(old.page);
    assert.ok(st.doc.notes.d13 === "old note" && st.doc.inotes.d13l1 === "passport is in the drawer" && st.doc.ticks[e3] && st.doc.notes[LAST.id] === "note from device two", "old local progress and server progress both kept");
    await old.ctx.close();

    log("a device that earns badges at startup doesn't overwrite newer settings from another device");
    const a1 = await newPage(), b1 = await newPage();
    await a1.page.goto(BASE); await b1.page.goto(BASE);
    await a1.page.waitForTimeout(800); await b1.page.waitForTimeout(800);       // both have the server copy
    await b1.page.evaluate(k => { const x = JSON.parse(localStorage.getItem(k)); x.ach = {}; localStorage.setItem(k, JSON.stringify(x)); }, KEY);   // as a copy from before badges
    await a1.page.click("#b-set");
    await a1.page.fill("#s-exam", "2026-12-01");
    await a1.page.click('#settings button[value="save"]');
    await a1.page.waitForTimeout(1500);                                          // device one pushed a newer copy
    await b1.page.reload();
    await b1.page.waitForTimeout(2000);
    st = await serverState(b1.page);
    assert.equal(st.doc.settings.exam, "2026-12-01", "device one's exam date survives device two's startup");
    assert.ok(Object.keys(st.doc.ach).length >= 5, "and the badges are still there");
    await a1.ctx.close(); await b1.ctx.close();

    // ---------- several devices at once: the PC, a phone, a tablet ----------
    log("another device's change shows up without a reload; asking for news costs a 304 when nothing changed");
    const N2 = P.days[P.days.length - 2], [n1, n2] = N2.ids;
    const da = await newPage(), db = await newPage();
    await da.page.goto(BASE + `#${N2.id}/${n1}`); await db.page.goto(BASE + `#${N2.id}/${n1}`);
    await da.page.waitForTimeout(800); await db.page.waitForTimeout(800);
    const asks = [];
    db.page.on("response", r => { if (/\/api\/state$/.test(r.url()) && r.request().method() === "GET") asks.push(r.status()); });
    await db.page.evaluate(() => dispatchEvent(new Event("focus")));   // a click into its window, say on the other monitor
    await db.page.waitForTimeout(500);
    assert.deepEqual(asks, [304], "nothing new: the server answers 304, without the document");
    await complete(da.page);
    await da.page.waitForTimeout(1500);
    await db.page.evaluate(() => dispatchEvent(new Event("focus")));
    await db.page.waitForFunction(id => document.querySelector(`#fl-strip [data-at="${id}"]`).classList.contains("on"), n1, { timeout: 3000 });

    log("the focus block belongs to the device in use: a device waking up neither marks you away nor ends a block that moved on elsewhere");
    let tm = (await state(da.page)).timer;
    assert.ok(tm.running && tm.dev, "completing a step started a block on that device");
    const dc = await newPage();                                                   // a phone that goes to sleep
    await dc.page.clock.install();
    await dc.page.goto(BASE + `#${N2.id}/${n2}`);
    await dc.page.waitForTimeout(1000);
    assert.ok((await state(dc.page)).timer.running, "the phone shows the running block");
    await dc.page.clock.fastForward(8 * 60000);                                    // asleep for 8 minutes
    await dc.page.waitForTimeout(1500);
    assert.equal((await serverState(dc.page)).doc.timer.away, 0, "the phone doesn't run the block, so its sleep isn't you leaving");
    assert.equal(await dc.page.locator("#brk[open]").count(), 0);
    await da.page.click('#timer [data-tm="toggle"]');                              // paused on the PC
    await da.page.waitForTimeout(1500);
    await dc.page.clock.fastForward(60 * 60000);                                   // the phone wakes after the block would have ended
    await dc.page.waitForTimeout(1500);
    tm = (await state(dc.page)).timer;
    assert.ok(!tm.running && tm.mode === "focus" && !tm.ask, "it asked for news first and took the pause: " + JSON.stringify(tm));
    assert.equal(await dc.page.locator("#brk[open]").count(), 0, "no 'Focus block done' for a block that was paused");
    await dc.ctx.close();

    log("one quiz on two devices: every answer from both is kept, and a quiz finished on one doesn't come back on the other");
    await openCard(da.page, HELPDAY, HELP);
    await da.page.click(`#side-r [data-step-quiz="${HELP}"]`);
    await da.page.waitForSelector("#quiz[open]");
    await answer(da.page, true); await da.page.click('#qz-body [data-qz="check"]');
    await da.page.click("#quiz .qz-x");
    await da.page.waitForTimeout(1500);
    await openCard(db.page, HELPDAY, HELP);
    await db.page.evaluate(() => dispatchEvent(new Event("focus")));
    await db.page.waitForFunction(() => /Resume/.test(document.querySelector("#side-r [data-step-quiz]")?.textContent || ""), null, { timeout: 3000 });
    await db.page.click(`#side-r [data-step-quiz="${HELP}"]`);
    await db.page.waitForSelector("#quiz[open]");
    assert.equal(Object.keys((await state(db.page)).run.ans).length, 1, "the other device resumes with the first answer");
    // each answers another question before hearing of the other's
    await db.page.click('#qz-body [data-go="1"]'); await answer(db.page, true); await db.page.click('#qz-body [data-qz="check"]');
    await da.page.click(`#side-r [data-step-quiz="${HELP}"]`); await da.page.waitForSelector("#quiz[open]");
    await da.page.click('#qz-body [data-go="2"]'); await answer(da.page, false); await da.page.click('#qz-body [data-qz="check"]');
    await da.page.waitForTimeout(2500);
    assert.equal(Object.keys((await serverState(da.page)).doc.run.ans).length, 3, "the run on the server has the answers of both devices");
    await da.page.evaluate(() => dispatchEvent(new Event("focus")));
    await da.page.waitForFunction(() => /See results/.test(document.querySelector('#qz-body [data-qz="next"]')?.textContent || ""), null, { timeout: 3000 });
    await da.page.click('#qz-body [data-qz="next"]');
    await da.page.waitForSelector("#qz-body .qz-res");
    await da.page.click('#qz-body [data-qz="finish"]');
    await da.page.waitForTimeout(1500);
    await db.page.evaluate(() => dispatchEvent(new Event("focus")));
    await db.page.waitForFunction(() => !document.getElementById("quiz").open, null, { timeout: 3000 });
    assert.equal((await state(db.page)).run, null, "finished on one device: gone on the other, its quiz closed");

    log("changes that can't reach the server say so on the timer strip, and go once it answers");
    await db.ctx.route("**/api/state", r => r.abort("internetdisconnected"));
    await db.page.fill(`#card textarea[data-inote="${HELP}"]`, "written offline");
    await db.page.waitForSelector("#sync-st:not([hidden])", { timeout: 4000 });
    assert.match(await db.page.textContent("#sync-st"), /Not synced|Offline/);
    await db.ctx.unroute("**/api/state");
    await db.ctx.route("**/api/state", r => r.fulfill({ status: 302, headers: { Location: "https://login.example/" } }));   // the sign-in in front of the app
    await db.page.click("#sync-st");                                               // "try now"
    await db.page.waitForFunction(() => document.getElementById("sync-st").dataset.k === "auth", null, { timeout: 3000 });
    assert.match(await db.page.textContent("#sync-st"), /sign in again/);
    await db.ctx.unroute("**/api/state");
    await db.page.evaluate(() => dispatchEvent(new Event("online")));
    await db.page.waitForFunction(() => document.getElementById("sync-st").hidden, null, { timeout: 3000 });
    await db.page.waitForTimeout(1200);
    assert.equal((await serverState(db.page)).doc.inotes[HELP], "written offline", "the note written offline reached the server");
    await da.ctx.close(); await db.ctx.close();
  }

  log("mock with a retired question still submits when time is up");
  ({ ctx, page } = await newPage());
  await page.goto(BASE);
  await page.waitForTimeout(500);
  // started 130 minutes ago, before the quizzes this run has since closed (runOff), so as if nothing was closed since
  await setState(page, s => { s.run = { kind: "mock", day: "", ids: ["m1-001", "m1-999", "m1-002", "m2-003"], ord: {}, ans: { "m1-999": [0] }, flag: {}, i: 2, t0: Date.now() - 7800000, end: Date.now() - 1000, done: false, view: "" }; s.runOff = 0; });
  await page.reload();
  await page.waitForSelector("#quiz[open] .qz-res", { timeout: 5000 });
  assert.match(await page.textContent("#qz-body .qz-score"), /of 3/);
  await page.click('#qz-body [data-qz="finish"]');

  log("drill restarts cleanly while a quiz is unfinished");
  await tickDays(page, [QA.day]);
  await page.reload();
  await openCard(page, QA.id, "quiz");
  await page.click(`#flow [data-quiz-start="${QA.id}"]`);     // "Start quiz" under the card, or "Practice again" on it once passed
  await answer(page, true);
  await page.click('#qz-body [data-qz="check"]');
  await page.click('#quiz .qz-x');
  await goHome(page);
  await openPanel(page, "practice");
  await page.click("#pr-grid [data-drill]");
  await page.evaluate(() => document.getElementById("qz-body").insertAdjacentHTML("beforeend", '<button type="button" data-drill id="again">again</button>'));
  await page.click("#again");
  await page.waitForTimeout(1600);
  assert.notEqual((await page.textContent("#dr-time")).trim(), "60 s", "the restarted drill's clock runs");
  await page.click('#quiz .qz-x');

  log("progress saved under the old 14-day plan: steps and answers stay, day quiz results start again");
  await page.evaluate(([k, id]) => {
    const st = JSON.parse(localStorage.getItem(k));
    delete st.planV;                                   // what a copy from before the 21-day plan looks like
    st.run = null;
    st.quiz = { [id]: { best: 30, passed: "2026-10-12", tries: [{ at: "2026-10-12", score: 30, n: 30 }] } };
    st.dayDone = { [id]: "2026-10-12" };
    st.qs = { "q01-001": { seen: 2, right: 1, last: 1, at: "2026-10-12" } };
    st.inotes = { d1a1: "kept" };
    localStorage.setItem(k, JSON.stringify(st));
  }, [KEY, QA.id]);
  await page.reload();
  assert.equal(await page.getAttribute(`[data-day="${QA.id}"]`, "data-done"), "0", "an old quiz result does not complete a day of the new plan");
  assert.equal(await page.getAttribute(`[data-day="${QA.id}"]`, "data-quiz"), "1", "its steps are still done, the quiz is open again");
  await page.click("#b-snd");                          // any change saves the migrated copy
  const mig = await state(page);
  assert.deepEqual([mig.planV, Object.keys(mig.quiz).length, mig.qs["q01-001"].seen, mig.inotes.d1a1, !!mig.ticks[QA.ids[0]]], [4, 0, 2, "kept", true]);

  log("progress saved under the 21-day plan: a day was put in front, so what was saved for a day moves down with it");
  const wasDay = "d" + (QA.day - 1);                    // where this day sat in the 21-day plan
  await page.evaluate(([k, was]) => {
    const st = JSON.parse(localStorage.getItem(k));
    st.planV = 2;
    st.quiz = { [was]: { best: 29, passed: "2026-10-13", tries: [{ at: "2026-10-13", score: 29, n: 30 }] } };
    st.dayDone = { [was]: "2026-10-13" };
    st.notes = { [was]: "a note on the day that moved", d1: "a note on Day 1" };
    st.log = { [was]: 42 };
    localStorage.setItem(k, JSON.stringify(st));
  }, [KEY, wasDay]);
  await page.reload();
  assert.equal(await page.getAttribute(`[data-day="${QA.id}"]`, "data-done"), "1", "the passed quiz went along with its day");
  await page.click("#b-snd");
  const sh = await state(page);
  assert.deepEqual([sh.planV, sh.quiz[QA.id].best, sh.notes[QA.id], sh.notes.d1, sh.log[QA.id], wasDay in sh.quiz], [4, 29, "a note on the day that moved", "a note on Day 1", 42, false]);

  log("progress saved under plan 3: Days 9 and 10 moved in front of Day 8, and what was saved for each day moved with it");
  await page.evaluate(k => {
    const st = JSON.parse(localStorage.getItem(k)), q = n => ({ best: n, passed: "", tries: [{ at: "2026-10-14", score: n, n: 30 }] });
    st.planV = 3;
    st.quiz = { d8: q(18), d9: q(19), d10: q(20) };
    st.notes = { d8: "exam questions", d9: "containers", d10: "the edge", d1: "Day 1" };
    st.log = { d8: 8, d9: 9, d10: 10 };
    st.slips = [{ from: 9, n: 1 }, { from: 12, n: 1 }];
    st.timer = { ...st.timer, day: "d10" };
    st.cost = { ...st.cost, items: [{ id: "swap-test", k: Object.keys(window.BILLABLE.kinds)[0], label: "", day: "d9", at: Date.now(), gone: 0 }] };
    localStorage.setItem(k, JSON.stringify(st));
  }, KEY);
  await page.reload();
  await page.click("#b-snd");
  {
    const sw = await state(page);
    assert.deepEqual([sw.planV, sw.quiz.d8.best, sw.quiz.d9.best, sw.quiz.d10.best], [4, 19, 20, 18], "quiz results follow their days");
    assert.deepEqual([sw.notes.d8, sw.notes.d9, sw.notes.d10, sw.notes.d1], ["containers", "the edge", "exam questions", "Day 1"], "day notes follow their days");
    assert.deepEqual([sw.log.d8, sw.log.d9, sw.log.d10], [9, 10, 8], "focus time follows its day");
    assert.deepEqual(sw.slips.map(x => x.from), [8, 12], "a slip from Day 9 now starts at Day 8");
    assert.equal(sw.timer.day, "d9", "the timer credits the day that moved");
    assert.equal(sw.cost.items.find(x => x.id === "swap-test").day, "d8", "a cost guard item keeps its day");
    assert.match(await page.textContent(`[data-day="d8"]`), /Containers/, "Day 8 is the containers day");
  }


  log("hostile import is sanitized; invalid import changes nothing");
  await openPanel(page, "practice");
  await page.click("#b-set");
  const before = Object.keys((await state(page)).ticks).length;
  await page.setInputFiles("#s-file", { name: "bad.json", mimeType: "application/json", buffer: Buffer.from("[1,2,3]") });
  await page.waitForTimeout(300);
  assert.equal(Object.keys((await state(page)).ticks).length, before, "invalid file: nothing changed");
  if (!(await page.locator("#settings[open]").count())) await page.click("#b-set");
  const evil = { settings: { start: "2026-10-12", portal: "javascript:alert(1)", fx: false }, ticks: { d1a1: true }, quiz: null,
    drill: { best: "<img src=x id=pwn>" }, mocks: [{ at: "x", pct: "<b id=pwn2>" }], book: { "q01-001": { misses: "<i id=pwn3>", note: 5 } },
    inotes: { d1a1: 5, d1a2: "<img src=x id=pwn4>" }, notes: { d1: "<img src=x id=pwn5>" },
    ach: { "<b id=pwn6>": "2026-10-12", first: "<img src=x id=pwn7>" }, rowBest: "<i id=pwn8>",
    timer: { mode: "<b>", running: true, at: "x", up: -5, left: 1e9 } };
  // "__proto__" as a key only survives as text: an object literal would set the prototype instead
  const evilText = JSON.stringify({ ...evil, qs: { "q01-001": { seen: 1, right: 1e40 }, "q01-002": { seen: 5, right: -3 } } })
    .replace(/^\{/, '{"__proto__":{"zz":5},').replace('"ach":{', '"ach":{"__proto__":{"where":"<img src=x id=pwn9>"},');
  await page.setInputFiles("#s-file", { name: "evil.json", mimeType: "application/json", buffer: Buffer.from(evilText) });
  await page.waitForTimeout(500);
  const ev = await state(page);
  assert.deepEqual([kind(ev.quiz), ev.drill.best, ev.settings.portal, ev.mocks[0].pct, ev.book["q01-001"].misses, kind(ev.inotes.d1a1)], ["object", 0, "", 0, 1, "undefined"]);
  // the markup date is dropped; the file's one right answer then earns "First one right" again, quietly, with a real date
  assert.deepEqual([/^\d{4}-\d{2}-\d{2}$/.test(ev.ach.first), ev.rowBest, ev.timer.mode, ev.timer.up, ev.timer.left], [true, 0, "focus", 0, 3000], "badges, record and timer validated");
  assert.deepEqual(await page.evaluate(() => [({}).zz, ({}).where]), [undefined, undefined], "a __proto__ key never reaches Object.prototype");
  assert.deepEqual([ev.qs["q01-001"].right, ev.qs["q01-002"].right], [1, 0], "answer counts are clamped: right is between 0 and seen");
  assert.match(await page.textContent("#stats .st-lv"), /Level\s*\d+/, "the level still renders (no endless loop, no NaN)");
  await openPanel(page, "practice");
  await page.click('#pr-grid [data-sheet="notebook"]');
  assert.equal(await page.locator("#pwn, #pwn2, #pwn3").count(), 0, "no injected markup");
  await page.click("#sheet [data-sh-close]");
  await page.click('#pr-grid [data-sheet="badges"]');
  assert.ok(await page.locator("#sh-body .ach li").count() >= 10, "the badges sheet lists every badge");
  assert.equal(await page.locator("#pwn6, #pwn7, #pwn8, #pwn9").count(), 0, "no injected markup from badges");
  await page.click("#sheet [data-sh-close]");
  assert.ok(await page.locator("#next .hero-t").count() === 1, "page still renders after the import");
  await openCard(page, "d1", "d1a2");
  assert.equal(await page.inputValue('#card [data-inote="d1a2"]'), "<img src=x id=pwn4>", "a step note is shown as text");
  await page.click('#fl-tools [data-sheet="daynotes"]');
  assert.match(await page.textContent("#sh-body .in-note"), /pwn4/);
  assert.equal(await page.locator("#pwn4, #pwn5").count(), 0, "notes are never rendered as markup");
  await page.click("#sheet [data-sh-close]");
  await ctx.close();

  // ---------- reading: display settings, focus view, the card's own question, search (browser-only, its own context) ----------
  log("display settings, focus view, the knowledge check on a card, search over everything");
  ({ ctx, page } = await newPage({ viewport: { width: 1600, height: 1000 } }));
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.goto(BASE);
  await setState(page, s => { s.settings = { start: new Date().toISOString().slice(0, 10), fx: false, sound: false }; s.inotes = { [Object.keys(window.STEP_TAGS)[0]]: "zebra <img src=x id=pwnS> crossing" }; });
  await page.reload();
  await page.click("#b-set");
  assert.equal(await page.locator("#s-theme").count(), 0, "no theme choice: the app is dark only");
  await page.selectOption("#s-size", "l");
  await page.click('#settings button[value="save"]');
  await page.waitForFunction(() => !document.getElementById("settings").open && document.documentElement.dataset.size, null, { timeout: 3000 }).catch(() => {});   // the dialog's close event comes a moment after the click
  assert.equal(await page.evaluate(() => document.documentElement.dataset.size), "l", "text size applies");
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--paper").trim()), "#111111", "dark colours (Datum, Excimer paper) although the system is light");
  assert.ok(await page.evaluate(() => document.querySelectorAll("#bd .ground .g-line").length > 4), "the ground is drawn: the poster's grid");
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.size), "l", "and stays after a reload");
  await openCard(page, HELPDAY, HELP);
  assert.ok(await page.locator("#side-l").isVisible() && await page.locator("#side-r").isVisible());
  await page.click("#fl-tools [data-focus-view]");
  assert.ok(await page.locator("#side-l").isHidden() && await page.locator("#side-r").isHidden(), "focus view hides the panels");
  await page.screenshot({ path: path.join(SHOTS, "21-focus-view-dark-large.png") });
  await page.keyboard.press("f");
  assert.ok(await page.locator("#side-r").isVisible(), "F brings them back");
  // the card's knowledge check (one question of its own) took the place of Test me: written for the card, asked only there, counted like a quiz answer
  assert.equal(await page.locator("#card [data-test]").count(), 0, "no Test me any more");
  const cq = await page.evaluate(() => {
    const id = Object.keys(window.KEYS).find(k => window.KEYS[k].q && window.KEYS[k].q.a.length === 1);
    return id && { id, day: window.PLAN.find(x => x.groups && x.groups.some(g => g.items.some(it => it[0] === id))).id, a: window.KEYS[id].q.a[0], inBank: window.QUIZ.some(q => q.id === "card-" + id) };
  });
  if (cq) {
    assert.ok(!cq.inBank, "a card's question is not in the quiz bank, so no quiz draws it");
    await openCard(page, cq.day, cq.id);
    assert.ok(await page.evaluate(() => { const q = document.querySelector("#card .c-q"), n = document.querySelector("#card .c-notes"); return !!q && !!(q.compareDocumentPosition(n) & 4); }), "after the reading, before the notes");
    assert.ok(await page.locator("#card [data-cq-check]").isDisabled(), "Check waits for a pick");
    await page.click(`#card [data-cq-o]:not([data-cq-o="${cq.a}"])`);
    await page.click("#card [data-cq-check]");
    await page.waitForSelector("#card .cq-v.bad");
    assert.equal(await page.locator("#card .c-q .qz-fb li").count(), 4, "every option explained");
    let st = await state(page);
    assert.ok(st.qs[`card-${cq.id}`].seen === 1 && st.qs[`card-${cq.id}`].right === 0 && st.book[`card-${cq.id}`] && st.srs[`card-${cq.id}`], "a miss counts like a quiz miss: stats, notebook, review");
    await page.click("#card [data-cq-again]");
    await page.click(`#card [data-cq-o="${cq.a}"]`);
    await page.click("#card [data-cq-check]");
    await page.waitForSelector("#card .cq-v.ok");
    st = await state(page);
    assert.ok(st.qs[`card-${cq.id}`].right === 1 && st.qs[`card-${cq.id}`].xp === 1 && st.book[`card-${cq.id}`].fixed, "right after the miss: XP, and fixed in the notebook");
    await openCard(page, HELPDAY, HELP);
  }
  // search: Ctrl+K, a key point, then a note with markup in it
  const label = await page.evaluate(id => window.KEYS[id].k.find(Array.isArray)[0].replace(/<[^>]+>/g, ""), HELP);
  await page.keyboard.press("Control+k");
  await page.waitForSelector("#search[open]");
  await page.fill("#sr-q", label);
  await page.waitForSelector("#sr-list .sr-it");
  assert.match(await page.textContent("#sr-list .sr-it.on"), /Key point|Step|Why/, "the best match comes first");
  await page.fill("#sr-q", "zebra crossing");
  await page.waitForSelector("#sr-list .sr-it");
  assert.match(await page.textContent("#sr-list .sr-it.on .sr-k"), /My note/);
  assert.equal(await page.locator("#pwnS").count(), 0, "a note is shown as text in the results");
  assert.ok(await page.locator("#sr-list mark").count() >= 2, "the words are marked");
  await page.screenshot({ path: path.join(SHOTS, "22-search.png") });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.getElementById("search").open);
  assert.ok((await hash(page)).endsWith("/" + await page.evaluate(() => Object.keys(window.STEP_TAGS)[0])), "Enter opens the step");
  await ctx.close();

  // ---------- focus timer: the break pop-up and the reminders, on a fake clock and off the server ----------
  log("a focus block ends → a pop-up offers the break; the break counts up and reminds every minute past 10, one pop-up at a time");
  ({ ctx, page } = await newPage());
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));   // browser-only mode: this clock never reaches the server copy
  await page.clock.install();
  await page.goto(BASE);
  await setState(page, s => {
    s.settings = { start: new Date().toISOString().slice(0, 10), fx: false, sound: false };
    s.timer = { mode: "focus", running: true, endAt: Date.now() + 3000, left: 3000, from: 3000, min: false };
  });
  await page.reload();
  await page.evaluate(() => { window.__snd = []; const f = window.FX.sound; window.FX.sound = (n, a) => { window.__snd.push(n); return f(n, a); }; });
  const nags = () => page.evaluate(() => window.__snd.filter(n => n === "nag").length);
  // the pop-up ignores clicks in its first 400 ms (a click meant for what was under the pointer)
  const brk = async a => { await page.clock.fastForward(450); await page.click(`#brk [data-brk="${a}"]`); };
  await page.clock.fastForward(5000);
  await page.waitForSelector("#brk[open]");
  assert.match(await page.textContent("#brk"), /Focus block done/);
  assert.ok(await page.evaluate(() => document.activeElement.id === "brk-t"), "the keyboard goes to the pop-up's heading, not a button");
  await page.screenshot({ path: path.join(SHOTS, "19-break-offer.png") });
  await page.reload();                                                      // the prompt waits for an answer, also after a reload
  await page.evaluate(() => { window.__snd = []; const f = window.FX.sound; window.FX.sound = (n, a) => { window.__snd.push(n); return f(n, a); }; });
  await page.clock.fastForward(1500);
  await page.waitForSelector("#brk[open]");
  assert.match(await page.textContent("#brk"), /Focus block done/, "the prompt comes back after a reload");
  await brk("rest");
  let tmS = (await state(page)).timer;
  assert.ok(tmS.mode === "rest" && tmS.running && !(await page.locator("#brk[open]").count()), "Start break starts an open-ended break");
  await page.clock.fastForward(5 * 60000);
  assert.match(await page.textContent("#timer .tm-time"), /^05:/, "the break counts up");
  assert.equal(await page.locator("#brk[open]").count(), 0, "no reminder before 10 minutes");
  await page.clock.fastForward(5 * 60000 + 2000);
  await page.waitForSelector("#brk[open]");
  assert.match(await page.textContent("#brk"), /Break is over/);
  assert.match(await page.textContent("#timer .tm-mode"), /Break is over/);
  assert.equal(await nags(), 1);
  await page.screenshot({ path: path.join(SHOTS, "20-break-over.png") });
  await page.clock.fastForward(60000);
  assert.equal(await nags(), 2, "a reminder every minute past 10");
  assert.equal(await page.locator("dialog[open]").count(), 1, "the pop-up is up already: the reminder is the sound alone, nothing stacks");
  await brk("later");
  await page.clock.fastForward(60000);
  await page.waitForSelector("#brk[open]");
  assert.equal(await nags(), 3, "dismissed: the next minute brings the pop-up back");
  await brk("pause");
  assert.match(await page.textContent("#timer .tm-mode"), /Break, paused/);
  await page.clock.fastForward(3 * 60000);
  assert.equal(await nags(), 3, "a paused break doesn't remind");
  await page.click('#timer [data-tm="toggle"]');                         // resume the overdue break: it reminds at once
  await page.clock.fastForward(1500);
  await page.waitForSelector("#brk[open]");
  assert.equal(await nags(), 4);
  await brk("focus");
  tmS = (await state(page)).timer;
  const nowMs = await page.evaluate(() => Date.now());
  assert.ok(tmS.mode === "focus" && tmS.running && Math.abs(tmS.endAt - nowMs - 50 * 60000) < 5000 && !(await page.locator("#brk[open]").count()), "Start focus starts the next 50 minutes");
  await page.clock.fastForward(3 * 60000);
  assert.equal(await nags(), 4, "no reminders during focus");
  await ctx.close();

  log("the timer's pop-ups wait while the drill or the mock exam runs; the reminder sound doesn't");
  ({ ctx, page } = await newPage());
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.clock.install();
  await page.goto(BASE);
  await setState(page, s => {
    s.settings = { start: new Date().toISOString().slice(0, 10), fx: false, sound: false };
    s.timer = { mode: "rest", running: true, at: Date.now() - 9.5 * 60000, up: 0, min: false };
    s.run = { kind: "mock", day: "", ids: ["m1-001", "m1-002", "m2-003"], ord: {}, ans: {}, flag: {}, i: 0, t0: Date.now(), end: Date.now() + 7800000, done: false, view: "" };
  });
  await page.reload();
  await page.evaluate(() => { window.__snd = []; const f = window.FX.sound; window.FX.sound = (n, a) => { window.__snd.push(n); return f(n, a); }; });
  const nags2 = () => page.evaluate(() => window.__snd.filter(n => n === "nag").length);
  await openPanel(page, "practice");
  await page.click('#pr-grid [data-drill]');
  await page.waitForSelector("#qz-body .dr-req");
  await page.clock.fastForward(40000);                                  // the break passes 10 minutes during the drill
  assert.equal(await page.locator("#brk[open]").count(), 0, "no pop-up over the running drill");
  assert.equal(await nags2(), 1, "the reminder sound still plays");
  await page.clock.fastForward(25000);                                  // the drill is over: its results aren't timed
  await page.waitForSelector("#brk[open]");
  await page.clock.fastForward(450);
  await page.click('#brk [data-brk="later"]');
  await page.click('#quiz [data-qz="close"]');
  await page.click('#pr-grid [data-mock]');                             // resume the mock exam
  await page.waitForSelector("#qz-body .qz-o");
  await page.clock.fastForward(60000);
  assert.equal(await page.locator("#brk[open]").count(), 0, "no pop-up over the mock exam");
  assert.equal(await nags2(), 2, "the next minute's reminder is the sound alone");
  await page.click('#quiz .qz-x');                                       // close the mock (its clock keeps running)
  await page.clock.fastForward(1500);
  await page.waitForSelector("#brk[open]");
  assert.match(await page.textContent("#brk"), /Break is over/, "the held reminder comes up once the mock is closed");
  await ctx.close();

  log("two tabs: the focus-block prompt shows in both, and answering it in one closes it in the other");
  ({ ctx, page } = await newPage());
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.goto(BASE);
  await setState(page, s => {
    s.settings = { start: new Date().toISOString().slice(0, 10), fx: false, sound: false };
    s.timer = { mode: "focus", running: true, endAt: Date.now() + 2500, left: 3000, from: 3000, min: false };
  });
  await page.reload();
  const tab2 = track(await ctx.newPage());
  await tab2.goto(BASE);
  await page.waitForSelector("#brk[open]", { timeout: 6000 });
  await tab2.waitForSelector("#brk[open]", { timeout: 6000 });
  await page.waitForTimeout(450);
  await page.click('#brk [data-brk="rest"]');
  await tab2.waitForSelector("#brk:not([open])", { state: "attached", timeout: 4000 });
  assert.equal((await state(tab2)).timer.mode, "rest", "the other tab follows: the break is on");
  await ctx.close();

  log("the timer strip: a focus block starts by itself when a day starts or a step is completed, but not over a running block or a break");
  ({ ctx, page } = await newPage());
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.clock.install();
  await page.goto(BASE);
  await setState(page, s => { s.settings = { start: new Date().toISOString().slice(0, 10), fx: false, sound: false }; delete s.timer; });
  await page.reload();
  const tmBox = await page.locator("#timer").boundingBox();
  assert.ok(tmBox.y <= 1 && tmBox.width >= 1100, "the strip runs along the top of the page");
  assert.equal(await page.textContent("#timer .tm-time"), "50:00");
  await page.click("[data-start-day]");
  await page.waitForFunction(() => !document.getElementById("flow").hidden);
  tmS = (await state(page)).timer;
  let tNow = await page.evaluate(() => Date.now());
  assert.ok(tmS.mode === "focus" && tmS.running && Math.abs(tmS.endAt - tNow - 50 * 60000) < 3000, "Start Day starts a 50-minute block");
  assert.match(await page.textContent(".fx-toast"), /Focus on/);
  await page.clock.runFor(10 * 60000);
  const fill = await page.evaluate(() => parseFloat(document.querySelector("#timer .tm-fill").style.width));
  assert.ok(fill > 18 && fill < 22, `the strip fills as the block runs: ${fill}%`);
  await page.screenshot({ path: path.join(SHOTS, "23-timer-strip.png"), clip: { x: 0, y: 0, width: 1200, height: 120 } });
  const end0 = (await state(page)).timer.endAt;
  await complete(page);
  assert.equal((await state(page)).timer.endAt, end0, "a block that runs already goes on as it was");
  await page.click('#timer [data-tm="toggle"]');                          // pause; completing a step resumes it
  assert.match(await page.textContent("#timer .tm-mode"), /Focus, paused/);
  await complete(page);
  tmS = (await state(page)).timer;
  assert.ok(tmS.running && tmS.mode === "focus" && tmS.from < 41 * 60 && tmS.from > 39 * 60, "a paused block picks up where it was");
  await page.click('#timer [data-tm="menu"]');
  assert.ok(await page.locator("#tm-pop").isVisible() && await page.getAttribute('#timer [data-tm="menu"]', "aria-expanded") === "true", "the time opens the timer's menu");
  await page.screenshot({ path: path.join(SHOTS, "24-timer-menu.png"), clip: { x: 0, y: 0, width: 1200, height: 260 } });
  await page.click('#tm-pop [data-tm="switch"]');                        // ☕ Break now, then start it
  assert.ok(await page.locator("#tm-pop").isHidden(), "the menu closes after a choice");
  await page.click('#timer [data-tm="toggle"]');
  await page.clock.runFor(2000);
  await complete(page);
  tmS = (await state(page)).timer;
  assert.ok(tmS.mode === "rest" && tmS.running, "on a break, completing a step doesn't start focus");
  await page.click('#timer [data-tm="toggle"]');                          // a paused break is still a break
  await complete(page);
  assert.equal((await state(page)).timer.mode, "rest");

  log("away: the PC sleeps during a focus block → on return a pop-up asks whether that time counts");
  await page.click('#timer [data-tm="menu"]');
  await page.click('#tm-pop [data-tm="switch"]');                        // 🎯 Focus now, then start it
  await page.click('#timer [data-tm="toggle"]');
  await page.clock.runFor(2000);
  const end1 = (await state(page)).timer.endAt;
  await page.clock.fastForward(8 * 60000);                               // a jump of the clock: the PC slept
  await page.waitForSelector("#brk[open]");
  assert.match(await page.textContent("#brk"), /Welcome back[\s\S]*8 minutes[\s\S]*device asleep/);
  assert.match(await page.textContent("#timer .tm-mode"), /Away/);
  await page.screenshot({ path: path.join(SHOTS, "25-away.png") });
  await page.keyboard.press("Escape");                                    // Esc: the time counts
  await page.waitForFunction(k => !document.getElementById("brk").open && !JSON.parse(localStorage.getItem(k)).timer.away, KEY, { timeout: 3000 }).catch(() => {});
  tmS = (await state(page)).timer;
  assert.ok(!tmS.away && tmS.endAt === end1 && tmS.running, "Esc counts the time away as focus: " + JSON.stringify({ ...tmS, end1 }));
  await ctx.close();

  log("away: Edge's idle detection (no mouse or keyboard for 5 minutes) holds the block's end; Don't count it picks it up where you left; notifications reach the other monitor");
  ({ ctx, page } = await newPage());
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await ctx.addInitScript(() => {
    // stand-ins for the browser's idle detection and notifications, which a headless test can't drive
    window.__notes = [];
    window.Notification = class { constructor(t) { window.__notes.push(t); } close() {} static permission = "default"; static requestPermission() { this.permission = "granted"; return Promise.resolve("granted"); } };
    window.IdleDetector = class extends EventTarget { constructor() { super(); this.userState = "active"; this.screenState = "unlocked"; window.__idle = this; } static requestPermission() { return Promise.resolve("granted"); } async start(o) { this.threshold = o.threshold; } };
  });
  await page.clock.install();
  await page.goto(BASE);
  await setState(page, s => {
    s.settings = { start: new Date().toISOString().slice(0, 10), fx: false, sound: false };
    s.timer = { mode: "focus", running: true, endAt: Date.now() + 3 * 60000, left: 3000, from: 3000, min: false };
  });
  await page.reload();
  await page.click('#timer [data-tm="menu"]');
  await page.click('#tm-pop [data-tm="perm"]');
  await page.waitForFunction(() => document.querySelector('#tm-pop [data-tm="perm"]').hidden);
  assert.match(await page.textContent("#tm-pop .tm-info"), /On: notifications and away detection/);
  assert.equal(await page.evaluate(() => window.__idle.threshold), 5 * 60000, "away means 5 minutes without input, when the screen goes off");
  const idle = st => page.evaluate(st => { window.__idle.userState = st; window.__idle.dispatchEvent(new Event("change")); }, st);
  await idle("idle");
  await page.clock.runFor(4 * 60000);                                     // the block's end passes while away
  assert.equal(await page.locator("#brk[open]").count(), 0, "no pop-up while away, and the block doesn't end");
  assert.match(await page.textContent("#timer .tm-mode"), /Away/);
  await idle("active");
  await page.clock.runFor(1500);
  await page.waitForSelector("#brk[open]");
  assert.match(await page.textContent("#brk"), /away for 9 minutes/);
  await page.clock.runFor(450);
  await page.click('#brk [data-brk="skip-away"]');
  // 8 minutes were left when the input stopped, less the moment between setting the block up and the idle signal
  assert.match(await page.textContent("#timer .tm-time"), /^(07:5\d|08:00)$/, "Don't count it: the block goes on from where you left it");
  await page.evaluate(() => { document.hasFocus = () => false; });       // you're on the other monitor
  await page.clock.runFor(8 * 60000 + 2000);
  await page.waitForSelector("#brk[open]");
  assert.match(await page.textContent("#brk"), /Focus block done/);
  assert.deepEqual(await page.evaluate(() => window.__notes), ["Focus block done"], "a notification, once, when the page isn't the one in use");
  await ctx.close();

  log("course diagrams on the course's and the labs' cards: the step's parts first, a click or Enter explains a part, a larger view");
  ({ ctx, page } = await newPage({ viewport: { width: 1600, height: 1000 } }));
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.goto(BASE);
  await setState(page, s => { s.settings = { start: new Date().toISOString().slice(0, 10), fx: false, sound: false }; });
  await page.reload();
  const firstStep = await page.evaluate(() => window.PLAN.find(d => d.id).groups[0].items[0][0]);
  await openCard(page, dayOfStep(firstStep), firstStep);
  assert.equal(await page.locator("#card .b-map").count(), 0, "no diagram outside the lecture courses");
  await openCard(page, dayOfStep("c3b"), "c3b");
  await page.waitForSelector("#card .b-map .dg");
  const dgNow = () => page.evaluate(() => ({ sel: document.querySelector("#card .dg-part").dataset.sel, rel: document.querySelector("#card .dg-box").dataset.rel.split(" ").filter(Boolean), on: [...document.querySelectorAll("#card .dg .on")].map(e => e.dataset.part), name: (document.querySelector("#card .dg-part .dg-pn") || {}).textContent }));
  let g = await dgNow();
  assert.ok(g.rel.length && g.sel === g.rel[0] && g.on.join() === g.sel, "the first part this step is about is open and marked: " + JSON.stringify(g));
  await page.click('#card .dg [data-part="db-a"]');
  g = await dgNow();
  assert.ok(g.sel === "db-a" && g.on.join() === "db-a" && g.name === await page.evaluate(() => window.DIAGRAMS.c3.parts["db-a"].name), "a click explains the part: " + JSON.stringify(g));
  await page.locator("#card .b-map").screenshot({ path: path.join(SHOTS, "26-diagram.png") });
  await page.focus('#card .dg [data-part="alb"]');
  await page.keyboard.press("Enter");
  g = await dgNow();
  assert.equal(g.sel, "alb", "Enter on a part opens it");
  assert.ok(!((await state(page)).ticks || {}).c3b && (await hash(page)).endsWith("/c3b"), "Enter on a part doesn't complete the step");
  await page.click("#card [data-dg-big]");
  await page.waitForSelector('#sheet[open][data-kind="dg"] .dg');
  await page.click('#sheet .dg [data-part="efs"]');
  assert.equal(await page.textContent("#sheet .dg-part .dg-pn"), await page.evaluate(() => window.DIAGRAMS.c3.parts.efs.name));
  await page.screenshot({ path: path.join(SHOTS, "27-diagram-large.png") });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.getElementById("sheet").open && document.querySelector("#card .dg-part").dataset.sel === "efs", null, { timeout: 3000 });
  await openCard(page, dayOfStep("l3a"), "l3a");
  assert.equal(await page.getAttribute("#card .dg-box", "data-dg"), "c3", "a lab's card shows its course's diagram");
  await openCard(page, dayOfStep("c9a"), "c9a");
  assert.equal(await page.locator("#card .b-map").count(), 0, "a course without a diagram shows none");

  log("look-alikes: from the overview, a card's panel, a missed question (over the quiz) and search");
  await openCard(page, dayOfStep("c3b"), "c3b");
  await page.click("#side-r [data-look]");
  await page.waitForSelector('#sheet[open][data-kind="look"] .la.on');
  assert.ok(await page.locator("#sheet .la.on").isVisible(), "the linked table is on screen and marked");
  await page.keyboard.press("Escape");
  await goHome(page);
  await openPanel(page, "practice");
  await page.click("#pr-grid [data-look]");
  await page.waitForSelector('#sheet[open][data-kind="look"]');
  assert.equal(await page.locator("#sheet .la").count(), await page.evaluate(() => window.LOOKALIKES.length), "every table is on the sheet");
  assert.equal(await page.locator("#sheet .la-t").first().locator("tbody tr").count(), await page.evaluate(() => window.LOOKALIKES[0].rows.length));
  await page.keyboard.press("Escape");
  // a question whose right answer names SQS and a wrong one SNS, missed in step practice
  const lq = await page.evaluate(() => {
    const w = (t, x) => new RegExp(`(?<![A-Za-z0-9])${x}(?![A-Za-z0-9])`, "i").test(t.replace(/<[^>]+>/g, ""));
    for (const q of window.QUIZ) {
      if (q.a.length !== 1 || !w(q.o[q.a[0]], "SQS") || w(q.o[q.a[0]], "SNS")) continue;
      const bad = q.o.findIndex((o, i) => i !== q.a[0] && w(o, "SNS") && !w(o, "SQS"));
      if (bad >= 0) return { id: q.id, bad, n: q.o.length };
    }
    return null;
  });
  assert.ok(lq, "the pools hold a question that sets SQS against SNS");
  await setState(page, `s => { s.run = { kind: "step", day: "", item: "c3b", ids: ["${lq.id}"], ord: { "${lq.id}": [${[...Array(lq.n).keys()]}] }, ans: {}, flag: {}, i: 0, t0: Date.now(), end: 0, done: false, view: "" }; }`);
  await page.reload();
  await openCard(page, dayOfStep("c3b"), "c3b");
  await page.click('#side-r [data-step-quiz="c3b"]');
  await page.waitForSelector("#qz-body .qz-o");
  await page.click(`#qz-body [data-o="${lq.bad}"]`);
  await page.click('#qz-body [data-qz="check"]');
  await page.waitForSelector('#qz-body .qz-la [data-look="queue-topic-bus"]');
  // one click says why it was missed; a second click on the same reason takes it back
  await page.click('#qz-body [data-why="mix"]');
  assert.equal((await state(page)).book[lq.id].why, "mix");
  assert.equal(await page.getAttribute('#qz-body [data-why="mix"]', "aria-pressed"), "true");
  await page.click('#qz-body [data-why="read"]');
  await page.click('#qz-body [data-why="read"]');
  assert.equal((await state(page)).book[lq.id].why, "", "a second click clears it");
  await page.click('#qz-body [data-why="mix"]');
  await page.click('#qz-body .qz-la [data-look="queue-topic-bus"]');
  await page.waitForSelector("#sheet[open] #la-queue-topic-bus.on");
  await page.screenshot({ path: path.join(SHOTS, "28-lookalikes.png") });
  const picks0 = await page.locator("#qz-body .qz-o.on").count();
  await page.keyboard.press("1");
  assert.equal(await page.locator("#qz-body .qz-o.on").count(), picks0, "the quiz keys wait while the sheet is up");
  await page.keyboard.press("Escape");
  assert.ok(await page.locator("#quiz[open]").count() && !(await page.locator("#sheet[open]").count()), "closing the sheet goes back to the quiz");
  await page.click("#quiz .qz-x");
  await goHome(page);
  await openPanel(page, "practice");
  await page.click('#pr-grid [data-sheet="weak"]');
  await page.waitForSelector("#sheet[open] .why-bars");
  assert.match(await page.textContent("#sheet .why-bars"), /Mixed up two services\s*1/, "the weak spots show why you miss");
  assert.match(await page.textContent("#sheet .why-tip"), /look-alikes/);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await page.fill("#sr-q", "transit gateway hub");
  await page.waitForSelector("#sr-list .sr-it");
  const di = await page.evaluate(() => [...document.querySelectorAll("#sr-list .sr-it")].findIndex(li => li.querySelector(".sr-k").textContent === "Diagram" && /Transit Gateway/.test(li.querySelector(".sr-t").textContent)));
  assert.ok(di >= 0, "a diagram's part is found by search");
  await page.click(`#sr-list [data-sr="${di}"]`);
  await page.waitForFunction(() => { const p = document.querySelector("#card .dg-part"); return p && p.dataset.sel === "tgw"; }, null, { timeout: 3000 });
  assert.equal(await page.getAttribute("#card .dg-box", "data-dg"), "c6", "it opens the course's card with that part");
  await page.keyboard.press("Control+k");
  await page.fill("#sr-q", "egress-only");
  await page.waitForSelector("#sr-list .sr-it");
  const li = await page.evaluate(() => [...document.querySelectorAll("#sr-list .sr-it")].findIndex(li => li.querySelector(".sr-k").textContent === "Look-alikes"));
  assert.ok(li >= 0, "a look-alike table is found by search");
  await page.click(`#sr-list [data-sr="${li}"]`);
  await page.waitForSelector('#sheet[open][data-kind="look"] .la.on');
  await ctx.close();

  log("daily XP goal (set in Settings) and the week's challenges: reaching them drops badges at the top, once");
  ({ ctx, page } = await newPage({ viewport: { width: 1400, height: 1000 } }));
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.goto(BASE);
  const wk = await page.evaluate(() => { const m = new Date(); m.setDate(m.getDate() - (m.getDay() + 6) % 7); return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`; });
  const tday = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  await setState(page, `s => {
    s.settings = { start: "${tday}", fx: false, sound: false };
    s.ticks = {}; ${JSON.stringify(D1.ids.slice(0, -1))}.forEach(id => { s.ticks[id] = true; });
    s.xpDay = { "${tday}": { x: 0, at: 1, hit: false } };   // ${(D1.ids.length - 1) * 5} XP today so far
    s.week = { key: "${wk}", at: 1, ids: ["ans", "steps", "drill"], base: { a: 0, s: ${D1.ids.length - 1} - 39, dr: 0 } };
    s.chal = {}; s.ach = {};
  }`);
  await page.reload();
  await page.waitForSelector("#today:not([hidden]) .td-goal");
  assert.match(await page.textContent("#today .ring-v"), new RegExp(`^${(D1.ids.length - 1) * 5}of 200 XP`));
  assert.match(await page.textContent("#today .td-ch"), /Complete 40 steps\s*39 \/ 40/);
  await page.click("#today [data-goal-set]");
  await page.waitForSelector("#settings[open]");
  await page.selectOption("#s-goal", "100");
  await page.click('#settings button[value="save"]');
  await page.waitForFunction(() => /of 100 XP/.test(document.querySelector("#today .ring-v").textContent));
  await openCard(page, D1.id, D1.ids[D1.ids.length - 1]);
  await complete(page);
  await page.waitForFunction(() => /Daily goal reached/.test(document.querySelector(".fx-badges")?.textContent || "") && /Weekly challenge done/.test(document.querySelector(".fx-badges")?.textContent || ""), null, { timeout: 5000 });
  await page.screenshot({ path: path.join(SHOTS, "29-goal-badges.png"), clip: { x: 0, y: 0, width: 1400, height: 200 } });
  let st = await state(page);
  assert.ok(st.xpDay[tday].hit && st.chal[`${wk}:steps`] === tday && st.settings.goal === 100, "the goal and the challenge are recorded once");
  await goHome(page);
  assert.ok(await page.locator("#today .td-goal.hit").count(), "the ring shows the goal reached");
  assert.match(await page.textContent("#today .td-ch li.done"), /Complete 40 steps\s*✓ Done/);
  await page.locator("#today").screenshot({ path: path.join(SHOTS, "30-today.png") });
  const nBadges = await page.evaluate(() => document.querySelectorAll(".fx-badges .fx-bd, .fx-badges > *").length);
  await page.reload();
  await page.waitForTimeout(1500);
  assert.ok(!/Daily goal reached|Weekly challenge done/.test(await page.evaluate(() => document.querySelector(".fx-badges")?.textContent || "")), "not announced again after a reload " + nBadges);

  log("readiness by exam domain, study this next, and the day-by-day charts with their hover layer and table view");
  await setState(page, `s => {
    s.qs = {}; s.daily = {}; s.xpDay = {};
    const by = [1, 2, 3, 4].map(d => window.QUIZ.filter(q => q.dom === d).slice(0, 20));
    by.forEach((qs, i) => qs.forEach((q, k) => { const ok = i === 1 ? k < 8 : k < 18; s.qs[q.id] = { seen: 1, right: ok ? 1 : 0, last: ok ? 1 : 0, at: "${tday}", xp: ok ? 1 : 0 }; }));
    const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
    s.daily = { [d(3)]: { t1: { a: 30, r: 24, f: 120 } }, [d(2)]: { t1: { a: 20, r: 19, f: 95 } }, [d(1)]: { t1: { a: 10, r: 6, f: 50 }, t2: { a: 10, r: 9, f: 0 } } };
    s.xpDay = { [d(3)]: { x: 100, at: 1, hit: false }, [d(2)]: { x: 400, at: 1, hit: true }, [d(1)]: { x: 520, at: 1, hit: false } };
  }`);
  await page.reload();
  await page.waitForSelector("#ready .rd-list li");
  const rd = await page.evaluate(() => [...document.querySelectorAll("#ready .rd-list li")].map(li => [li.className, li.querySelector(".rd-v").textContent]));
  assert.deepEqual(rd.map(x => x[1]), ["90%", "40%", "90%", "90%"], JSON.stringify(rd));
  assert.deepEqual(rd.map(x => x[0]), ["ok", "bad", "ok", "ok"]);
  assert.match(await page.textContent("#ready .rd-all"), /^77%/, "weighted like the exam: (90·30 + 40·26 + 90·24 + 90·20) / 100");
  assert.match(await page.textContent("#ready .rd-next"), /D2 Resilient/, "study next comes from the weakest domain");
  await page.locator("#progress").screenshot({ path: path.join(SHOTS, "31-readiness-trends.png") });
  const ch = page.locator('#trends .tr-fig[data-chart="acc"]');
  assert.equal(await ch.locator("circle.dot").count(), 3, "a point for each day with answers");
  assert.equal(await page.locator('#trends .tr-fig[data-chart="focus"] .mk').count(), 3);
  const hi = await page.evaluate(() => { const r = document.querySelectorAll('#trends .tr-fig[data-chart="acc"] .hit'); return r.length - 2; });
  await ch.locator(`.hit[data-i="${hi}"]`).hover();
  assert.match(await ch.locator(".tt").textContent(), /^75%15 of 20 right/, "the tooltip adds up both devices of a day");
  await ch.focus();
  await page.keyboard.press("End");
  assert.match(await ch.locator(".tt").textContent(), /^–no answers/, "End goes to today");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  assert.match(await ch.locator(".tt").textContent(), /^95%19 of 20 right/, "the arrow keys read the days");
  const xpT = page.locator('#trends .tr-fig[data-chart="xp"]');
  await xpT.locator(`.hit[data-i="${hi - 1}"]`).hover();
  assert.match(await xpT.locator(".tt").textContent(), /^120 XP/, "a day's XP is the next day's starting total minus its own");
  await page.click("#trends [data-trend-table]");
  assert.equal(await page.locator("#trends .tr-tab tbody tr").count(), 14, "the table view has a row per day");
  await page.click('#trends [data-trend="30"]');
  assert.equal(await page.locator("#trends .tr-tab tbody tr").count(), 30);
  await page.click("#trends [data-trend-table]");
  assert.equal(await page.locator('#trends .tr-fig[data-chart="acc"] .hit').count(), 30);
  await page.click('#ready .rd-next [data-step-quiz]');
  await page.waitForSelector("#quiz[open] #qz-body .qz-o");
  assert.equal((await state(page)).run.kind, "step", "Try 3 questions starts step practice");
  await ctx.close();

  log("hostile values in the goal, challenge, per-day and miss-reason fields are cleaned");
  ({ ctx, page } = await newPage());
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.goto(BASE);
  await setState(page, `s => {
    s.settings = { start: "${tday}", fx: false, sound: false, goal: 12345 };
    s.xpDay = { "bad": { x: 1 }, "2026-10-10": { x: "9", at: 1, hit: "<b>" } };
    s.daily = { "2026-10-10": { "BAD!": { a: 1 }, "ok1": { a: 5, r: 9, f: 1e9 } }, "nope": {} };
    s.week = { key: "2026-10-12", at: 5, ids: ["nope", "ans", "__proto__"], base: { a: "x", r: 3 } };
    s.chal = { "x": "2026-10-10", "2026-10-12:ans": "2026-10-13", "2026-10-12:zzz": "2026-10-13", "2026-10-12:fix": "<img>" };
    s.book = { "${await page.evaluate(() => window.QUIZ[0].id)}": { at: "2026-10-10", misses: 1, note: "", fixed: false, why: "<img src=x>" } };
  }`);
  await page.reload();
  await page.waitForSelector("#today:not([hidden])");
  st = await state(page);
  assert.deepEqual(st.xpDay["2026-10-10"], { x: 0, at: 1, hit: true });
  assert.ok(!("bad" in st.xpDay) && !("nope" in st.daily));
  assert.deepEqual(st.daily["2026-10-10"], { ok1: { a: 5, r: 5, f: 1440 } });
  assert.deepEqual(Object.keys(st.chal), ["2026-10-12:ans"]);
  assert.equal(st.settings.goal, 200);
  assert.equal(Object.values(st.book)[0].why, "");
  if (st.week.key === "2026-10-12") assert.deepEqual([st.week.ids, st.week.base], [["ans"], { r: 3 }]);
  await ctx.close();

  log("the mock exam screen: highlight words, strike options out, review filters, the clock turns red and warns");
  ({ ctx, page } = await newPage());
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.goto(BASE);
  const mkIds = await page.evaluate(() => window.QUIZ.filter(q => q.id.startsWith("m1") && q.a.length === 1).slice(0, 4).map(q => q.id));
  await setState(page, `s => {
    s.settings = { start: "${tday}", fx: false, sound: false };
    s.run = { kind: "mock", day: "", ids: ${JSON.stringify(mkIds)}, ord: {}, ans: {}, flag: {}, i: 0, t0: Date.now(), end: Date.now() + 10 * 60000 + 2500, done: false, view: "" };
  }`);
  await page.reload();
  await openPanel(page, "practice");
  await page.click("#pr-grid [data-mock]");
  await page.waitForSelector("#qz-body .mk-q .w");
  const words = page.locator("#qz-body .mk-q .w"), run = async () => (await state(page)).run, q0 = mkIds[0];
  await words.nth(2).click();
  assert.deepEqual((await run()).hl[q0], [2], "a click highlights a word");
  const wa = await words.nth(5).boundingBox(), wb = await words.nth(8).boundingBox();
  await page.mouse.move(wa.x + 2, wa.y + wa.height / 2); await page.mouse.down();
  await page.mouse.move(wb.x + wb.width - 2, wb.y + wb.height / 2, { steps: 4 }); await page.mouse.up();
  assert.deepEqual((await run()).hl[q0], [2, 5, 6, 7, 8], "a drag highlights the words between");
  await words.nth(2).click();
  assert.deepEqual((await run()).hl[q0], [5, 6, 7, 8], "a second click takes it back");
  const ord0 = (await run()).ord[q0];
  await page.click(`#qz-body .mk-x[data-x="${ord0[1]}"]`);
  await page.keyboard.press("Shift+Digit3");
  assert.deepEqual((await run()).x[q0].slice().sort(), [ord0[1], ord0[2]].sort(), "⊘ and Shift + number strike options out");
  assert.equal(await page.locator("#qz-body .mk-row.x").count(), 2);
  await page.click(`#qz-body [data-o="${ord0[1]}"]`);
  let rr = await run();
  assert.ok(rr.ans[q0][0] === ord0[1] && !rr.x[q0].includes(ord0[1]), "picking a struck option brings it back");
  await page.click(`#qz-body .mk-x[data-x="${ord0[1]}"]`);
  rr = await run();
  assert.ok(!rr.ans[q0] && rr.x[q0].includes(ord0[1]), "striking the picked option unpicks it");
  await page.click(`#qz-body [data-o="${ord0[0]}"]`);
  await page.click('#qz-body [data-qz="flag"]');
  assert.match(await page.textContent("#qz-meta .mk-time"), /^0:10:0/);
  await page.waitForSelector(".fx-toast.show", { timeout: 6000 });
  assert.match(await page.textContent(".fx-toast"), /10 minutes left/, "a word when 10 minutes are left");
  assert.ok(await page.locator("#qz-meta .mk-time.low").count(), "the clock turns red");
  await page.screenshot({ path: path.join(SHOTS, "32-mock-screen.png") });
  await page.reload();
  await openPanel(page, "practice");
  await page.click("#pr-grid [data-mock]");
  await page.waitForSelector("#qz-body .mk-q .w.hl");
  assert.equal(await page.locator("#qz-body .mk-q .w.hl").count(), 4, "highlights stay after a reload");
  assert.equal(await page.locator("#qz-body .mk-row.x").count(), 2, "and so do the strike-outs");
  await page.click('#qz-body [data-qz="grid"]');
  await page.click('#qz-body [data-grid-f="flag"]');
  assert.equal(await page.locator("#qz-body .mk-grid [data-go]").count(), 1, "the review screen shows the flagged ones");
  await page.click('#qz-body [data-grid-f="open"]');
  assert.equal(await page.locator("#qz-body .mk-grid [data-go]").count(), mkIds.length - 1, "and the unanswered ones");
  await ctx.close();

  log("drill modes: reverse, three lives, and the daily five (the same five all day; the first try counts)");
  ({ ctx, page } = await newPage());
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  await page.goto(BASE);
  await setState(page, `s => { s.settings = { start: "${tday}", fx: false, sound: false }; }`);
  await page.reload();
  // pick the right option, or a wrong one, by reading the item from window.DRILL
  const drillPick = async right => {
    await page.evaluate(right => {
      const req = document.querySelector("#qz-body .dr-req"), rev = req.classList.contains("dr-svc"), txt = rev ? req.lastChild.textContent : req.textContent;
      const it = window.DRILL.find(d => (rev ? d[1] : d[0]) === txt), ans = rev ? it[0] : it[1];
      const opts = [...document.querySelectorAll("#qz-body [data-dr] .qz-t")].map(x => x.textContent);
      document.querySelectorAll("#qz-body [data-dr]")[right ? opts.indexOf(ans) : opts.findIndex(o => o !== ans)].click();
    }, right);
    await page.waitForTimeout(right ? 500 : 1350);
  };
  await openPanel(page, "practice");
  await page.click('#pr-grid [data-drill-mode="rev"]');
  await page.waitForSelector("#qz-body .dr-svc");
  const revOk = await page.evaluate(() => { const txt = document.querySelector("#qz-body .dr-req").lastChild.textContent, it = window.DRILL.find(d => d[1] === txt); return [...document.querySelectorAll("#qz-body [data-dr] .qz-t")].filter(x => x.textContent === it[0]).length; });
  assert.equal(revOk, 1, "reverse: the service's own requirement is one of the four");
  await drillPick(true);
  assert.match(await page.textContent("#qz-meta"), /Score 1/);
  await page.click("#quiz .qz-x");
  await page.click('#pr-grid [data-drill-mode="lives"]');
  await page.waitForSelector("#qz-body .dr-req");
  assert.equal(await page.locator("#qz-meta .dr-lives .on").count(), 3);
  await drillPick(true); await drillPick(true); await drillPick(false);
  assert.equal(await page.locator("#qz-meta .dr-lives .on").count(), 2, "a miss costs a life");
  await drillPick(false); await drillPick(false);
  await page.waitForSelector("#qz-body .qz-res");
  assert.match(await page.textContent("#qz-head, #quiz .qz-h"), /Out of lives/);
  assert.equal((await state(page)).drill.lives, 2, "the best in three lives");
  await page.click('#qz-body [data-qz="close"]');
  await page.click('#pr-grid [data-drill-mode="day"]');
  await page.waitForSelector("#qz-body .dr-req");
  const first5 = await page.textContent("#qz-body .dr-req");
  for (let i = 0; i < 5; i++) await drillPick(true);
  await page.waitForSelector("#qz-body .qz-res");
  assert.match(await page.textContent("#qz-body .qz-res"), /5 right of 5[\s\S]*Today's result/);
  assert.equal((await state(page)).drill.day[tday], 5);
  await page.screenshot({ path: path.join(SHOTS, "33-daily-five.png") });
  await page.click('#qz-body [data-qz="close"]');
  await page.click('#pr-grid [data-drill-mode="day"]');
  await page.waitForSelector("#qz-body .dr-req");
  assert.equal(await page.textContent("#qz-body .dr-req"), first5, "the same five all day");
  for (let i = 0; i < 5; i++) await drillPick(false);
  await page.waitForSelector("#qz-body .qz-res");
  assert.match(await page.textContent("#qz-body .qz-res"), /stays 5 of 5/);
  assert.equal((await state(page)).drill.day[tday], 5, "only the first try counts");
  assert.equal((await state(page)).drill.runs, 3, "every finished drill counts as a run (the reverse one was closed early)");
  await ctx.close();

  log("cost guard: Build steps put what they create on a still-running list; quick-add, Undo, Deleted, the cleanup check, and the evening reminder (fake clock)");
  ({ ctx, page } = await newPage());
  await ctx.route("**/api/state", r => r.fulfill({ status: 200, contentType: "text/plain", body: "" }));
  const eve = new Date(); eve.setHours(19, 30, 0, 0);
  await page.clock.install({ time: eve });
  await page.goto(BASE);
  await setState(page, `s => { s.settings = { start: "${tday}", fx: false, sound: false }; s.cost = { items: [], snooze: 0, night: "" }; }`);
  await page.reload();
  const items = async () => (await state(page)).cost.items;
  const BD = dayOfStep("d2b1");
  await openCard(page, BD, "d2b1");
  await complete(page);
  let ci = await items();
  assert.deepEqual(ci.map(x => [x.id, x.gone]), [["d2b1:nat", 0], ["d2b1:eip", 0]], "completing the step lists the NAT gateway and its Elastic IP");
  await page.click('#timer [data-tm="toggle"]');                         // pause the focus block that started: the clock jumps below
  await page.waitForSelector("#card .b-cost");
  assert.match(await page.textContent("#card .b-cost"), /NAT gateway[\s\S]*Elastic IP/, "the next Build card shows them");
  await page.selectOption("#card .b-cost [data-cost-k]", "elb");
  await page.fill("#card .b-cost [data-cost-l]", "web <b>x</b>");
  await page.click("#card .b-cost [data-cost-add]");
  ci = await items();
  assert.ok(ci.length === 3 && ci[2].k === "elb" && ci[2].label === "web <b>x</b>" && ci[2].day === BD, "added by hand, with the day");
  assert.equal(await page.locator("#card .b-cost b b").count(), 0, "a name is shown as text");
  await page.screenshot({ path: path.join(SHOTS, "34-cost-card.png") });
  await openCard(page, BD, "d2b1");
  await page.click("#fl-nav [data-undo]");
  assert.deepEqual((await items()).map(x => x.id).filter(id => id.startsWith("d2b1")), [], "Undo takes the step's items off again");
  await complete(page);
  await goHome(page);
  await page.waitForSelector("#running:not([hidden]) .cost-l");
  assert.equal(await page.locator("#running .cost-l li").count(), 3);
  await page.click('#running [data-cost-gone="d2b1:eip"]');
  assert.ok((await items()).find(x => x.id === "d2b1:eip").gone > 0, "Deleted marks it");
  assert.equal(await page.locator("#running .cost-l li").count(), 2, "and it leaves the list");
  await page.locator("#running").screenshot({ path: path.join(SHOTS, "35-still-running.png") });
  await openCard(page, BD, "d2b2");
  await page.click('#fl-tools [data-cleanup]');
  await page.waitForSelector("#cleanup[open] #cl-run:not([hidden]) .cost-l");
  assert.equal(await page.locator("#cl-run .cost-l li").count(), 2, "the cleanup check starts with what is still running");
  await page.click('#cleanup button[value="close"]');
  await goHome(page);
  // the evening: 20:00 brings the reminder; "In 30 minutes" waits 30 minutes; "Keep running tonight" ends it for the night
  if ((await state(page)).timer.running) await page.click('#timer [data-tm="toggle"]');   // Mark complete resumed the block; the clock jumps below
  await page.clock.fastForward(31 * 60000);
  await page.clock.runFor(16000);
  await page.waitForSelector("#costnag[open]");
  const nagT = await page.textContent("#costnag");
  assert.ok(/NAT gateway since/.test(nagT) && /Load balancer “web <b>x<\/b>” since/.test(nagT), nagT);
  await page.screenshot({ path: path.join(SHOTS, "36-cost-nag.png") });
  await page.click('#costnag [data-cn="later"]');
  await page.clock.runFor(20 * 60000);
  assert.equal(await page.locator("#costnag[open]").count(), 0, "not before 30 minutes");
  await page.clock.runFor(11 * 60000);
  await page.waitForSelector("#costnag[open]");
  await page.click('#costnag [data-cn="night"]');
  await page.clock.runFor(60 * 60000);
  assert.equal(await page.locator("#costnag[open]").count(), 0, "kept running tonight: no more reminders");
  // the next evening it asks again; marking everything deleted in the pop-up says all clean
  const next = new Date(eve); next.setDate(next.getDate() + 1); next.setHours(20, 1, 0, 0);
  await page.clock.fastForward(next.getTime() - await page.evaluate(() => Date.now()));
  await page.clock.runFor(16000);
  await page.waitForSelector("#costnag[open]");
  for (const id of (await items()).filter(x => !x.gone).map(x => x.id)) await page.click(`#costnag [data-cost-gone="${id}"]`);
  assert.match(await page.textContent("#costnag"), /All clean/);
  await page.click('#costnag [data-cn="done"]');
  assert.ok(await page.locator("#running").isHidden(), "nothing running: the list is gone from the overview");
  // hostile entries are dropped
  await setState(page, `s => { s.xpDay = {}; /* stamping today saves the cleaned copy */ s.cost = { items: [{ id: "x y", k: "ec2" }, { id: "ok1", k: "nope" }, { id: "ok2", k: "rds", label: 5, day: "zz", at: "1", gone: 0 }, { id: "ok2", k: "ec2" }], snooze: 1e15, night: "<b>" }; }`);
  await page.reload();
  st = await state(page);
  assert.deepEqual(st.cost.items, [{ id: "ok2", k: "rds", label: "", day: "", at: 0, gone: 0 }]);
  const pNow = await page.evaluate(() => Date.now());   // the page's clock is the fake one
  assert.ok(st.cost.snooze <= pNow + 864e5 && st.cost.night === "", "a snooze is at most a day ahead");
  await ctx.close();

  if (errors.length) throw new Error("console errors:\n" + errors.join("\n"));
  console.log(`\nAll e2e checks passed in ${((Date.now() - t0) / 1000).toFixed(1)} s. Screenshots: ${SHOTS}`);
} catch (e) {
  console.error(`\nFAILED at "${step}": ${e.message}`);
  if (errors.length) console.error("console errors:\n" + errors.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
