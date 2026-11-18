<!-- clearslop-ignore-file: this file lists trigger patterns as examples -->
# Code and comment rules (CS-CD)

These rules reject code and comment patterns typical of AI output: comments that only restate the code, decoration, and needless handling. Levels: `block`, `warn`, `hint`.

Principle: a comment explains *why*, not *what*. Code that is already clear needs no comment. These rules do not change program behavior; they only clean up its shape.

The scanner implements only some of these rules. Run `explain <RULE_ID>` to check whether a rule has a detector.

## Comments

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-CD-001 | warn | Comment that repeats the line below it | A short one-line comment sharing its key words with the next line of code (for example `// increment counter` above `counter++`) |
| CS-CD-002 | warn | Decorative divider banner | A comment line with a run of 10 or more `=`, `-`, `*`, `#`, `_`, or `~`, or three or more Unicode box-drawing characters (U+2500 to U+257F) |
| CS-CD-003 | warn | Emoji in a comment or log | An emoji (emoji presentation) in a comment, `console.log`, `print`, or `logger` line |
| CS-CD-004 | hint | Section marker comment with no meaning | `// Imports`, `// Constants`, `// Helper functions`, `// Main function`, `# Variables` |
| CS-CD-005 | warn | AI trace comment | A comment containing "As an AI", "Let me", "Here is the", or "This function does the following". The detector also matches two Indonesian equivalents |
| CS-CD-006 | hint | Docstring or JSDoc that only repeats the function signature | Not implemented |
| CS-CD-007 | warn | `TODO`/`FIXME` with no description, owner, or context | A comment that ends right after `TODO` or `FIXME` |
| CS-CD-008 | hint | Commented-out code left behind | Three or more consecutive lines of commented-out code |

## Code

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-CD-020 | warn | `try/catch` or `try/except` that swallows errors | An empty `catch` block, a `catch` containing only `console.log(...)`, or an `except` block containing only `pass` or `print(...)` |
| CS-CD-021 | hint | Needless layered handling | Not implemented |
| CS-CD-022 | warn | Generic names with no meaning (`data`, `result`, `temp`, `item`, `obj`, `handleClick`, `processData`) | Not implemented |
| CS-CD-023 | warn | Wrapper function that adds nothing | Not implemented |
| CS-CD-024 | hint | Constant for a value used once, with a long comment | Not implemented |
| CS-CD-025 | warn | Silent fallback that hides an error (`|| []`, `?? {}`, `|| ""` on data that must exist) | Not implemented |
| CS-CD-026 | block | Hardcoded secret or key | Known token formats (`sk-`, `AKIA`, `ghp_`, Slack `xox*-`, Google `AIza`, private key headers) and `api_key`/`password`/`secret`/`token` assigned a literal value. Scans code files and config files (`.json`, `.yml`, `.yaml`, `.toml`, `.ini`, `.cfg`, `.conf`, `.properties`). Values that look like placeholders (`your_...`, `changeme`, `<...>`, `${...}`) are ignored |
| CS-CD-027 | hint | Leftover debug `console.log`/`print` | `console.log(` outside tooling paths. A path counts as tooling when a whole directory segment is `test`, `tests`, `__tests__`, `spec`, `cli`, `bin`, or `scripts`, or the file name contains `test`, `spec`, or `cli` as a separate word. Files starting with a shebang are skipped |
| CS-CD-028 | warn | Function that is too long for no reason | Not implemented |

## README, commits, and pull requests

These are guidance for authors and reviewers. The scanner does not check them.

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-CD-040 | warn | Generic commit message | Not implemented. `update`, `fix`, `changes`, `wip`, `misc` as the whole message |
| CS-CD-041 | hint | Over-decorated commit message | Not implemented. Emoji in the message, or a first line over 72 characters |
| CS-CD-042 | warn | PR description with empty template sections | Not implemented. `## Summary` or `## Changes` that only repeat the PR title |
| CS-CD-043 | warn | README with template sections that say nothing | Not implemented. Generic `## Features`, `## Installation`, `## Contributing` content that does not fit the project |

## How to fix

1. Delete comments that only repeat the code. Keep comments that explain a reason, a limit, or a trap.
2. Replace generic names with names that state the content and role.
3. Treat an empty `catch` as a behavior finding: handle the error properly or let it propagate. Do not just delete the comment inside it.
4. A `CS-CD-026` finding must be fixed by moving the value to an environment variable and revoking any key that was already exposed.
5. Rescan with `scan --only code` and make sure the existing tests still pass.

## Valid exceptions

Record an entry in `.clearslop/allow.json` with a reason when: a comment is required by a tool (for example `// eslint-disable`, `# noqa`, `@ts-expect-error`), the code is generated, or the file is an example or test for slop itself.
