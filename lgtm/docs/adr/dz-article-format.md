# DZ: the article form of a step

Card: DZ, the lesson page as an article (wave 4). Date: 2026-11-11. For the planner, to fold into `docs/plan/03-content-contract.md` as version 2.

## Context

The owner read module m02 and rejected the form of a step: a stack of labelled boxes that read as separate topics, in one narrow column (`docs/plan/00-overview.md`, section 13). A step is now an article that reads from top to bottom. Running text under section headings carries the story; a small set of article parts and information parts break into it where they help; lab work moves to a Practice tab. Steps `m02-s10` (concept) and `m02-s06` (lab) are written this way as specimens.

## Decision

A step in the article form opens with `<Problem>`. The site detects the form by that part, so the old form (`<Why>`, `<Points>`) keeps building and rendering until the rewrite card (C0b) has run. A step uses one form or the other, never both.

### Frontmatter

Unchanged, plus two fields. The owner decided at the third stop (2026-11-11) that `outcome` is required on every step in the article form and `terms` stays optional:

| Field | Shape | Shown | Rule |
|---|---|---|---|
| `outcome` | string, at most 240 characters; required in the article form | under the title, on a light label | What the learner can do after the step, as a sentence that starts with "You can". |
| `terms` | list of up to 8 `{term, def}`; term at most 40 characters, definition at most 160; optional | in the sidebar | The terms the step introduces, each defined in one plain line. |

`check` decides the tabs: a step with a check (every lab and drill step) gets Learn and Practice; a step without one shows only the article.

### Body: the order of an article

1. `<Problem>`: the problem this thing was made to solve, told as a short scene. 80 to 420 characters. Always first.
2. A sentence or two of running text that leads from the problem to the idea (optional, often useful).
3. `<Idea>`: the answer in two or three plain sentences.
4. Two to five sections, each a `## Heading` with running text. Information parts sit inside the section they illustrate.
5. `<InLab>`, `<Trap>` and `<Remember>`, in that order, where the step has something for them.
6. On a lab or drill step: `<Do>`, `<Done>`, and `<Trap practice>` when the trap is about the lab work.
7. `<Question>`, last.

Section headings are numbered by the page (01, 02, ...); parts carry an icon and a name, not a number (the owner chose "Sections only" on 2026-11-11). Authors do not write numbers. The sidebar lists the `##` headings as "In this article", so headings say what the section says ("Labels multiply series", not "Details").

### Article parts

| Part | Purpose | Use when | Do not use | Length |
|---|---|---|---|---|
| `<Problem>` | The scene that makes the step needed | Every step, first | For a definition | 80 to 420 characters |
| `<Idea>` | The answer, stated once | Every step, once | For a list of facts | 2 or 3 sentences |
| `<InLab>` | Where the idea shows up in this lab, with real names | A concept touches something the lab has | For instructions (those go in `<Do>`) | 1 or 2 sentences |
| `<Trap>` | The usual mistake | A belief the step could create, or a common slip | For a new fact | 1 to 3 sentences |
| `<Trap practice>` | A mistake made while doing the lab work | The trap is about an action | On a concept step | 1 to 3 sentences |
| `<Remember>` | What to keep after the step | Every step, at most once | To repeat the idea word for word | 1 or 2 sentences |
| `<Do>` | Numbered actions in the lab, exact command or click | Lab and drill steps | On a concept step | about 8 actions at most |
| `<Done>` | How you know it worked | Lab and drill steps | | 1 or 2 sentences |
| `<Question>` | The step's knowledge check, as in version 1 | Every step, last | | as in version 1 |

`<Cmd>`, `<Query>`, `<LabLink>` and `<Figure>` are unchanged and may sit in running text or inside parts.

### Information parts

They take the place of pictures. An author fills them with data from the step; no drawing is needed. Each works on a phone and without animation. Use one where it shows something the text would otherwise list; at most three per step.

