# C0b: module m02 in the article form

Wave 5. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C0b.

## Owns

- `lgtm/learn/src/content/steps/m02/`: the eleven steps still in the old form (`s01` to `s05`, `s07` to `s09`, `s11` to `s13`).
- `lgtm/learn/src/content/questions/m02.yaml`, `lgtm/docs/verification/m02.md`.

Not yours: `s06-one-request-three-signals.mdx` and `s10-cardinality.mdx`. The design session rewrote them as specimens and the owner approved them; read them, do not edit them. `modules/m02.yaml` stays as it is.

## What this card is

The pilot's facts were checked and the owner accepted them. What the owner rejected was the form: labelled boxes stacked on each other. So this is a rewrite of form and prose, not of substance. Each of the eleven steps becomes an article like the two specimens.

- Keep every step id, question id, tag, exam mapping and check as it is.
- Keep the facts. An article needs more running text than the boxes had, so new sentences will state new things: each of them is a fact like any other, fetched from an official page and logged. Do not pad a step to reach a length; two good sections beat four thin ones.
- Do not turn each old `<Point>` into a section. Start from the problem and ask what the reader has to understand, in what order.
- Add `outcome` and, where the step introduces words, `terms`.
- Use an information part where it shows something: the pilot's steps have several comparisons and paths that were lists (three signals side by side, push against pull, the path of one request). Not on every step.
- No step of the eleven has a lab check, so none gets a Practice tab. `<InLab>` is welcome where the idea shows up in the lab; name real things from `lgtm/lab/docs/reference.md`.

## Also in this card

- `questions/m02.yaml` and the questions on the steps: remove every "Correct." and "Right:" at the start of an explanation (the page prints that itself), and reword the sentence so it still reads well. Change nothing else in a question unless you find a fault; list any such change in the pull request.
- Bring `lgtm/docs/verification/m02.md` in line: rows for new statements, rows of removed statements deleted, the dates of pages you fetched again.

## The lab

You need it only to read names for `<InLab>`. Create nothing.

## Yours

- Site port: 8097.
- Old-form parts (`<Why>`, `<Points>`, `<Point>`) must be gone from all eleven steps when you finish.

## Done when, on top of the template

- [ ] All thirteen steps of m02 are in the article form (eleven by you), with no old-form part left in the module.
- [ ] No explanation in the module starts with "Correct" or "Right".
- [ ] Ids, tags, exam mappings and checks are unchanged against `main` (`git diff` shows it; say so in the pull request).

The pool exists already, so the template's items about writing a pool do not apply; the independent check takes 5 of your steps and no questions.
