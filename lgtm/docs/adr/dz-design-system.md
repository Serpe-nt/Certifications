# DZ: the site's design system, as the owner chose it

Card: DZ (wave 4). Date: 2026-11-11. The system itself is `learn/DESIGN.md`; the tokens are `learn/src/styles/tokens.css`.

## Context

The site's look was left plain on purpose until this card. The owner brought the aesthetics to the first design stop as images and words, not as a finished spec, so the look was found in rounds of pre-designs: first small tiles in chat, then real HTML pages rendered with real fonts (about twenty-five versions in all, v1 to v27).

## What the owner asked for, in their words

- Mood: "cyberpunk aesthetics". Dark first, then "charcoal grey (as ash) background, no dark/light themes".
- Type: "cyberpunk aesthetics / techno / modern / easy to read"; "airy with large type ... not tiny or small text".
- Motion: "lively, with a lot of animations", with Effects and the device's reduced motion as off switches.
- Colour: rejected orange with acid ("looks like a vinaigrette"), then too much orange ("hard on the eye"), then picked black and white with a signal colour, then the colours of their "TEK LAB" reference: ash, near-black, light grey, black ink, yellow.
- Structure: kept the article from the first stop; asked for more complex shapes "like" their HUD and micrographics references, but "less noisy", "less repetition", "more to the sides of the screen".
- Detail fixes at the second stop: a Check answer button, a thinner bezel, Settings and Practice as closable dialogs, nav links that look like buttons, a plain X to close, the globe on the left, a smaller step number.
- The "proper" round (2026-11-11), after the owner called the result "still very rough": every page opens with the same header and dot-matrix plate ("On every page"); only sections are numbered ("Sections only"); Learn ends with "Go to practice" while a check is open ("Go to practice button"); the overview shows earned badges plus the next one ("Earned plus next badge"). From the owner's notes in that round: the dash line loops without a jump; the module name in the step header looks pressable and opens the module outline as a dialog; the overview gets a hero with its own drawing, numbered sections, and one animated icon per module (Helm a steering wheel, the globe for observability fundamentals) that also stands behind the module's page headers. A type ramp of ten tokens replaces the loose font sizes. Later notes in the round: the question box takes a label-sticker shape; the quiz numbers become a tape above the card; the main button sits in the middle of the bottom row, "Check" became "Submit", and after Submit a stamp says "Correct" or "Wrong" (the "Not quite" panel is gone).

## Decisions

1. **One theme.** An ash console, a near-black bezel, a light grey screen for reading, black ink, one signal yellow (`#f2d40c`). The theme setting stays in the saved state (the state does not change) but no longer changes colours; the Settings control for it is gone.
2. **Type.** Display: Control Freak Upset. Text: Archivo Variable. Labels: JetBrains Mono Variable, in capitals by CSS for small labels only (the owner's choice; the files keep sentence case).
3. **Shapes.** Cut corners instead of rounded cards; corner brackets; hazard stripes; a ticket for Remember; an octagon dot-matrix step number; a turning wireframe globe; side rails of labelled HUD micrographics pinned to the window edges.
4. **Motion.** Title wipe, dots lighting up, parts rising on scroll, globe and lamps; all calm under reduced motion and when Effects is off.
5. **Pages.** Every page sits on the same screen; Settings and Practice also open as dialogs over the current page.

## Fonts and their licences

| Font | Licence | How it is shipped |
|---|---|---|
| Archivo Variable | SIL OFL 1.1 | `@fontsource-variable/archivo@5.3.0`, bundled by Vite |
| JetBrains Mono Variable | SIL OFL 1.1 | `@fontsource-variable/jetbrains-mono@5.3.0`, bundled by Vite |
| Control Freak Upset | listed as "Free" on https://www.1001freefonts.com/control-freak.font; the file says "© 2001, Graham Meade. All rights reserved." and carries no licence text | `learn/src/assets/fonts/control-freak-upset.ttf`, committed |

The owner picked Control Freak Upset and decided on 2026-11-11 that the "Free" listing is enough to use it ("it says free on the website, we can use it whatever we want"). The planner should know that the file itself states no licence. If that ever matters, the display font is one line in `tokens.css` (`--lg-font-display`), and Bruno Ace (OFL) was the owner's earlier candidate.

Other fonts the owner proposed and that were not used, because their licences forbid web embedding or redistribution without a bought licence: Warcorp, Savery, Astor, Space Armor (personal use only), Alpha Male Modern (free, but "Don't put it on a CD or website ... without first contacting me"; the owner reported the designer's OK, then chose Control Freak instead).

## What was rejected, so it is not proposed again

Orange as the main colour; acid lime with orange; a light/dark pair; thin hairline-only frames; filled armor plates; dense repeating rails; symmetric left and right rails; generic display faces (Tektur, Anta, Orbitron, Bruno Ace and others from two rounds of specimens).

## Detector exceptions

Recorded in `learn/.impeccable/config.json`: the side-tab accent in `src/styles/step.css` (the outcome label's yellow edge and In this lab's ink edge) and the decorative grid in `src/styles/global.css` and `step.css` (the console grid and the barcode). Both are part of the approved pre-design.

## Sources

- The owner's answers at each stop: the DZ pull request.
- The approved pre-design: v27 (the generator scripts and pages were kept outside the repository).
