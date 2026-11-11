---
name: LGTM course
description: A study site for the Grafana LGTM stack, drawn as an ash-grey console with a light reading screen.
colors:
  ash: "#5e6367"
  ash-line: "#666b6f"
  ash-mark: "#898e93"
  ash-ink: "#26292b"
  bezel: "#141516"
  screen: "#d4d8da"
  screen-2: "#c5cacc"
  rule: "#b3b8bb"
  paper: "#f4f5f2"
  ink: "#141516"
  ink-2: "#2f3336"
  ink-3: "#4e5357"
  ink-on-dark: "#e8eaeb"
  signal: "#f2d40c"
  good: "#1d6b3a"
  bad: "#a3241c"
typography:
  display:
    fontFamily: "Control Freak Upset, Archivo Variable, sans-serif"
    fontSize: "clamp(2.5rem, 4.6vw, 4.875rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "0.01em"
  heading:
    fontFamily: "Control Freak Upset, Archivo Variable, sans-serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.14em"
rounded:
  none: "0px"
  sm: "3px"
  screen: "22px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.signal}"
    typography: "{typography.heading}"
    rounded: "{rounded.none}"
    padding: "8px 32px 8px 24px"
    height: "44px"
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 24px"
    height: "44px"
  button-hover:
    backgroundColor: "{colors.screen-2}"
  nav-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    height: "36px"
  nav-button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.signal}"
  tag:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    padding: "4px 16px"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "4px 10px"
  chip-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  screen:
    backgroundColor: "{colors.screen}"
    rounded: "{rounded.screen}"
    padding: "32px 44px 44px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "44px"
---

# Design System: LGTM course

## Overview

The site is a console. An ash-grey ground with a hairline grid and plus marks fills the window; side rails of thin-line drawings (circuit spines, labelled HUD micrographics, labels such as `_M02;`) hang on the window's own edges; a near-black bezel frames a light grey screen that holds everything a learner reads. Headings are set in a geometric cyberpunk display face, reading text in a plain grotesk, small labels in a mono face in capitals. One signal yellow marks what matters now (the kind tag, the current number, the primary action); everything else is ink, greys and bone.

The owner chose this look at the first design stop on 2026-11-11, after about twenty-five rounds of pre-designs (see `../docs/adr/dz-design-system.md`). The lesson page is a surface to read (an article with a sidebar); the quiz, the mock exam and the settings are surfaces to operate. Both share one theme; there is no light or dark switch.

## Colors

### Primary

- **Signal** `#f2d40c`: the one accent. The kind tag, the current counter digits, the lit dot of the globe, the active part number, the primary button's text, the focus ring, text selection. Never a large field, never body text.

### Neutral

- **Ash** `#5e6367` with **ash-line** `#666b6f` and **ash-mark** `#898e93`: the console ground and its grid.
- **Ash-ink** `#26292b` and the hairline `#373a3d`: drawings on the ash (rails, globe, tag hatching).
- **Bezel** `#141516`: the screen's 3px frame and the notches.
- **Screen** `#d4d8da`, **screen-2** `#c5cacc`, **rule** `#b3b8bb`: the reading surface, its insets and tracks, its rules.
- **Paper** `#f4f5f2`: labels and light panels (outcome, In this lab, Remember, info parts, chips, nav buttons, fields).
- **Ink** `#141516`, **ink-2** `#2f3336` (body text, 9.6:1 on screen), **ink-3** `#4e5357` (secondary, 5.4:1 on screen).
- **Good** `#1d6b3a` and **bad** `#a3241c`: only for right and wrong answers.

### Named Rules

- **No small text on the ash.** Ink on ash is 3.4:1, enough for the large title only. Small text that sits on the console (breadcrumb, chips, brand) gets a paper backing.
- **One yellow per view-region.** Yellow marks one thing at a time; two neighbouring yellow fills compete.
- **Decoration is ash-ink only.** Rails, globe and grid never use the signal colour, except the globe's one lit node.

## Typography

**Display:** Control Freak Upset (Graham Meade, Apostrophic Labs; self-hosted TTF). Fallback Archivo.
**Body:** Archivo Variable (OFL, `@fontsource-variable/archivo`, width axis included).
**Labels:** JetBrains Mono Variable (OFL, `@fontsource-variable/jetbrains-mono`).

