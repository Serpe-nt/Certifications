---
name: SAA-C03 plan
description: A personal exam-study tracker drawn as plates from a survey, on the owner's Datum 6 design system in its Night palette.
colors:
  signal: "#FF4A1C"
  signal-text: "#FF6A42"
  on-signal: "#050D10"
  ground: "#050D10"
  ground-lit: "#164550"
  sheet: "#0B1518"
  mist: "#131F23"
  line: "#1F2D32"
  off: "#34454B"
  steel: "#6B8A93"
  ink: "#EAF1F2"
  ink-2: "#9BB5BC"
  on-ink: "#050D10"
  glass: "rgba(5,13,16,0.46)"
  glass-edge: "rgba(234,241,242,0.2)"
typography:
  display-light:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(40px, 6.4vw, 88px)"
    fontWeight: 300
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: "44px"
    letterSpacing: "-0.025em"
  heading:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "30px"
    letterSpacing: "-0.012em"
  subheading:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body-s:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
  label:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: "14px"
    letterSpacing: "0.08em"
  plate-l:
    fontFamily: "Tektur, Arial Narrow, sans-serif"
    fontSize: "68px"
    fontWeight: 800
    lineHeight: 0.8
    fontVariation: "'wdth' 75"
  plate-figure:
    fontFamily: "Tektur, Arial Narrow, sans-serif"
    fontSize: "42px"
    fontWeight: 800
    lineHeight: 0.84
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  data:
    fontFamily: "Martian Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "0.04em"
  micro:
    fontFamily: "Martian Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "14px"
    letterSpacing: "0.08em"
  word:
    fontFamily: "Noto Sans JP, Hiragino Sans, sans-serif"
    fontSize: "52px"
    fontWeight: 900
    lineHeight: "58px"
    letterSpacing: "0.04em"
rounded:
  none: "0px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
  space-12: "48px"
  space-16: "64px"
  space-24: "96px"
  plate-margin: "32px"
components:
  button-signal:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "52px"
  button-signal-hover:
    backgroundColor: "color-mix(in srgb, #FF4A1C 88%, #050D10)"
    textColor: "{colors.on-signal}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "52px"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "52px"
  button-line-small:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "40px"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 14px 0 10px"
    height: "30px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "52px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "24px"
  nav-tabs:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px"
  field-signal:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.none}"
    padding: "16px"
---

# Design System: SAA-C03 plan

## Overview

**Creative North Star: "The Survey Plate"**

Every view is a plate from a survey: a sheet laid on a lit carbon ground, numbered PL.NN, with one datum line drawn through it and one ember signal on it. The subject of the plate is the day's work: the next step on the overview, the step card in the day view, the question in the quiz. Everything else is plate furniture (codes, barcodes, hairlines, facts tables, lamps) set quietly around it.

The system is the owner's Datum design system, version 6, vendored unchanged in `site/dm/` (`bundle.css`, `datum.js`, `tokens.json`, and `tokens.css` written from the tokens). It runs in Datum's default Night palette, carbon and ember, the pair nearest the owner's black and orange reference. The app adds layout and the data it has to show; it does not restyle Datum. Density is that of a working instrument: one step per screen, nothing folded, only the page scrolls, and celebrations on a rising ladder that redraws Datum's own light, arcs, contours, cells and lamps.

The build refuses the generic dark dashboard of equal cards: the overview below the hero is a mosaic of cells on hairlines, not a grid of floating cards. Dark only.

**Key Characteristics:**
- Datum 6, unchanged, Night palette: carbon ground, ember signal.
- One datum line per view, one signal fill per view.
- Light, not shadow: a lit ground with grain, a key light on the subject, glowing lamps.
- Square corners with one 45-degree cut on what you press and what floats.
- Onest for words, Tektur for plate figures, Martian Mono for data only.
- A real photo in the hero bay, graded to monochrome by Datum and relit in ember.

## Colors

Carbon neutrals in a cool teal cast, with one ember that behaves as light.

### Primary
- **Ember Signal** (`signal`): the one colour, and it is light. The datum line and its glow, the key light on the ground and on the hero photo, lamps, the leading cell of a bar. As a solid fill only once a view: the signal button or one signal field. Shapes and text of 24px and up only.
- **Ember Text** (`signal-text`): signal as small text on sheet or mist: an error line, a wrong answer, the billable warning's words.
- **On Signal** (`on-signal`): text and the end cell on a signal fill.

### Neutral
- **Carbon Ground** (`ground`): the table the sheets lie on: page margin, the bay, the gaps between sheets. Never flat in a bay; lit by `ground-lit` and the signal.
- **Lit Ground** (`ground-lit`): the ambient pool of light behind a subject and at the top of the page. A fill for light only, never a block.
- **Sheet** (`sheet`): every surface that holds content: the hero sheet, the mosaic sheet, the day view, the quiz dialog, inputs.
- **Mist** (`mist`): one step off the sheet: nav tabs, the timer face, soft blocks (the knowledge check, self-check), tooltips, code.
- **Hairline** (`line`): table rows, mosaic dividers, the `dm-spec` facts rules. Decoration, not a control border.
- **Off** (`off`): inactive shapes only: unreached steps, unlit bar cells, idle question squares, quiet tag outlines. Never text.
- **Steel** (`steel`): the mid tone; muted marks and the second series of a chart. Never body text.
- **Ink** (`ink`): text, solid controls, control outlines, plate furniture, done cells. 7:1 or more on ground, sheet and mist.
- **Ink 2** (`ink-2`): secondary text, input outlines at rest, data labels, the quiet half of a title.
- **On Ink** (`on-ink`): text and end cells on an ink fill.
- **Glass** (`glass`, `glass-edge`): only where something floats over a picture or the bay: the nav block over the lit ground, the hero's "Steps today" panel.

### Named Rules
**The One Signal Rule.** A view carries at most one solid signal fill: the `dm-btn--signal` (Start / Continue on the overview, Mark complete or Next in the day view, the go button in each quiz screen) or one signal field (`dm-field-signal`), never both. Every other use of ember is light: lines, lamps, glows, outlines, small `signal-text`.

**The Tokens Only Rule.** Every colour in the app's CSS is a Datum token or a `color-mix` of tokens. No hex values appear in `style.css` or `fx.css`; the canvas celebrations read their colours from Datum's tokens.

**The Dark Only Rule.** The page is pinned to `data-theme="night"`. Datum's Day theme ships in the vendored files and is not used.

## Typography

**Display Font:** Onest (with system-ui, -apple-system, Segoe UI)
**Plate Font:** Tektur at width 75 (with Arial Narrow)
**Data Font:** Martian Mono (with ui-monospace, SF Mono, Menlo)
**Word Font:** Noto Sans JP 900 (with Hiragino Sans)

**Character:** Onest carries every word, from the light hero title to the bold uppercase labels; Tektur, condensed, gives plate numbers and big figures the look of stamped instrument plates; Martian Mono appears only where a value is a value.

### Hierarchy
- **Display light** (300, clamp(40px, 6.4vw, 88px), 0.98): the day's title in the hero's bite. The calm voice for a view led by a dark picture; the hero never takes the heavy display beside it.
- **Title** (600, 40px / 44px; 32px over 440 characters; 22px on a phone): the task title in the day view and the question in the quiz, sentence case.
- **Heading** (600, 24px / 30px) and **Subheading** (600, 17px / 24px): section and panel headings; names inside a row or notice.
- **Body** (400, 16px, 1.55): running text, measure about 68 to 74 characters.
- **Body small** (400, 14px / 22px): notes, help, where-to-do-it lines.
- **Label** (700, 11px / 14px, 0.08em, uppercase by CSS): button text, tags, tabs, the bracketed name over a group (`[ Next step ]`). The DOM text stays sentence case.
- **Plate** (Tektur 800, 68px, 0.8): PL.NN plate numbers. **Plate figure** (Tektur 800, 42px, 0.84) for day numbers in the map, big stats and notice headings of alerts.
- **Data** (Martian Mono 400, 12px / 18px) and **Micro** (Martian Mono 400, 11px / 14px, 0.08em, uppercase): values, ids, timestamps, facts-table labels, the strip under the header.
- **Word** (Noto Sans JP 900, 52px): Datum's vertical katakana word in a bay. The font is loaded; the shipped views do not set a word yet.

### Named Rules
**The Mono Is Data Rule.** Martian Mono is for values, ids, measurements and plate furniture, never as a look for prose or headings.

**The One Title Voice Rule.** A view takes display or display-light, never both. The hero uses display-light.

## Layout

The page is Datum's page: `.dm-page` with grain on the carbon ground, content held to a 1240px wrap with 32px gutters (`plate-margin`). Sheets sit on the ground with ground showing around them.

