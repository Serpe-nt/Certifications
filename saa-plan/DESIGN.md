---
name: SAA-C03 plan
description: A personal exam-study tracker drawn as the owner's Excimer poster, built on the Datum design system.
colors:
  signal: "#F7D123"
  on-signal: "#111111"
  alert: "#FF5533"
  alert-text: "#FF7A5E"
  paper: "#111111"
  paper-raised: "#1C1C1B"
  paper-sunk: "#0A0A0A"
  ink: "#EDEBE4"
  ink-2: "#BCB9AF"
  ink-3: "#8E8A7F"
  rule: "#36342C"
  inv-paper: "#E3E0D6"
  inv-ink: "#111111"
typography:
  display:
    fontFamily: "Saira, Exo 2, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(48px, 5.2vw, 80px)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Saira, Exo 2, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.4vw, 46px)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Saira, Exo 2, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.4
  lead:
    fontFamily: "Saira, Exo 2, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Saira, Exo 2, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.08em"
  button:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  none: "0px"
  dot: "50%"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
  "24": "96px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "36px"
  button-primary-big:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-ghost:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: "0 4px"
  tag:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 8px"
    height: "20px"
  tag-today:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
  card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "32px 48px 48px"
  box:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px"
  input:
    backgroundColor: "{colors.paper-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "40px"
---

# Design System: SAA-C03 plan

## Overview

**Creative North Star: "The Excimer Poster"**

The app is a near-black sheet with Datum's faint grid behind it. Each view has one subject (the overview's today pair, the day view's step card) and one quiet title in ink; yellow appears only as the view's one filled action or current tile and a few small live marks. Behind everything is Datum's own backdrop (`Datum.backdrop`): one figure per view, low in contrast and still, a small orbit on the overview and the plain grid in the day view, its hairlines in ink-3 at less than Datum's default strength, its one drifting live node yellow, and the day's number as a ghost. The backdrop carries no information.

Components come from the owner's Datum system (vendored in `site/dm/bundle.css`): cut panels and frames, hairlines, uppercase mono labels, dot-matrix numerals. The Excimer colours are applied on top, dark only. The page is dense but reads in order: big title, hero frame, next-step panel, then sections under arrow-mark headers. It avoids the generic dark dashboard of equal cards and neon accents.

**Key Characteristics:**
- Dark only. Near-black paper, charcoal plates, one cadmium yellow.
- Structure drawn in 1px hairlines. No shadows, glows or blur.
- Square corners or 45-degree cuts. No rounded boxes.
- Bold, tightly tracked Saira for titles. Uppercase IBM Plex Mono for labels, buttons and facts.
- A busy backdrop: Datum's one quiet figure per view, never a collage. Text never sits on it bare.

## Colors

The palette is a near-black sheet with warm off-white ink, quiet grey hairlines and one saturated cadmium yellow, used sparingly.

### Primary
- **Cadmium Signal** (signal): marks what is live. Used for the view's one filled action (or the current day's tile), the current step segment, the backdrop's live node, the timer fill, small state markers and the celebrations. Never for titles or labels. Always paired with **on-signal** text.

### Secondary
- **Hazard Vermilion** (alert / alert-text): only for what needs attention, such as the slip guard, danger buttons, wrong answers, an overrun timer and weak domains. `alert-text` is the readable tint for text on paper.

### Neutral
- **Excimer Black** (paper): the page and the plates behind text. **Raised Charcoal** (paper-raised) is used for cards, dialogs, buttons and tiles. **Sunk Black** (paper-sunk) is used for inputs, code, the "where" strip and the ground's discs.
- **Poster Charcoal** (plate): the ground's halftone plates (at 60% opacity).
- **Bone Ink** (ink / ink-2 / ink-3): text in three steps (current, secondary, quiet). Ink is also used for outlines, focus rings and "done" fills.
- **Umber Rule** (rule): panel borders and dividers.
- **Inverse sheet** (inv-*): used only for the week banner (`dm-invert`) on the celebration ladder.