### Hierarchy

- **Step title:** display, clamp(2.5rem, 4.6vw, 4.875rem), line height 1.04, ink on the ash.
- **Section heading (h2 in an article):** display 2rem with its two-digit number at 2.75rem and a yellow bar between.
- **Page heading (other pages):** display clamp(2rem, 3.6vw, 3.25rem).
- **Body:** Archivo 1.1875rem (19px), line height 1.7, paragraphs at most 70 characters wide.
- **Key idea:** Archivo 1.3125rem, weight 500.
- **Labels:** JetBrains Mono 0.75rem, weight 600, 0.14em tracking, capitals by CSS (the owner chose capitals for mono labels only; the files keep sentence case).
- **Numbers that matter** (stats, scores, section numbers, question numbers): display face.
- **The ramp:** every font size is a token in `src/styles/tokens.css`: `--lg-text-label` 0.75rem, `-small` 0.9375rem, `-ui` 1.0625rem, `-body` 1.1875rem, `-lead` 1.375rem, `-h3` 1.75rem, `-h2` 2rem, `-stat` 2.75rem, `-page` clamp(2rem, 3.6vw, 3.25rem), `-display` clamp(2.5rem, 4.6vw, 4.875rem). No other size is used.

## Layout

- The console: content max 90rem, side padding 116px on wide screens (24px under 1100px, 16px under 640px). The rails live in the outer 110px of the window and hide under 1100px.
- Every page opens with the same header on the ash (`PageHead.astro`, `head.css`): a yellow tag, a crumb, the title, a lead or the step's outcome, chips, and the dot-matrix plate on the right (the owner chose the plate "on every page", 2026-11-11). Behind it turns the globe, or on module, quiz and step pages the module's own icon.
- The step page: under that header, under it the screen with a reading column of 47.5rem and a 300px sidebar, 64px apart. Under 1100px the sidebar drops below the article; the header becomes one column under 900px.
- Only the page scrolls. The one exception is an open dialog, which scrolls itself while the page behind it is inert.
- Spacing follows a 4px base (4, 8, 12, 16, 24, 32, 48); more space above a heading (3rem) than below (1.125rem).

## Elevation & Depth

Flat. Depth comes from the bezel and from ink frames, not shadows. The single shadow token (`--lg-shadow`) is kept for the celebration banners. Dialogs dim the page with a 72% ink backdrop.

## Shapes

- **Cut corners**, not rounded ones: buttons cut their top-right corner by 12px; panels (Problem, Trap, boxes, flow stages) cut a corner by 14 to 18px. Only the screen and its bezel are rounded (22px).
- **Corner brackets** frame the key idea.
- **Hazard stripes** (ink and yellow at 135 degrees) mark the trap.
- **Ticket** shape with punched notches and a barcode stub marks Remember.
- **Octagon dots** form the step number.

## Components

### Buttons

- **Primary** (Mark complete, Start, Check answer): ink fill, yellow display text, cut corner.
- **Secondary** (Back, Next, Practice three questions): 2px ink frame, ink display text, screen-2 on hover.
- **Nav buttons** (Practice, Settings in the top bar): paper chip with an ink frame and mono capitals; ink with yellow text on hover.
- **Close** (dialogs): a bold X drawing; on hover a yellow square behind it and the X turns a quarter.
- Disabled: 50% opacity, not-allowed cursor.

### Chips

Mono capitals with a 2px ink frame on paper; the dark variant (exam domains) is paper text on ink.

### Cards / Containers

There are no soft cards. Article parts:
- **Problem:** ink panel, light text, yellow label, cut corner, three-dot mark.
- **Key idea:** screen-2 panel with ink corner brackets, larger text.
- **In this lab:** paper with a 6px ink edge.
- **Trap:** screen-2 with a hazard-stripe band.
- **Remember:** paper ticket with notches and a barcode stub.
- Every part's label carries a small yellow tab, an icon and a mono name. Only the `##` sections are numbered (the owner chose "Sections only", 2026-11-11).
- In this lab, Trap and Remember close the article together, after a heavier rule.
- **Lab check:** paper panel with an ink frame, right after How you know it worked on the Practice tab; a primary Check button; a red frame and a message that says what is wrong for each kind of check; a green edge once passed.