- **Header:** a Datum nav block on a sheet, sticky: the mark and SAA-C03, the views as tabs, then the sync notice, the focus timer, Search and Settings. Under it a Datum strip in micro type: where you are, the Effects and Sound switches.
- **Overview:** the hero sheet (Datum's Hero: a copy column beside the bay), a strip, then one flush sheet holding three Datum mosaics on 12 columns with 1px `line` gaps: the cells (running, where you stand, the numbers, today, practice, readiness, day by day, scores), the day map (one cell per day, a row per week), and the places and links. Cells span 6 or 12 below 1180px; the day map drops to 4 then 2 columns.
- **Hero:** the copy column holds, top to bottom, the plate header PL.NN with its barcode, the lead (the day's goal), the next step with the one signal button, a `dm-spec` facts table, and the day's title in the bite. The bay holds the cloud photo in a `dm-slot`, Datum's arcs and micro marks, and a glass "Steps today" panel. At desktop widths the summit sits on the datum line (key point pinned at 76px from the bay's top); below 860px the hero stacks and the key light shrinks to the summit (radius 150px).
- **Day view and quiz:** Datum's App view. A `dm-sheet` with a `dm-plate` header (PL.NN, barcode, "Step N of M"), the datum line under it, a train of square step cells, then a `dm-split`: the article and a 320px aside. The aside goes under the article below 1024px. The action bar with Back, Mark complete and Next sits at the window's foot.
- **Rhythm:** Datum's spacing scale, 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. 16px inside cards and between hero blocks, 24px sheet padding and button sides, 32px between groups, 48px between sections.
- **Narrow and touch:** below 860px Datum hides the nav tabs and edge marks, sheets pad 16px, splits collapse to one column; below 640px the header code and timer mode hide. On coarse pointers switches grow to 44px and fields to 16px text. Key hints hide on touch; every hover feature has a tap path.

### Named Rules
**The One Datum Line Rule.** Each view has one datum line: under the hero with the summit on it, under the plate header in the day view and the quiz. Content arrives and settles on it in order (`dm-arrive`, `data-i`).

## Elevation & Depth

Depth is light, not shadow. The ground is lit: an ambient pool of `ground-lit` and one key light of signal sit on the subject's key point, under a grain. Sheets lift by a one-pixel inner rim (`--dm-rim`) and a faint top-lit fill (`--dm-sheet-fill`). Glass floats only over a picture or the bay, with a blur and a `glass-edge` rim. Glows belong to the signal alone: the datum line glow, the lamp glow, the figure glow. There are no offset drop shadows.

### Shadow Vocabulary
- **Rim** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.08), inset 0 0 0 1px rgba(255,255,255,.04)`): the edge of every sheet, popover and tooltip.
- **Lamp glow** (`box-shadow: 0 0 8px 1px color-mix(in srgb, var(--signal) 55%, transparent)`): lamps, the current cell, the live combo cells.
- **Line glow** (`box-shadow: 0 0 10px 0 color-mix(in srgb, var(--signal) 62%, transparent), 0 0 28px 2px color-mix(in srgb, var(--signal) 13%, transparent)`): the datum line.

### Named Rules
**The Light Not Shadow Rule.** Nothing casts a shadow. A thing stands out because it is lit, rimmed or glowing in signal.

## Shapes

Every corner is square (`radius 0`). Shape comes from one 45-degree cut at the bottom-right corner: 7px on tags, end cells and icon cells; 12px on what you press (buttons, choices, nav tabs); 16px on blocks (glass panels, alert and done notices, the signal field); 32px on the bay and where a container bites into it. Strokes are 1px hairlines for furniture and figures, 1.5px for control and tag outlines, 2px for the datum line and the focus ring. Bracketed labels (`[ Up next ]`) and dm-brackets frame quiet groups. Step trains are square cells; the quiz is a square turned on its corner.

## Components

### Buttons
- **Shape:** square, 52px tall (40px small), 12px cut bottom-right, 1.5px outline, label type.
- **Signal:** ember fill with carbon text and a carbon end cell holding the arrow. One per view: Start or Continue Day N, Mark complete, Start quiz, the quiz's go button. Hover deepens it 12% toward carbon.
- **Ink:** Datum's default, ink fill with on-ink text.
- **Line:** transparent with an ink outline; the header's Search and Settings, the timer's menu actions, Back and Overview in the day view, Next when it is not the main action.
- **Press / Focus:** press nudges 1px down and to 98.5%; focus is a 2px signal outline inset 5px (on the signal button, on-signal).

### Tags
- **Style:** 30px tall, 1.5px ink outline, 7px cut, label type. Quiet variant with an `off` outline and `ink-2` text; solid variant in ink.
- **Place tags:** the ①–④ place marks in the plan data render as Datum tags inside running text, set 1px up with a small margin.

### Cards / Containers
- **Sheets:** `sheet` with the rim, 24px padding (16px below 860px), square, no cut.
- **Mosaic cells:** cells on a 12-column grid separated by 1px `line` gaps; stats in Tektur figures, gauges and bars in slanted cells.
- **Quiet blocks on the step card:** open sections under a bracketed label; why in brackets; the exam trap a `dm-notice`; the billable things the one alert notice; knowledge check and self-check soft blocks on mist.
- **Glass:** only over the bay or a picture, 16px cut.

### Inputs / Fields
- **Style:** 52px, 1.5px `ink-2` outline, sheet fill, square with a small filled corner triangle at bottom-right.
- **Focus / hover:** outline and corner go to ink; global focus ring 2px.
- **Error / Disabled:** error is a 2px signal outline and corner with `signal-text`; disabled outlines in `off`.

### Navigation
- **Nav block:** Datum's nav block on a sheet, sticky. The mark (an ink square with the datum symbol), SAA-C03 in plate furniture, the views as tabs in a mist rail with a 12px cut; tab hover lifts 9% ink. Below 860px the tabs hide and the header wraps; below 1180px the Search and Settings labels collapse to icons.
- **Strip:** micro type in `ink-2` under the nav block; switches carry a lamp that lights in signal when on.

### Choices (quiz)
Datum's choices: a full-width row, 52px minimum, 12px cut, `ink-2` outline, a Tektur key letter in its end cell. The correct answer is drawn in ink, the wrong pick in signal, each with its state word.

### Plate header (signature)
PL.NN in Tektur beside a Datum barcode of the day id and two lines of micro furniture ("D3 / SAA-C03", "Day 3 of 22"). Opens the hero copy column, the day view and every quiz screen, with the datum line under it.

### Hero bay (signature)
The cloud photo (`site/img/cloud.webp`, Unsplash, by Iván Levyv) in a `dm-slot`. Datum grades it to monochrome in the ground's hue and relights it with the key light in ember at the summit; Datum's arcs and a micro readout sit over it, and a glass panel shows today's step segments.

### Celebrations (signature)
Drawn on a canvas in Datum's language: the key light on the ground, the datum line drawn through it, arcs and ticked bearing rings, rising contours, dot screens, slanted bar cells, square cells, spot crosses and lamps. Banners are plates: a sheet for a day, a solid ink block for a week. Every rung of the ladder is kept, each bigger than the one below; effects and sound toggles, Settings' calm/off and reduced motion stop them.

### Motion
Datum's own grammar: `--dm-ease` cubic-bezier(.2,.8,.2,1), 150ms state changes, a 620ms arrival in which the datum line draws and content settles in order, a 3.2s cycle for the one pulsing lamp. Stopped by `prefers-reduced-motion` and `data-dm-motion="off"`.

### Transitional layer (not part of the system)
Views not fully moved still use Datum 4 token names (`--paper`, `--paper-raised`, `--rule`, `--alert`, `--action`, `--chamfer` and others), mapped onto Datum 6 tokens by aliases at the top of `style.css`, along with legacy button, pill and label rules. New work uses Datum 6 tokens and `dm-*` components directly; a view drops the aliases when it moves.

## Do's and Don'ts

### Do:
- **Do** use Datum 6 exactly as vendored in `site/dm/`; re-vendor from the artifact when it changes.
- **Do** keep one solid signal fill per view, and let every other ember be light: the datum line, lamps, glows, outlines.
- **Do** build new views from Datum's views and components (Hero, App view, nav block, strip, mosaic, plate header, spec table, notices, choices, train, bar), using Datum 6 tokens only.
- **Do** set every colour as a token; read tokens in canvas code too.
- **Do** keep square corners with one 45-degree cut sized by role (7 / 12 / 16 / 32px).
- **Do** give everything that can be finished a rung on the celebration ladder, and keep every existing rung.
- **Do** make every view work by touch and at phone width: tap paths for hover features, 44px coarse targets, 16px fields.

### Don't:
- **Don't** edit any file in `site/dm/` or override Datum's component styling.
- **Don't** use Datum's Day theme or any light mode; the app is dark only.
- **Don't** put a second signal button or signal field in a view.
- **Don't** use emoji in the UI.
- **Don't** round corners or cast offset drop shadows; depth is light, rim and glow.
- **Don't** set prose or headings in Martian Mono.
- **Don't** set display and display-light in the same view.
- **Don't** add new rules on the Datum 4 alias names; they are a transitional layer, not the system.
- **Don't** trim, merge or quiet a celebration rung.
