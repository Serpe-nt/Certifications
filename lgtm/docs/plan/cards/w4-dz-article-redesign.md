# DZ: the lesson page as an article

Wave 4. Model Opus 5.5, high effort. The owner sits in this session: it has checkpoints where you stop and wait for them.

Skills: `caveman`, `humanizer`, `ponytail` as every worker, and `web-design-engineer` for the design work.

## Owns

`lgtm/learn/src/**` except `lgtm/learn/src/content/**`; `lgtm/learn/public/**`; `lgtm/learn/tests/**`; `lgtm/learn/README.md` and `lgtm/learn/CLAUDE.md`; `lgtm/docs/adr/dz-*.md`.

In the content, only the two specimen steps: `lgtm/learn/src/content/steps/m02/s10-cardinality.mdx` and `lgtm/learn/src/content/steps/m02/s06-one-request-three-signals.mdx`, with their rows in `lgtm/docs/verification/m02.md`.

## Read first

- `lgtm/docs/plan/00-overview.md`, section 13: the owner's verdict on the pilot. It is the brief.
- `lgtm/docs/plan/03-content-contract.md` (the form you are replacing), `01-curriculum.md` ("How a step teaches"), `cards/README.md`
- `lgtm/learn/README.md`, `lgtm/learn/CLAUDE.md`, `lgtm/docs/adr/s1-stack.md`, `s1-content-format.md`, `s2-study-features.md`, `c0-content-notes.md`
- The step page as it is: `lgtm/learn/src/pages/m/[module]/[step]/index.astro`, `src/components/mdx/*`, `src/layouts/Base.astro`, `src/styles/tokens.css` and `global.css`. Run `npm run dev` and walk module m02 before you design anything.
- All thirteen steps of `lgtm/learn/src/content/steps/m02/`: this is the text the page has to carry.
- `saa-plan/CLAUDE.md`, section "Rules": what the owner asked for in their other study site (one step per screen, an article with a sidebar, only the page scrolls, purpose first).

## The problem, in the owner's words

"Hate the structure, really hard to follow and understand, each piece on top adds visual distraction as if different topic. The screen utilization is garbage as well, everything is one narrow line. No visually distinct, for example Why this matter and The idea (with icons). Should be structured more like an article (instead of unrelated images we can do diagrams or other info parts, like why it exists, or the problem, etc). With separate Learn/Practice tabs (Practice where it applies, where does not only learn)." And: the text "should be rewritten as more article like (read top to bottom)".

## The references are for structure only

The owner attached four screenshots. They show how a page is divided and how its parts follow each other. They do not show the look: the owner brings the aesthetics and its images to you in this session, at the first checkpoint. Ask for them there, and do not derive colours, type or imagery from these four.