### Named Rules
**The One Yellow Rule.** Signal goes on the live thing, the view's one title and the marks that lock onto the subject. Never use it for decoration. Each view has one filled yellow action.

**The Token-Only Rule.** Every colour comes from `dm/tokens.css`. Never hard-code a colour.

## Typography

**Display Font:** Saira (with Exo 2 for Cyrillic, Arial Narrow, system-ui)
**Body Font:** Saira
**Label/Mono Font:** IBM Plex Mono (with ui-monospace, SF Mono, Menlo)

**Character:** a condensed-leaning technical sans, set bold and tight for titles, against a measured mono for every label. Reads like poster type over instrument markings.

### Hierarchy
- **Display** (700, clamp(48px, 5.2vw, 80px), 0.9, -0.04em, signal): the view's one title. "Solutions Architect Associate" on the overview, "Day N" in the day view (52px), and the verdict on a quiz result. Sentence case. Sits on a paper plate.
- **Headline** (600, clamp(30px, 3.4vw, 46px), 1.02, max 24ch, ink): the step card's headline and the hero title.
- **Title** (400, 22px, 1.4): the step line on a card. Bold words at 600.
- **Lead** (400, 19px, 1.6, max 68ch): the "why" explanation and the next step.
- **Body** (400, 16px, 1.55, tabular numerals): reading text. Secondary text is 14 to 15px in ink-2.
- **Label** (mono 500, 11px/16px, 0.08em, uppercase): labels, section heads, tags, facts. Buttons use the same style at 12px (13 to 14px for big buttons).
- **Numerals**: Datum's dot-matrix readout for the day number, and light Saira (300) for the day-tile numbers.

### Named Rules
**The CSS Case Rule.** Labels are uppercased by `text-transform`. The DOM text stays in sentence case.

## Layout

The content column is 1240px wide (`--wrap`) with a 32px gutter (16px at 860px and below), centred over the full-bleed ground. A 48px sticky rail runs along the top: the yellow code block, where you are, the sync notice, the day bar and the focus timer. The overview opens with a two-column title bar (title on the left, key: value facts and the header buttons on the right). Below it is the today pair: the hero frame at 2fr and the next-step panel at minmax(320px, 1fr), side by side from 900px. Sections follow under arrow-mark headers with 48px above and 24px below. The day view centres the article card with its sidebar on the right from 1300px, with the sidebar below it under that. Back, Mark complete and Next are fixed at the foot. Only the page scrolls. Spacing follows the 4px Datum scale. Breakpoints are 1300, 1100, 900, 860, 760 and 640px. On phones the grids drop to two columns or one, and the rail keeps only the code block, the day and the time.

## Elevation & Depth

The system is flat. Depth comes from tone (sunk, paper, raised, plate) and hairlines, never from shadows. The only use of `box-shadow` is a hard, unblurred spread in `--paper` (`0 0 0 4–12px var(--paper)`). It acts as a plate that extends a text block's background over the ground. Layering is by z-index: ground 0, content 1, rail 25, popovers 26–30, celebrations 50–60.

### Named Rules
**The Plate Rule.** Text never sits bare on the ground. Give it a `--paper` plate (background plus spread).

