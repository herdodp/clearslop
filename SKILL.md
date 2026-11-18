---
name: clearslop
description: Use when the user asks to clear, audit, or prevent AI slop (generic UI, filler copy in English or Indonesian, AI-shaped code and comments) or mentions clearslop, slop score, or slop baseline. Runs a deterministic scanner, builds a project direction, fixes findings, and ratchets the score.
---

# clearslop

clearslop removes AI "slop" from UI, copy (English and Indonesian), and code. Unlike instruction-only filters, **the check is done by a deterministic scanner, not by model judgment**. The model must not claim a pass without scanner output.

Workflow: **Detect -> Direct -> Enforce -> Remember**.

## Skill files

- `scanner/clearslop.js`: zero-dependency Node CLI. Source of truth for findings and score.
- `scanner/rules.js`: rule definitions used by the scanner.
- `rules/ui.md`: UI and visual rules (`CS-UI-*`).
- `rules/copy-en.md`: English copy rules (`CS-EN-*`).
- `rules/copy-id.md`: Indonesian copy rules (`CS-ID-*`).
- `rules/code.md`: code and comment rules (`CS-CD-*`).

Read only the rule files relevant to the task. Do not load all of them at once.

## Scanner commands

Run from the workspace root. The paths below assume the skill is installed at `.snapgent/skills/clearslop/`; adjust them if it lives elsewhere.

```
node .snapgent/skills/clearslop/scanner/clearslop.js init
node .snapgent/skills/clearslop/scanner/clearslop.js scan [path] [--json] [--only ui,en,id,code]
node .snapgent/skills/clearslop/scanner/clearslop.js baseline [path] [--only ...]
node .snapgent/skills/clearslop/scanner/clearslop.js ratchet [path] [--only ...]
node .snapgent/skills/clearslop/scanner/clearslop.js explain <RULE_ID>
```

Exit codes: `0` clean, or the score did not get worse (ratchet); `1` `block` findings exist, or the ratchet found a regression; `2` usage error, including a baseline saved for a different target or `--only` set.

## Phase 1: Detect

1. Run `scan` on the requested path (default: workspace root).
2. Show the user the Slop Score (0-100, higher is cleaner), the number of findings per level, the top 10 findings with `file:line`, and any skipped files the scanner reports.
3. Do not edit anything in this phase.

## Phase 2: Direct

The scanner can only reject patterns. It cannot create character. So:

1. If `.clearslop/DIRECTION.md` does not exist, draft it from material already in the project: `package.json`, README, the product name, published copy, and existing design tokens. Do not ask for anything that can be read from a file.
2. Keep it to 40 lines at most: who the users are, the tone of voice (one sentence), one or two moments that may use an accent color, one distinctive product detail, and a list of project-specific banned words.
3. Show it to the user and ask for approval before using it. An unapproved direction must not be used to justify changes.

## Phase 3: Enforce

1. Fix findings in order: `block`, then `warn`, then `hint`. One file per round, and rescan that file after editing.
2. Every fix must follow `DIRECTION.md`. Removing slop without a replacement that fits the direction only produces bland output. If there is no honest replacement, delete the line.
3. Never invent numbers, testimonials, or claims as replacements. Replace slop with something true, not with other slop.
4. If a finding is a false positive, do not work around it. Add it to `.clearslop/allow.json` with a short reason and tell the user.
5. If a fix introduces new findings, revert it and try another approach.

## Phase 4: Remember

1. When all `block` findings are fixed, run `baseline` to save the score and the set of current findings to `.clearslop/baseline.json`.
2. On later work, run `ratchet`. It fails when the score drops, when `block` findings increase, or when any new `block` or `warn` finding appears that is not in the baseline. Treat a failure as unfinished work and fix it before reporting.
3. Install the hook only if the user agrees: `init` writes a sample pre-commit hook that calls `ratchet`.

## Exceptions

- Per line: `clearslop-ignore: <reason>` on the same line, or on a comment-only line directly above.
- Per file: `clearslop-ignore-file: <reason>` in the first 300 characters. A reason is required; a bare marker is ignored.
- Per rule and path: an entry in `.clearslop/allow.json` with a mandatory `reason`. A `path` matches a file or a whole directory, not a name prefix.

## Hard rules

- No "clean" or "pass" claim without `scan` or `ratchet` output produced on the latest state of the files.
- Do not change scanner rules or `allow.json` just to raise the score.
- Do not touch files outside the requested path. Large or bulk changes need confirmation.
- Rules and scores are quality guidance, not a replacement for human judgment on design decisions.

## Final report

Short and based on scanner output:

```
clearslop: score <before> -> <after>  (baseline <n>)
block: <n>  warn: <n>  hint: <n>
Files changed: <list>
Exceptions added: <list or none>
Ratchet exit: <0|1>
```
