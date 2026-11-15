# W4: `check:content` refuses a lone backslash in a command or a query

Card W4, wave 11, 2026-11-15.

## Context

A `<Cmd>` or `<Query>` holds a JavaScript template string, ``<Cmd>{`...`}</Cmd>``. A template string reads a backslash as the start of an escape, so what the author typed is not always what the page shows. Two commands reached learners changed: module m16 step 2 had `{"\n"}` in two `kubectl ... -o jsonpath` commands, which put a real line break inside the quotes, and module m01 step 17 had `grep 'deploymentMode\|auth_enabled'`, which the page showed as `grep 'deploymentMode|auth_enabled'` and which matched nothing. Pull request 104 repaired both by hand. `check:pages` could not see either, because it compares the built page with the same evaluated string, so both sides hold the changed text.

## The language's rule

From MDN, "Template literals" (last modified 2026-11-02) and "Lexical grammar", section "Escape sequences", both fetched on 2026-11-15:

- `\n`, `\r`, `\t`, `\b`, `\f`, `\v` and `\0` become control characters. `\xHH`, `\uHHHH` and `\u{H}` become the character their code names.
- A backslash before a line break is a line continuation: the backslash and the line break both disappear.
- Before any other character the backslash is an "identity escape" and is dropped: `\z` is `z`. So `\|`, `\.`, `\'`, `\"` and `\d` reach the page without their backslash.
- `\1` to `\9`, `\0` before a digit, and a `\x` or `\u` without enough hex digits are a SyntaxError in an untagged template. The build already fails on them.
- `` \` `` gives a backtick and `\$` a dollar sign.
- `String.raw` would keep every backslash, but it is a tag, and a step writes a plain template string.

## Decision

A rule `code-escape` in `src/lib/content-rules.ts`. It reads the same template strings as `code-template` and `code-indent`: the inside of every `<Cmd>` and `<Query>` of a step. Every backslash is an error unless it starts one of these:

| In the source | On the page | Why it is allowed |
|---|---|---|
| `\\` | `\` | It is how a backslash is written. |
| `` \` `` | a backtick | Without the backslash the backtick would end the string. LogQL patterns in backticks need it (m12 step 5, m14 step 9). |
| `\${` | `${` | Without the backslash `${` would start a substitution. Grafana variables need it (m05 step 10, m14 step 6). |
| `\u003c` | `<` | The course writes the angle brackets of LogQL patterns and named groups this way (m12 step 5, m14 step 9), because a word in angle brackets inside a step is read as a tag. |

The error names the file, the line, what the page shows instead and the doubled form, for example `line 77: in this <Cmd>, \n reaches the page as a line break; write \\n`. The line is counted from the top of the file, as in every rule of `check:content`.

## The edge

**Which `\u` escapes.** Only `\u003c` (the hex digits in either case). On 2026-11-15 no step used another one. Every other `\u` escape stays an error, because a command that wants the escape itself, such as `printf '\u2713'` or a string for `jq`, would reach the page as the character: the same fault in another form. `\u{3c}` is refused too; write `\u003c`. If a step needs another character one day, add it with a test case.

**`\$` not before a brace.** Refused. The page shows `$` alone, so `echo \$HOME` loses its backslash like any other.

**Other places a step could hide the fault.** I looked through all 240 steps on 2026-11-15:

- Attributes of other components: none takes a template string or a JavaScript string. The only attribute values in braces are numbers (`<Stat amount={n} max={n}>`).
- JavaScript expressions in the text: none outside `<Cmd>` and `<Query>`.
- Fenced code blocks and inline code are Markdown, not JavaScript: a backslash there stays as written.
- In Markdown text a backslash escapes punctuation (`Last \*` in m05 steps 5 and 7, `\|` in a table of m12 step 4). That is Markdown's own escape, and these are meant.
- Lab check answers in the frontmatter are YAML, a different language with its own escapes. Three `pattern:` values hold backslashes: m14 steps 3 and 6 in single quotes, where YAML keeps them as written, and m16 step 8 in double quotes, where YAML reads `\\` as one backslash, as intended. They are regular expressions the site matches a pasted answer against, and the page never shows them.

None of these is a real case, so the rule covers `<Cmd>` and `<Query>` only.

## What it found on main

Nothing new: `npm run check:content` reports 0 errors on the 240 steps of `main`. With the two steps put back as they were before pull request 104, it reports 2 errors in m16 step 2 and 4 in m01 step 17.

## Sources

- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar
