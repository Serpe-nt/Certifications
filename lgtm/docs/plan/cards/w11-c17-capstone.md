# C17: module m18 Capstone, interviews and exams

Wave 11. Read `content-module-template.md` first: it is the body of this card. Below is only what is special about C17.

## Owns

`lgtm/learn/src/content/modules/m18.yaml`, `lgtm/learn/src/content/steps/m18/**`, `lgtm/docs/verification/m18.md`, and `lgtm/docs/adr/c17-content-notes.md` if you have something the planner should know for the final sweep. The module has `quiz: false`, as m00 has: no pool file. Every step still has its card question.

## Read, on top of the template

- Module m14 as merged, all of it: the method and the five incidents are what the game days repeat without a script. Module m13 step 12, m15 steps on SLOs and burn rate, and m17 step 13 (the drills, and what they left behind).
- `lgtm/lab/docs/demo.md`: the table of fault flags, what each breaks, and the part "Error spans with every flag off". `lgtm/lab/docs/runbook.md`: "A fault flag does nothing" and "Tempo's querier is killed for memory". How the earlier modules switch a flag and read the flag screen's API.
- `lgtm/docs/research/02-certs-and-demand.md` (the two exams, and what job ads ask for), then the official pages again on the day: the Linux Foundation's exam pages for OTCA and PCA, the curriculum PDFs in `cncf/curriculum`, and the candidate handbook for format, proctoring, identification, retake and validity. `01-curriculum.md` has a note on weights that appeared in README files on 2025-11-28: both exam steps say so and link both.
- The site's own exam features, in `lgtm/learn/CLAUDE.md` (Constants) and in the pages `/exam/otca/`, `/exam/pca/` and `/practice/`: a mock exam draws 60 questions by the domain weights, runs 90 minutes and passes at 75%; readiness per domain needs 10 questions met and turns ready from 80%.
- For the last step: the official pages of Pyroscope, of OpenTelemetry's eBPF instrumentation (what Beyla became), of k6 and of Grafana Cloud's free tier, fetched on the day.

## The learner at this point

They have done m00 to m17 and want an interview or an exam within weeks. This module gives them three things to show: incidents solved without a script, a write-up of what they built, and answers they can say aloud.

## The module, 8 steps

The outline is in `01-curriculum.md`. The module serves both exams and jobs.

- **Step 1, game days (lab).** Three rounds: a fault the learner does not know is switched on, they find it with the method of m14, write one line (service, symptom, cause), then reveal it. The lab has no fault scheduler, so the step gives one: a small script, as a file in a fenced block, that the learner saves and runs in WSL. It reads the flag screen's API and refuses to start while any flag is on; it picks one fault at random from a list, switches it on without saying which, and notes the choice and the time in a file in the learner's home; `reveal` switches the flag off, reads the API again to prove it, and prints what it was and how long it ran. A flag is never on longer than 15 minutes: the script or the step makes sure of that, also when the learner walks away. Put on the list only flags whose effect this course has shown on this lab and that heal when they are switched off; say for each flag you leave out why (it kills a pod, it needs a browser, it shows nothing with the lab's load). Find out first how a flag is switched without the screen; if the API cannot do it, say so in your first report to the planner before you write the step around something else.
- **Step 2, the portfolio.** A write-up of the lab that an interviewer reads in five minutes: what was built, with which versions and why, three numbers the learner measured, three incidents solved and how, and what they would change. Give the structure and one filled example from this lab. The learner writes their own; the step changes nothing on the lab.
- **Step 3, the interview bank.** Thirty recurring topics. For each: the question as an interviewer asks it, what a good answer covers in under two minutes, in plain words, the follow-up that comes next, and the steps of this course that teach it. Thirty answers do not fit one readable step: split the bank into three or four steps by area (for example metrics and PromQL; logs and traces; OpenTelemetry and the Collector; running the stack and incidents) and say so in the pull request. Take the topics from the research on job ads and from what the course teaches; every factual sentence of a model answer gets a log row like any other statement.
- **Steps 4 and 6, the two exams.** Format, price, length, number of questions, pass mark, domains with their weights, validity, retake, how to book, and the rules of an online proctored exam, each from the official page fetched on the day. Map every domain to the modules of this course. Readiness is the site's own: say what the readiness panel counts and when it says ready.
- **Steps 5 and 7, the two mock exams.** What the mock is, how to sit it under exam conditions, how to read the result by domain, and what to do below 75%. The steps link to `/exam/otca/` and `/exam/pca/`; they do not copy questions. If a step would need something the site cannot do (a check that knows a mock was passed, for example), say so in the pull request and write the step without it. Do not change the site.
- **Step 8, what next.** Four short parts: continuous profiling with Pyroscope, eBPF instrumentation, load testing with k6, and Grafana Cloud. For each: what it is, when a team needs it, and one first thing to try.

Tags: the six that `04-tags.md` gives m18.

## The lab in this wave

- **Wait for card L11 before any lab action.** Since card C16's node drill the shop answers about ten times slower than a healthy lab (`05-open-items.md`, Lab defects). Card L11 is fixing it and may restart the shop or ask the owner to stop a worker once more. Begin with steps 2 to 8, which need no lab. The planner tells you when L11 is merged; only then run step 1.
- Fault flags: one flag at a time in the whole lab, read the flag screen's API before and after, at most 15 minutes on, ten quiet minutes before the next round. No other card switches a flag in this wave.
- A quiet shop has error spans of its own, on purpose: the flag streams of ad, fraud-detection and recommendation (`demo.md`). A game-day search for errors leaves them out with `&& name != "flagd.evaluation.v2.Service/EventStream"`, and the step says why.
- Do not open trace `1b9843164d5423b88ba041cee6303b88` by its ID before it leaves Tempo at about 20:15 UTC on 2026-11-17.
- Your session will refuse to change the shared cluster until the owner says so in it. Ask once, when L11 is done: a go-ahead to switch fault flags for three rounds, and a Grafana sign-in in your session's browser pane (never type a password, never read the admin password from the cluster). The owner reads little: lead with what they must decide, in two or three lines.
- No practice namespace should be needed. If one is, it is `learn-m18`, and it is gone at the end.

## Yours

- Site port: 8108. Local port-forwards: 18180 to 18189. Namespace and tenant, if needed: `learn-m18`.
- Token slots, if a step needs one: `metric-m18-1` to `-9`, `log-m18-1` to `-9`, `span-m18-1` to `-9`.

## Done when, on top of the template

- [ ] The steps of the outline exist, with the interview bank split as you chose; the pull request explains each split.
- [ ] The game-day script was taken from the built page and run for three rounds on the lab after card L11. In each round the fault was found by the method before it was revealed, the flag was on for at most 15 minutes, and the flag screen's API showed every flag off afterwards. The log has the times, the flag of each round and the line the method produced.
- [ ] The bank has thirty topics, each with a model answer, a follow-up and links to the steps that teach it.
- [ ] Every fact about an exam has a log row with the official page fetched on the day, and both exam steps carry the note on the weights.
- [ ] Each mock exam was started once on the built site, and its step says what the result page shows.
- [ ] A backslash in a `<Cmd>` or `<Query>` template string is written twice, and every command of step 1 was run from the text of the built page's `<pre>` element (`03-content-contract.md`, the six things).
