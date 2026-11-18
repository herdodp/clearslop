<div align="center">

# clearslop

**A deterministic AI-slop scanner for UI, copy (English and Indonesian), and code.**

Not just instructions for a model. Findings, scores, and exit codes come from a scanner, so results can be verified in pre-commit hooks and CI.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-informational.svg)](https://github.com/herdodp/clearslop/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D16-339933.svg)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](scanner/clearslop.js)

[What makes it different](#what-makes-it-different) | [Quick start](#quick-start) | [Workflow](#workflow) | [Rules](#rules) | [CI](#ci-and-pre-commit-integration) | [Status](#status-and-limitations)

</div>

---

## What is slop

Slop is a pattern that shows up out of AI-output habit, not product need: purple gradients, decorative glows, emoji used as icons, invented statistics, "in today's digital era" openers, comments that only restate the code.

clearslop rejects these patterns in a measurable way. Product character still comes from you, through `.clearslop/DIRECTION.md`, not from this tool.

## What makes it different

| Capability | How it works |
|---|---|
| Deterministic scanner | Zero-dependency Node CLI. A model may not claim "pass" without scanner output. |
| Slop Score 0-100 | Higher is cleaner. Stored as a baseline. |
| Ratchet | `ratchet` fails (exit 1) when the score gets worse or `block` findings increase. |
| Indonesian-language rules | Indonesian slop patterns have their own rule group (`CS-ID-*`). |
| Automatic project direction | `DIRECTION.md` is drafted from the project's own content, then waits for your approval. |
| Recorded exceptions | False positives go into `allow.json` with a mandatory reason, or use `clearslop-ignore: <reason>`. |

## Quick start

Requirement: Node.js 16 or newer.

```bash
# create the .clearslop folder and a sample hook
node scanner/clearslop.js init

# scan the project
node scanner/clearslop.js scan .

# scan only some rule groups
node scanner/clearslop.js scan src --only ui,id

# save a baseline, then keep the score from dropping
node scanner/clearslop.js baseline .
node scanner/clearslop.js ratchet .
```

Example output:

```text
clearslop 0.1.0: skor 74/100  (1 berkas dipindai)
block: 1  warn: 2  hint: 0
  [block] CS-UI-020 index.html:1  Emoji sebagai ikon fungsional
  [warn] CS-UI-022 index.html:1  Ikon sparkle sebagai penanda AI
```

Scanner output is currently in Indonesian.

### Commands

| Command | Purpose |
|---|---|
| `init` | Creates `.clearslop/allow.json` and `pre-commit.sample` |
| `scan [path] [--json] [--only ui,en,id,code]` | Scans and prints findings and the score |
| `baseline [path]` | Saves the current score to `.clearslop/baseline.json` |
| `ratchet [path]` | Compares against the baseline and fails if worse |
| `explain <RULE_ID>` | Prints a rule summary and its guide file |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | No `block` findings, or the score did not get worse (ratchet) |
| `1` | `block` findings exist, or the score got worse (ratchet) |
| `2` | Usage error |

## Workflow

```text
Detect  ->  Direct  ->  Enforce  ->  Remember
 scan      DIRECTION    fix one      baseline
                        file at a    + ratchet
                        time
```

1. **Detect.** Run `scan`, show the score and top findings. Nothing is edited yet.
2. **Direct.** Draft `.clearslop/DIRECTION.md` from the project's content and ask for your approval.
3. **Enforce.** Fix `block` first, then `warn`, then `hint`, one file per round, and rescan.
4. **Remember.** Save a baseline, then run `ratchet` on later work.

Full agent instructions live in [`clearslop.md`](clearslop.md).

## Severity levels

| Level | Score weight | Meaning |
|---|---|---|
| `block` | 5 | Must be fixed |
| `warn` | 2 | Fix unless there is a recorded reason |
| `hint` | 0.5 | Suggestion |

## Rules

More than 100 rules are documented in four groups. Each rule has an ID, a level, and a detection method.

| Group | File | Coverage |
|---|---|---|
| `CS-UI-*` | [`rules/ui.md`](rules/ui.md) | Color, typography, icons, layout, motion, fake content |
| `CS-EN-*` | [`rules/copy-en.md`](rules/copy-en.md) | English copy: hype, cliches, sentence structure |
| `CS-ID-*` | [`rules/copy-id.md`](rules/copy-id.md) | Indonesian copy: stiff translation, filler words, literal idioms |
| `CS-CD-*` | [`rules/code.md`](rules/code.md) | Comments, error handling, hardcoded secrets, commits, README |

The rule documents are currently written in Indonesian. The scanner implements only part of these rules; run `explain <RULE_ID>` to check whether a rule has a detector.

## Exceptions

Do not game false positives. Record them with a reason.

```json
{
  "allow": [
    { "rule": "CS-UI-001", "path": "src/brand/", "reason": "Gradient is an approved brand identity" }
  ]
}
```

Per line:

```js
// clearslop-ignore: quote from third-party documentation
```

Per file (read from the first 300 characters):

```html
<!-- clearslop-ignore-file: this file contains example slop patterns -->
```

## CI and pre-commit integration

Pre-commit (`.git/hooks/pre-commit`):

```sh
#!/bin/sh
node scanner/clearslop.js ratchet || exit 1
```

GitHub Actions:

```yaml
name: clearslop
on: [pull_request]
jobs:
  ratchet:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node scanner/clearslop.js ratchet .
```

Note: `ratchet` needs a committed `.clearslop/baseline.json`.

## Installing as an agent skill

Copy this repo into your agent's skill folder, for example `.snapgent/skills/clearslop/`. Skill loaders usually look for a file named `SKILL.md`, so rename it when installing:

```bash
cp clearslop.md SKILL.md
```

Then adjust the scanner command paths inside it if your install location differs.

## Repository layout

```text
clearslop/
  clearslop.md          skill instructions for the agent
  scanner/
    clearslop.js        scanner, score, baseline, ratchet
  rules/
    ui.md               UI rules
    copy-en.md          English copy rules
    copy-id.md          Indonesian copy rules
    code.md             code and comment rules
  README.md
  LICENSE
```

## Status and limitations

Version 0.1.0, early stage.

- Detectors cover only part of the rules in `rules/`.
- Rules that need render context (color contrast, overflow, tap targets) are not implemented.
- There is no render verification with Playwright yet.
- Detection is based on text patterns, so false positives can occur. Use recorded exceptions.

## Contributing

New slop patterns, false-positive reports, and detector fixes are welcome through issues or pull requests. Include a sample of the text or code that triggers the finding.

## License

[MIT](LICENSE). Rules and code were written from scratch and not copied from other projects.
