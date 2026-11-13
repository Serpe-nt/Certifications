# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner, studying alone for the AWS Certified Solutions Architect – Associate exam (SAA-C03), starting with no AWS experience. They study at a desktop with two monitors (this app full screen on one, Skill Builder on the other, both in Edge), and also open the app on a phone and a tablet, several devices at once.

## Product Purpose

A personal 22-day study tracker that turns two AWS Skill Builder learning plans into one step at a time: the day to work on and its next step first, a single card per step with its key points, a 30-question day quiz passed at 80%, reviews, drills, a mock exam, and a celebration for everything finished. Success is complete knowledge before the exam, lectures first and then the labs of the same training.

## Positioning

Built for one learner's routine, not a course platform: the plan is data, progress syncs across the owner's devices, every explanation opens with the problem a service solves, and every finished thing is celebrated on a rising ladder.

## Operating Context

Self-hosted (Go server with SQLite in Docker, behind the owner's Gate at /h1/), vanilla HTML/CSS/JS with no build step, used daily next to Skill Builder; touch screens too. Real money is at stake in the owner's AWS account, so cleanup and cost reminders matter.

## Capabilities and Constraints

Details live in `CLAUDE.md` and `docs/architecture.md`. Constraints that bind design work: one step per screen (no visible task list), only the page scrolls, nothing folded by default on a card, no frameworks or CDN scripts (Google Fonts only), all colours as tokens, no emoji in the UI, every celebration kept (the ladder only grows), effects/sound toggles and reduced motion respected, everything works by touch and at phone width.

## Brand Commitments

- Design system: the owner's Datum design system (claude.ai artifact "Datum"), vendored in `site/dm/`.
- Colours: the "Excimer" palette taken from the owner's reference poster (near-black, charcoal plates, one cadmium yellow), dark only (owner's choice, 2026-11-13).
- Motion: poster-grade (owner's choice over Datum's stricter budget), with every existing effect kept and retouched.

## Evidence on Hand

The plan, key points, questions, diagrams and look-alike tables in `site/`. No testimonials, users or metrics beyond the owner.

## Product Principles

- Today first: the next step is always the first thing on screen.
- One thing at a time: one card, one step, Back / Mark complete / Next.
- Purpose first: every explanation opens with the problem.
- Earned things are celebrated, bigger as they get bigger.
- Nothing may assume one device.