| Part | Items | Shows | Use when | Example |
|---|---|---|---|---|
| `<Flow caption>` | 2 to 4 `<Stage title kicker>` with one line each | A path through steps or components, left to right; the last stage is highlighted | Something moves from one place to the next | m02-s06: latency graph, trace view, log lines |
| `<Compare caption>` | 2 or 3 `<Col title hot>` with one line or a short list | Things side by side; `hot` marks the one the step recommends | The reader must choose between options | m02-s10: what one more label value costs |
| `<Figures caption unit>` | 2 to 5 `<Stat label value amount max hot note>` | Numbers with a bar to scale; `amount` and `max` set the bar, `value` is printed | The point is a size or a ratio | m02-s10: 4, 20 and 1,000 series |
| `<Layers caption>` | 2 to 5 `<Layer title hot>` with one line | A stack from top to bottom | Things sit on each other or go from general to specific | m02-s10: where a value goes |
| `<Timeline caption>` | 2 to 6 `<Event at title>` with one line | Moments in order; `at` is a time or a position | Order in time matters (an incident, a release) | the sample module |

`check:content` enforces: `<Problem>` first and its length; `outcome` present; `<Problem>`, `<Idea>`, `<Question>` (and `<Do>`, `<Done>` on lab and drill steps) present; no old-form parts mixed in; each information part has at least two items and items sit inside their part; `<Stat>` has a label, a value and `0 <= amount <= max`. More than three information parts on one step is a warning.

### Learn and Practice

- Learn is the article: everything except what is marked for practice.
- Practice holds `<Do>`, `<Done>`, `<Trap practice>`, the lab check, and the card question. The owner chose the card question's place at the first stop: on Practice for lab steps, at the end of Learn for steps without Practice.
- The lab check renders right after `<Done>` (the page puts it there; authors do not place it). A step in the old form, without `<Done>`, gets it at the end.
- The tab is in the address (`?tab=practice`), so a reload and the Back key keep it. Back and Next sit at the end of both tabs. While the check is open, Learn offers "Go to practice" in the middle and Practice shows Mark complete, which waits for the check.

### Writing rules that change

- Version 1 rules 1 ("purpose first") and 3 to 10 stay.
- Rule 2 becomes: "One step, one article of two to five sections. If a step needs more, split it."
- Running text carries the explanation; parts and information parts never hold the only copy of a fact the text needs.
- Labels: sentence case in the files. The site shows small mono labels (part names, captions) in capitals by CSS, which the owner chose at the first stop.

## Annotated example (from `m02-s10`)

```mdx
---
id: m02-s10                      # unchanged
...
outcome: You can work out how many series a metric can make, and keep unique values such as user IDs out of labels.
terms:                           # shown in the sidebar
  - term: Series
    def: One combination of a metric's name and its label values.
sources: ...                     # unchanged
---

<Problem>                        {/* the scene, first */}
A developer adds a `user_id` label to the request counter, to see requests per user. ...
</Problem>

One label with too many values did all that. ...      {/* running text leads on */}

<Idea>
Cardinality is the number of different label combinations a metric has. ...
</Idea>

## Labels multiply series        {/* a section: heading + text */}

A new label does not add a few series to a metric. It multiplies them. ...

<Figures caption="One request counter, more labels" unit="Series at most">
  <Stat label="method" value="4" amount={4} max={1000} />
  <Stat label="+ status_code" value="20" amount={20} max={1000} />
  <Stat label="+ pod, 50 values" value="1,000" amount={1000} max={1000} hot />
</Figures>

## Keep label values bounded
...
<InLab>The shop's `trace_id` is stored in Loki as structured metadata, ...</InLab>
<Trap>High cardinality is not always your own code. ...</Trap>
<Remember>Labels come from small, fixed sets of values. ...</Remember>
<Question id="q-m02-s10" answer="c"> ... </Question>    {/* unchanged */}
```

The lab step `m02-s06` follows the same order and adds `<Do>`, `<Done>` and `<Trap practice>`, which the page shows on Practice.

## What the planner must check

- The owner approved the first draft with both specimens at the second stop and this form for every step at the third stop (2026-11-11).
- `content-module-template.md` and `03-content-contract.md` need the new section "Step file" and the writing-rule change above.

## Sources

- The owner's verdict: `docs/plan/00-overview.md`, section 13; the answers at the design stops: the DZ pull request.
- The specimens: `learn/src/content/steps/m02/s10-cardinality.mdx` and `s06-one-request-three-signals.mdx`; the sample of every part: `learn/tests/fixtures/content/steps/m90/s01-concept.mdx`.
