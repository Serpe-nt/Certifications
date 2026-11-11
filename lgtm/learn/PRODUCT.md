# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One learner, the owner: a DevOps engineer preparing for DevOps and SRE jobs and for two certifications, OTCA (OpenTelemetry Certified Associate) and PCA (Prometheus Certified Associate). They know Kubernetes and Helm and are new to the tools each lesson teaches. They read lessons on a PC, a phone or a tablet, wherever they are, and do the lab work on the PC, with the lab cluster and Grafana open beside the site.

The site is theirs, but they may show it to colleagues or interviewers as proof of the work. A stranger who opens a page should understand at a glance what it is and where it sits in the course.

## Product Purpose

A course on observability with the Grafana LGTM stack (Loki, Grafana, Tempo, Mimir), Prometheus and OpenTelemetry, taught against a production-like lab on the owner's own Hyper-V cluster. Each step explains one thing and, where there is something to do, has the learner do it in the lab and paste a result the site checks. Quizzes, review, weak-spot practice and mock exams prepare for the two certifications.

Success: the learner understands each step on one reading, top to bottom, can do the lab work without leaving the step, and is ready for the exams and for an interview about the stack.

## Positioning

Every lesson is tied to a real, running lab: the steps name the lab's own dashboards, services and labels, and lab steps are checked against values only the finished lab can give (a trace ID, a token, a number). The study features (review after 1, 2 and 4 days, readiness per exam domain, mock exams by domain weight) follow the two exams' published domains.

## Operating Context

- One step per page, with Back, Mark complete and Next. No list of steps to tick beside the step: the owner asked for that, because a visible list of tasks discourages them.
- Only the page scrolls; no part of the page has a scroll bar of its own.
- Lab steps are done on the PC with Grafana, a terminal and the lab cluster open in other windows. Reading happens on all three devices, often on a phone.
- Progress is kept on the device and synced through the site's own server, so the PC, a phone and a tablet can be open at once.
- The owner already runs a sister site, saa-plan, for their AWS exam. Its rules carry over: purpose first on every step, an article with a sidebar for looking things up, sentence-case labels.

## Capabilities and Constraints

- Static Astro build with React islands and Tailwind, served by a small Node server with SQLite. The base path is set when the container starts.
- Content is MDX steps, YAML modules and YAML question pools, checked against Zod schemas at build time. Step ids, question ids and the storage key `lgtm-learn-v1` key saved progress and never change.
- Five lab check kinds (exact, regex, range, choice, token). Mark complete waits for the check on lab and drill steps.
- Module quiz (15 questions, pass at 80%), review queue, step practice, weak-spot practice, OTCA and PCA mock exams (60 questions, 90 minutes, pass at 75%), XP, levels, badges and celebrations.
- Content security policy: `default-src 'none'`, scripts and styles from the site itself plus hashes; no inline styles in static HTML, no third-party origin, no CDN. Fonts are self-hosted.
- Figures are animated scenes built later with the stageshow skill; until a scene exists, a labelled placeholder stands in.

## Brand Commitments

- Labels in sentence case. No all-capital labels, no "A · B · C" strings, no "Word — fragment" labels.
- Lesson text is plain, complete English in short sentences, and opens with the problem the thing was made to solve.
- No third-party brand assets in the repository.

## Evidence on Hand

- Module m02 (observability fundamentals): 13 steps and 39 questions, facts checked in `../docs/verification/m02.md`. The owner read it on 2026-11-11 and rejected its form, not its facts (`../docs/plan/00-overview.md`, section 13).
- The lab is built and accepted on the owner's cluster (`../lab/`).
- There are no testimonials, users or metrics beyond the owner's own progress; none may be invented.

## Product Principles

1. A step reads as one article from top to bottom. Every part is the next part of the same explanation, not a new topic.
2. Purpose first: the problem, then the idea, then the details.
3. Learn and do are separate: reading never requires the lab, and the lab work sits in its own place with its check.
4. Nothing discourages: no wall of unticked tasks, one step at a time, progress that is never lost.
5. The page works the same on a 1440 screen, a tablet and a phone.

## Accessibility & Inclusion

Visible focus, full keyboard use, reduced motion respected (celebrations and figures keep a still state), text contrast of at least 4.5:1 in light and dark, touch targets of at least 44 px on the phone.
