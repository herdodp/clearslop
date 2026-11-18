<div align="center">

# clearslop

**A deterministic AI-slop scanner for UI, copy (English and Indonesian), and code.**

Not just instructions for a model. Findings, scores, and exit codes come from a scanner, so results can be verified in pre-commit hooks and CI.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.0-informational.svg)](https://github.com/herdodp/clearslop/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](scanner/clearslop.js)

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
| Ratchet | `ratchet` fails (exit 1) when the score drops, `block` findings increase, or any new `block` or `warn` finding appears that is not in the baseline. |
| Indonesian-language rules | Indonesian copy patterns have their own rule group (`CS-ID-*`). |
| Project direction | `DIRECTION.md` is drafted from the project's own content, then waits for your approval. |
| Recorded exceptions | False positives go into `allow.json` with a mandatory reason, or use `clearslop-ignore: <reason>`. |

## Quick start

Requirement: Node.js 18 or newer.

```bash
# create the .clearslop folder and a sample hook
node scanner/clearslop.js init

# scan the project
node scanner/clearslop.js scan .

# scan only some rule groups
node scanner/clearslop.js scan src --only ui,en

# save a baseline, then keep the score from dropping
node scanner/clearslop.js baseline .
node scanner/clearslop.js ratchet .
```

Example output:

```text
clearslop 0.2.0: score 76/100  (1 files scanned)
block: 0  warn: 4  hint: 0
  [warn] CS-UI-020 index.html:1  Emoji used as a functional icon
  [warn] CS-UI-022 index.html:1  Sparkle icon as an AI marker
  [warn] CS-UI-020 index.html:3  Emoji used as a functional icon
  [warn] CS-EN-014 index.html:5  Unsourced numeric claim
```

### Commands

| Command | Purpose |
|---|---|
| `init` | Creates `.clearslop/allow.json` and `pre-commit.sample` |
| `scan [path] [--json] [--only ui,en,id,code]` | Scans and prints findings and the score |
| `baseline [path] [--only ...]` | Saves the score and the current findings to `.clearslop/baseline.json` |
| `ratchet [path] [--only ...]` | Compares against the baseline and fails if worse |
| `explain <RULE_ID>` | Prints a rule summary and its guide file |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | No `block` findings (scan), or no regression (ratchet) |
| `1` | `block` findings exist (scan), or the ratchet found a regression |
| `2` | Usage error, including a baseline saved for a different target or `--only` set |

## How the ratchet works

`baseline` stores the target, the `--only` groups, the score, and a fingerprint of every finding. `ratchet` refuses to compare scans of a different target or with different options. A run fails when:

- the score is lower than the baseline score;
- the number of `block` findings is higher than in the baseline;
- a `block` or `warn` finding appears whose fingerprint is not in the baseline. Fixing one finding and adding another therefore still fails.

Fingerprints use the rule, the file, and the text of the line, not the line number, so moving code around does not create false regressions.

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

Full agent instructions live in [`SKILL.md`](SKILL.md).

## Severity levels

| Level | Score weight | Meaning |
|---|---|---|
| `block` | 5 | Must be fixed. Reserved for patterns that are almost never legitimate |
| `warn` | 2 | Fix unless there is a recorded reason |
| `hint` | 0.5 | Suggestion |

Only two rules are `block`: invented testimonial names (`CS-UI-051`) and hardcoded secrets (`CS-CD-026`). Heuristics that can legitimately match real content, such as statistics, emoji, and bare TODO comments, are `warn`.

## Rules

The scanner has 63 detectors in four groups, and each rule document also lists ideas that have no detector yet. Those are marked "Not implemented".

| Group | File | Coverage |
|---|---|---|
| `CS-UI-*` | [`rules/ui.md`](rules/ui.md) | Color, typography, icons, layout, motion, fake content |
| `CS-EN-*` | [`rules/copy-en.md`](rules/copy-en.md) | English copy: hype, cliches, sentence structure |
| `CS-ID-*` | [`rules/copy-id.md`](rules/copy-id.md) | Indonesian copy: stiff translation, filler words, literal idioms |
| `CS-CD-*` | [`rules/code.md`](rules/code.md) | Comments, error handling, hardcoded secrets |

Phrase rules match whole words, case-insensitively. Multi-line gradients and glows are detected. Secrets are scanned in code files and in config files (`.json`, `.yml`, `.toml`, and similar). Files over 1 MB are skipped and reported in the output.

The trigger phrases of `CS-ID-*` are Indonesian because they are the text being detected. All documentation is in English.

## Exceptions

Do not game false positives. Record them with a reason.

```json
{
  "allow": [
    { "rule": "CS-UI-001", "path": "src/brand", "reason": "Gradient is an approved brand identity" }
  ]
}
```

A `path` matches that file or everything inside that directory. `src/brand` does not match `src/brandX`.

Per line, on the same line or on a comment-only line directly above:

```js
// clearslop-ignore: quote from third-party documentation
```

Per file, in the first 300 characters. A reason is required; a bare marker is ignored:

```html
<!-- clearslop-ignore-file: this file contains example slop patterns -->
```

## CI and pre-commit integration

Pre-commit (`.git/hooks/pre-commit`):

```sh
#!/bin/sh
node scanner/clearslop.js ratchet . || exit 1
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

Note: `ratchet` needs a committed `.clearslop/baseline.json`, and it must be created with the same path and `--only` options you use in CI.

## Installing as an agent skill

Copy this repo into your agent's skill folder, for example `.snapgent/skills/clearslop/`. `SKILL.md` is already named for skill loaders. If your install location differs, adjust the scanner paths inside it.

## Development

```bash
npm test
```

Tests use the built-in `node:test` runner and need no dependencies. The repository also runs the tests on Node 18, 20, and 22 and scans itself in CI.

## Repository layout

```text
clearslop/
  SKILL.md              skill instructions for the agent
  scanner/
    clearslop.js        engine, CLI, score, baseline, ratchet
    rules.js            rule definitions
  rules/
    ui.md               UI rules
    copy-en.md          English copy rules
    copy-id.md          Indonesian copy rules
    code.md             code and comment rules
  test/
    clearslop.test.js   tests
  .github/workflows/ci.yml
  package.json
  README.md
  LICENSE
```

## Status and limitations

Version 0.2.0, early stage.

- Detectors cover only part of the ideas in `rules/`.
- Rules that need render context (color contrast, overflow, tap targets) are not implemented.
- There is no render verification with Playwright yet.
- Detection is text-pattern based, so false positives can occur. Use recorded exceptions.
- Detection is mostly per line. Patterns that span lines are handled only where noted (gradients, glows, empty catch blocks).
- The score scale grows with the number of files scanned, so adding many clean files raises the score. The ratchet's per-finding check covers this.

## Contributing

New slop patterns, false-positive reports, and detector fixes are welcome through issues or pull requests. Include a sample of the text or code that triggers the finding, and add a test.

## License

[MIT](LICENSE). Rules and code were written from scratch and not copied from other projects.