The files are in `C:\Users\serpe\AppData\Local\Temp\claude\1cfbf44b61963a4b\2936ff6e-133b-4062-bb59-cca4af9d0449\scratchpad\design-refs\` (a temporary folder; if it is gone, ask the owner to attach them again). What each one shows:

1. `ref1-wiki-article-with-sidebar.webp`: an encyclopedia article in an app shell. A slim icon rail on the left, a search bar on top, a wide picture header with three figures laid over it. Under it two columns: the article (title with actions, sections that fold open with plus and minus, a picture with a caption between paragraphs, sub-sections) and a sidebar with tabs (additional, contents, references, links) holding small cards. A call to action band and a footer close the page.
2. `ref2-editorial-news-article.webp`: a news article. Byline, a large headline, a row of actions, a lede in larger type, then body text that changes between one, two and three columns, with pull quotes in large type breaking the text, tags, and a row of related articles.
3. `ref3-landing-rounded-hero.webp`: a landing page. A rounded header block with a headline and a picture that breaks out of it, a centred statement between two pictures, a dark band with text over a picture.
4. `ref4-landing-stats-process.webp`: a landing page. A header block; a section with text on the left and four large figures on the right; a titled row of three cards; and "how we work": a picture beside a list of five steps, each with a round icon, a title and a line of text, divided by rules.

What they share, and what the owner is pointing at: the full width is used; one clear reading column with something useful beside it; a header that says what the page is; sections with headings that follow each other as one story; information parts that break the text (figures, icon lists, numbered processes, cards, quotes) and belong to it.

## What to design and build

1. **The step page as an article.** One step is still one page, with Back, Mark complete and Next, and no list of steps to tick beside it. A header for the step (where it sits in the module, title, time, what you will be able to do after it). A reading column that is comfortable to read, and beside it on wide screens what a reader looks things up in: the sections of this article, the terms it introduces, the exam domains it serves, its sources. On a phone the same content in one column in a sensible order. Only the page scrolls.
2. **Learn and Practice.** Two tabs on a step that has something to do; no tabs on a step that has not. Learn is the article. Practice holds the actions in the lab, how you know it worked, and the pasted-answer check. The tab is in the address, so a reload and the Back key keep it. Mark complete still waits for the check on lab and drill steps. Decide with the owner where the step's one knowledge-check question goes.
3. **The parts an article is built from.** Replace the stack of equal boxes with running text under headings, and a small set of distinct parts with icons that an author places where they help: the problem this thing was made to solve, the key idea, how it shows up in this lab, the usual trap, what to remember. Their look must make each one recognisable at a glance and still part of one article.
4. **Information parts in place of pictures.** Build a few that an author fills with data and no drawing skill: for example a flow of steps, a comparison of two or three things, a set of figures, layers or a path through components, a timeline. Each works in light and dark, on a phone, and without animation. The `Figure` component for animated scenes stays as it is.
5. **The rest of the site in the same design:** overview, module start and end, quiz, practice and review, mock exam, settings, 404. The mock exam stays quiet.
6. **The design system** in `src/styles/tokens.css`, from what the owner brings: colour in light and dark, type with self-hosted fonts, space, radius, shadow, motion. No CDN, no third-party origin, the content security policy unchanged. Visible focus, keyboard use and reduced motion keep working.

## How to work: checkpoints with the owner

Follow `web-design-engineer`, with these stops. At each, show, then wait for the owner's answer in this session.

1. **Structure and look.** After walking the current site and reading m02: your reading of the brief in a few lines, a wireframe of the step page for a wide screen and for a phone (boxes and labels, no styling), and the list of article parts and information parts you propose. Ask the owner for the aesthetics and images they want you to follow. Then declare the design system.
2. **First draft.** The step page built for real with step `m02-s10` (a concept step) and step `m02-s06` (the lab step, with its Practice tab), rewritten to the new form, in light and dark, at 1440, 820 and 390 wide. Screenshots in the session. The other pages untouched.
3. **Before spreading it.** Any choice that changes how every step is written or how progress works.

## The two specimen steps

Rewrite `m02-s10` and `m02-s06` as articles in the new form: the same facts, sources and lab actions, told as one piece that reads from top to bottom. Keep their ids, their checks and their card questions. Pass the text through `humanizer`, then check every fact, number, name, command and query against the verification log. The other eleven steps of m02 keep the old components; the new page must still render them acceptably, because they are rewritten by a later card.

## What you hand to the planner

`lgtm/docs/adr/dz-article-format.md`: the new form of a step, written so the planner can fold it into the content contract: frontmatter fields added or changed, every component with its purpose, when to use it and when not, how long an article and each part should be, what goes in Learn and what in Practice, and one annotated example. And `lgtm/docs/adr/dz-design-system.md`: the tokens, the type, the rules a later component must follow.

## Limits

- The state, the sync, the quiz and exam logic and their rules do not change. Step ids, question ids and the storage key do not change.
- The schemas and `check:content` change only as the new form needs, and the old form stays valid until the rewrite card has run.
- The build still works with empty content folders and ships no sample content. Update the sample module in `tests/fixtures/content/` to the new form.
- Test servers on 127.0.0.1:8095 and 8096 only. Nothing is installed system-wide.

## Done when

- [ ] The owner said yes at each checkpoint; the pull request quotes what they agreed to.
- [ ] A step page on a 1440 screen uses the width with a reading column and a sidebar, and reads as one article; on 390 it reads in one column. Screenshots of `m02-s10` and `m02-s06` (Learn and Practice) in light and dark at the three widths are in the pull request.
- [ ] A step without actions shows no tabs; a lab step shows Learn and Practice, the tab survives a reload, and Mark complete waits for the check.
- [ ] The article parts and at least four information parts exist, are used in the two specimens, and are documented in the format ADR.
- [ ] Every other page is in the new design.
- [ ] `npm ci && npm test && npm run build` pass; the browser tests cover the tabs, the sidebar on wide and narrow screens, and one old-form step.
- [ ] The two ADRs exist; `lgtm/learn/CLAUDE.md` is updated.

## Report

The pull request link, what the owner agreed to at each checkpoint, the new form of a step in ten lines, test counts, and what the rewrite card must know.