**The No-Shadow Rule.** No shadows, glows, gradients or blur. Linear gradients appear only as hard-stop fills (a button's wipe, a chamfer, hatching).

## Shapes

Every radius is 0. The form language is the 45-degree cut. Cards cut the top-right corner by 16px (`--chamfer-l`) and draw a rule along the diagonal. Primary buttons cut the bottom-right corner by 10px. Datum frames add a 24px notch tab and 32px corner cuts, with an optional footer step. Disabled controls carry 135-degree hatching. Bars end in a slanted edge. Markers are 8px squares, a 45-degree-rotated square for quiz days, and an 8×12 arrow triangle for section heads. Crosshairs are 19px plus-marks set 16px outside the subject's corners. The only circles are dots (`50%`).

## Components

### Buttons
- **Shape:** square (0) with a 1px ink outline.
- **Primary:** filled with signal, on-signal text and weight 600, with the bottom-right corner cut. The one filled yellow action per view (Start / Continue, Mark complete). Hover underlines the label.
- **Outline (default):** raised paper with an ink border. On hover, ink wipes in from the left (`background-size`, 160ms eased) and the text turns paper. Press nudges it 1px.
- **Ghost:** no border. The label is wrapped in ink-3 `[ ]` brackets. `aria-pressed="false"` dims it to ink-3. Used for header toggles and nav.
- **Danger:** alert-text label with an alert border that fills with alert on hover.
- **Disabled:** ink-3 with a hatched right edge.
- **Focus:** 2px ink outline, offset 2px.

### Chips
- **Tag / pill:** 20px mono uppercase with an ink outline on raised paper and a 6px square marker. States: `ok` filled with ink, `warn` with an alert outline, `bad` filled with alert, today filled with signal.

### Cards / Containers
- **Step card:** raised paper with a rule border and the 16px top-right cut. Padding is 32px 48px 48px from 761px. Its parts are **boxes**: paper fill, rule border, 16px padding, under a mono label with a square marker. The why-box is framed in ink-3 with a signal marker. The trap uses an alert hazard marker.
- **Hero frame:** a Datum frame with notch tab and footer, the day as a yellow dot-matrix readout, and facts as key: value rows.
- **Dialogs:** raised paper with a rule border. Max 560px.

### Inputs / Fields
- **Style:** 40px, sunk paper, 1px ink border, mono 14px, square.
- **Focus:** ink accent and caret, with the global 2px ink outline.

### Navigation
- **Rail:** 48px sticky strip on paper with a rule bottom edge. A signal code block on the left. Mono uppercase crumbs with the current one in ink. The day bar is a mini segment row (done in ink, now in signal). The focus timer's 2px fill bar runs along the bottom edge (signal while running, ink on break, blinking alert when over).

### Day tiles (signature)
Element boxes in a grid. Raised paper with a large light Saira numeral and a mono day label. Today has a signal badge. On hover a `[+]` mark slides in.

### Celebrations (signature)
Cut-corner banners in the centre of the screen. A mono label line, a display title in ink and a `>` terminal fact line. They form a ladder (block, day, week in the inverse sheet, all as a full signal block), with canvas bursts and filaments in the token colours from `fx.js`. Earned things appear as badges dropped in at the top of the screen.

### Motion
Per view there is one arrival: the backdrop fades up and the subject's corner crosshairs lock on. Card and sidebar parts switch on in order, 60ms apart. A new step gets a signal scan line along the card's top; the arrival plays once (a re-render of the same card, such as a picked answer, never replays it). There is one live element per view. Travel uses `cubic-bezier(.16,1,.3,1)` and switches are linear. Calm stops the loops. Motion off and `prefers-reduced-motion` hold everything still.

## Do's and Don'ts

### Do:
- **Do** give every view one quiet ink title and at most one signal fill.
- **Do** put a `--paper` plate under any text that overlaps the ground.
- **Do** draw structure in 1px `--rule` hairlines; controls rest on `--ink-3` outlines and turn ink on hover or focus.
- **Do** cut corners at 45 degrees (10 / 16 / 32px) where a shape needs character.
- **Do** set labels, buttons, tags and facts in uppercase IBM Plex Mono through CSS.
- **Do** use only plain glyphs for marks (`↗ → ✓ ✕ ■ □ ▶ + / > _ [ ]`).

### Don't:
- **Don't** round a box. Every radius is 0 except dots.
- **Don't** use shadows, glows, gradients or blur.
- **Don't** spend signal on decoration or second actions. Use `--alert` only for what needs attention.
- **Don't** hard-code a colour, and don't add a light theme.
- **Don't** put information on the ground beyond the day's ghost number.
- **Don't** use emoji in the UI.
