# C0: notes for the next content workers

Card C0, module m02, 2026-11-10. What the pilot taught about writing a module for this site.

## What took the longest

1. Reading the sources, not writing. About 35 official pages for one concept module. Fetch them all at the start, save them as text in your scratchpad, and grep them while you write; every point then gets its row in the verification log as you go.
2. Making the quiz options fair. In the first draft 25 of 39 right answers were the longest option, which gives the answer away. Measure it (option lengths per question) and shorten right answers or lengthen wrong ones until no right answer clearly stands out. In the final pool 9 of 39 right answers are the longest, none by much.
3. Walking the cards in the browser. The card question is a `client:visible` island: it hydrates only when scrolled into view, and its options are shuffled then. Scroll to it, wait a second, then click.

## Where the contract was unclear (the planner may want to fold these in)

- **"Right:" in card explanations.** The contract's example starts the right option's explanation with "Right:", but the site already prints "Right." above it, so the learner reads "Right. Right: ...". Write the explanation without the prefix. The sample module in `tests/fixtures` has the same habit.
- **YAML strings are not Markdown.** Backticks in a question file show as backticks. Use `<code>` and `<b>` there (the contract says so under "Markup", easy to miss). In MDX, backticks are fine.
- **YAML traps.** A plain value with `: ` in it breaks the file (write "It is the opposite. A job ..." or quote it). A competency with commas inside a flow mapping must be quoted: `{cert: pca, domain: P1, competency: "Basics of SLOs, SLAs, and SLIs"}`. Options that are bare numbers (`- text: 60`) must be quoted, or the schema sees a number.
- **The dev server caches content.** After editing `questions/*.yaml`, restart `npm run dev`; a reload is not enough.
- **Lab facts as sources.** Frontmatter `sources` must be https and must answer 200 to `check:links`, so repository files cannot go there. They go in the verification log by path.
- **The Google SRE book** (sre.google) is not in the contract's list of official sites, but it is the original source of the golden signals and of SLI, SLO and SLA, and the research file already uses it. I used it for those topics only.

## Phrases and patterns that worked

- `Why`: a concrete scene with a time or a number ("At 3 a.m.", "One click on Place order starts work in six services"), then the need in one plain sentence. Keep it under 420 characters; most landed at 250 to 330.
- `Idea`: name the thing in the first sentence, say how it works in the second, why it matters in the third.
- Point labels as plain statements: "Series multiply", "Events are a kind of log", "What metrics cannot tell you". Each point leads with what the thing is for.
- The last point of most cards is "In this lab": one or two sentences that tie the concept to a real name in the lab (a dashboard, a label, a service). It makes a concept card feel concrete without a lab action.
- Traps that correct a belief the card might create ("Zero-code is not full instrumentation"), not new facts.
- Scenario questions with a number or a symptom ("40 pages a night", "unknown_service:java"), and wrong options that a real beginner would pick.

## A card I am proud of

`m02-s10` Cardinality. It starts from a believable disaster (one `user_id` label), shows the multiplication with small numbers, then follows the same idea across three tools: Prometheus's own rule of thumb, the OpenTelemetry SDK's 2,000-combination limit with its overflow marker, and Loki's streams and structured metadata. It ends with where unique values belong, and the lab's own `trace_id` as the example. One concept, three products, no new vocabulary left unexplained.

## What the template should say for the next module

1. Fetch every source page at the start and keep it as text; grep it while writing. Record each statement in the verification log as you write the card.
2. Run `npm run check:content` after the first card, to catch format problems once.
3. Before finishing, measure the option lengths of the pool and of the card questions.
4. Write card explanations without "Right:", and question YAML with `<code>`, never backticks.
5. Walk every card: scroll the question into view before clicking; restart the dev server after YAML edits.
6. For PCA P1 "Service Discovery": m02 covers it lightly inside push versus pull (three questions); m03 step 6 should go deep and add its own questions.