Information parts (Flow, Compare, Figures, Layers, Timeline) are drawn in ink and paper; the highlighted item is ink with paper text. See `../docs/adr/dz-article-format.md` for when to use each.

### Inputs / Fields

Paper fill, 2px ink frame, square corners, mono text; checkboxes and radios take the ink accent colour.

### Navigation

- Top bar: the bracketed brand `[ LGTM // LAB ]`, a yellow sync lamp, the two nav buttons.
- Learn and Practice: cut-corner tabs, 44px tall, with a 2px ink frame; the selected one is ink with yellow text. The tab is in the address (`?tab=practice`).
- The end of an article: Back, the middle action, Next. While a lab check is open, Learn shows "Go to practice" in the middle (the owner's choice, 2026-11-11) and Practice shows Mark complete, waiting for the check.
- The sidebar's contents list stays in view and marks the section being read (`aria-current="location"`).
- Dialogs (Settings, Practice, and on a step page the module outline): native `<dialog>` on a screen, opened over the current page; the open dialog is in the address (`#settings`, `#practice`, `#practice=<step id>`, `#module`). The module name in the step header is a link with a yellow underline that opens the outline.
- Quiz and mock exam: one question at a time; lettered option rows at least 56px tall; right and wrong shown with a mark and words as well as colour; one primary action at a time. Question squares are 44px; the current one has an ink ring outside and a yellow ring inside.

### Signature components

- **Plate:** one to four characters in a 5 by 7 octagon dot matrix on a bezel plate, with a mono line and a running dashed line (`Matrix.astro`): the step number, the module number, `P`, `60`, `404`. When a step is complete its dots are yellow.
- **Globe:** a wireframe sphere that turns once every 80 seconds behind the left of the header on pages without a module; its nodes blink.
- **Module icons:** one line-drawn, slowly animated icon per module (`ModuleIcon.astro`, `src/assets/deco/modules/`; m01 Helm a steering wheel, m02 the globe), on the overview's module cards and, large and faint, behind the module's page headers. One yellow detail, kept grey behind a title.
- **Readiness charts** (`ReadinessCharts.tsx`): each exam opens with a dark scope holding a 270-degree gauge of the weighted share right (marks at 70% and 80%), a radar of its domains (share right filled yellow, questions met out of 10 dashed) and the exam's weight per domain as a segmented bar. The table cells carry thin bars, and each verdict has a shape: a yellow octagon when ready, half yellow when close, a red cross when not yet, dashed before a verdict. All SVG with attributes only.
- **How the course works:** five dark tiles on a dashed track joined by yellow arrows, each with a large outlined number; the last tile (the mock exam) is yellow.
- **Overview hero:** the four LGTM layers drawn as slabs pulled apart, with one yellow request falling through them (`src/assets/deco/hero-stack.svg`).
- **Side rails:** two tall SVG compositions (`src/assets/deco/rail-left.svg`, `rail-right.svg`) of hairline spines and labelled micrographics, one of each drawing, repeating every 3400px.

## Motion

- The step title wipes in from the left (900ms, exponential ease-out); page headings do the same.
- The plate's lit dots fade in, character by character; the dashed line under it runs, one 16px tile per loop so it never jumps.
- Mark complete: the plate's dots turn yellow column by column; the celebration particles are yellow, paper and ink.
- The bars of a Figures part grow as they scroll into view; quiz squares flash when a question is answered.
- Article parts and information parts rise into place as they scroll into view.
- The globe turns and its nodes blink; the sync lamp blinks.
- Dialogs rise in when they open.
- The running mock exam has no motion at all, the header's included.
- Everything calms under the device's reduced-motion setting and when Effects is off in Settings (`data-motion="off"` on `<html>`). The celebrations keep their own ladder (`src/lib/fx.ts`).

## Do and don't

- Do put new visual values in `src/styles/tokens.css` first and use them through `var(--lg-*)` or the Tailwind theme.
- Do keep the mock exam quiet: no celebrations while it runs, no decoration inside the exam screen.
- Don't add a second accent colour, a light or dark theme, rounded cards, or drop shadows on panels.
- Don't use the display face for paragraphs; it is for titles, headings, numbers and buttons.
- Don't hard-code colours in components; the side-tab and grid exceptions the detector reports are recorded in `.impeccable/config.json`.
