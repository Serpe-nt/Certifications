# W4: the content check refuses a lone backslash in a command

Wave 11. Model Opus 5.5, high effort. Skills: `caveman`, `humanizer`, `ponytail`, as every worker.

Twice a command reached a lesson page changed, and no check saw it. A `<Cmd>` or `<Query>` holds a JavaScript template string, and a template string reads a single backslash as an escape: `\n` becomes a real line break, `\t` a tab, and before any other character the backslash is dropped. Module m16 step 2 had two `kubectl ... -o jsonpath='...{"\n"}'` commands that failed as copied, and module m01 step 17 a `grep 'a\|b'` that matched nothing on the page. Both are repaired (pull request 104). `check:pages` cannot find this fault, because it compares the page with the same evaluated string. This card makes `check:content` refuse it.

## Owns

`lgtm/learn/src/lib/content-rules.ts`, `lgtm/learn/scripts/check-content.ts` only if the rule needs it, `lgtm/learn/tests/unit/**` and fixtures under `lgtm/learn/tests/fixtures/**` for the rule, `lgtm/learn/README.md` where it lists the rules, and `lgtm/docs/adr/w4-*.md`. A lesson step only if the new rule finds a real fault in it: then that step and its module's verification log. Not the plan, not the lab, no other part of the site.

## Read first

- `lgtm/docs/plan/03-content-contract.md`, "Six things the first modules ran into", the last one.
- `lgtm/learn/src/lib/content-rules.ts`: the rules `code-template` and `code-indent` that card W3 added (pull request 86), and their tests in `tests/unit/content-rules.test.ts`. `scripts/check-pages.ts`, to see why it cannot find this fault.
- The language's own rule for escapes in a template literal (MDN, "Template literals" and "Lexical grammar", escape sequences), fetched on the day: which escapes change the text, which are an error, and what `String.raw` would do.

## What is known

The planner's scan of every step on 2026-11-15, after the two repairs, found three template strings with a single backslash, all wanted: module m12 step 5 (two queries) and module m14 step 9 (one query) write `<` for an angle bracket and escape a backtick. Check this yourself with your rule.

## What to build

1. **A rule `code-escape` in `check:content`.** For every `<Cmd>` and `<Query>` template string of a step, report an error with file and line when the string holds a backslash that changes what the page shows. Allowed: a doubled backslash, an escaped backtick, `\$` before a brace, and a `\u` escape. Everything else is refused: `\n`, `\t`, `\r`, a backslash before a quote, a letter, a digit, a dot, a pipe or the end of a line. The message says what the page would show and how to write it (`\\n`, `\\|`), in one line a content worker understands.
2. **Decide the edge.** Say in an ADR whether every `\u` escape stays allowed or only the ones the course uses, and whether the same fault can happen anywhere else a step holds a template string (an attribute of another component, a check's answer). Do not build beyond `<Cmd>` and `<Query>` without a real case; list what you found.
3. **Tests.** Unit tests for each allowed and each refused form, with the two real faults as cases (the jsonpath of m16 step 2 and the grep of m01 step 17, as they were before pull request 104) and the three wanted lines of m12 and m14.
4. **The course passes.** `npm run check:content` reports 0 errors on the content of `main`. If the rule finds a fault the planner's scan missed, it is a real one: repair it in its step, build, run the command from the built page if it only reads (ask the owner first for anything that changes the lab), and add a row to that module's log.
5. **The site's README** names the rule beside the other two. The contract is the planner's file: give the sentence to add in the pull request.

## Limits

- Nothing on the lab. No new dependency.
- `npm test` uses ports 8095 and 8096; no other card runs the site's tests in this wave. If you look at the built site, use port 8109.
- No sub-agents, except one read-only agent to check the rule against the language's escape rules.

## Done when

- [ ] `check:content` refuses a lone backslash in a `<Cmd>` or `<Query>` template string and accepts the wanted forms; the unit tests show each.
- [ ] `npm test`, `npm run check:content`, `npm run build` (it ends with `check:pages`) and `npm run check:links` pass.
- [ ] The pull request lists what the rule found on `main` (expected: nothing new), the allowed escapes with the reason for each, and where else a template string could hide the same fault.
- [ ] An ADR `w4-*.md` records the rule and its edge.

## Report

The pull request link; the rule in two sentences; what it found on `main`; the sentence for the content contract.
