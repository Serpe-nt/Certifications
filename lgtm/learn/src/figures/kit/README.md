# Stageshow kit, in part

These files come from the Stageshow skill, version 1.1.1 (commit `299140f`), under the MIT licence in `LICENSE`. Only what the lesson scenes use is copied: the stage and its script API, the cursor, keycaps, measuring, the clock, easing and the Connector. The kit's parts folder is left out because its icons need `lucide-react`, which this site does not depend on.

One change from the original: `Connector.tsx` imports `./measure` instead of `../measure`, because the files sit in one folder here.

Why the scenes look as they do, and how they stop, is recorded in `../../../../docs/adr/fg-figures.md`.
