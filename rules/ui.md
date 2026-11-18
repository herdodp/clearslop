<!-- clearslop-ignore-file: this file lists trigger patterns as examples -->
# UI rules (CS-UI)

These rules reject visual patterns that appear out of habit rather than product need. Each rule has an ID, a level, and a detection method. Levels: `block` (must be fixed), `warn` (fix unless there is a recorded reason), `hint` (suggestion).

Principle: these rules only reject. Visual character comes from `.clearslop/DIRECTION.md`, not from this file.

The scanner implements only some of these rules. Run `explain <RULE_ID>` to check whether a rule has a detector. Rules marked "render only" need a rendered page and are not implemented yet.

## Color and background

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-UI-001 | warn | Purple-to-blue or purple-to-pink gradient as the main background or heading text | A CSS gradient (single or multi-line) with two or more colors, at least one with hue 250-320; Tailwind `from-purple-*`/`from-violet-*`/`from-fuchsia-*` followed by `to-blue-*`/`to-pink-*`/`to-indigo-*` |
| CS-UI-002 | warn | Gradient on heading text (`bg-clip-text` + `text-transparent`) | `background-clip: text`, or the classes `bg-clip-text` and `text-transparent` together |
| CS-UI-003 | warn | Decorative glow: a saturated colored shadow with a large blur and no function | `box-shadow`/`drop-shadow` with blur >= 24px and a saturated color (hex, rgb or hsl), on one or several lines; Tailwind `shadow-<color>-*/<opacity>` |
| CS-UI-004 | hint | Blurred background blob used as decoration | `blur-3xl` or `filter: blur(>=60px)` |
| CS-UI-005 | warn | More than two saturated accent colors on one screen | Not implemented. Count unique saturated hues in tokens and color classes of one file |
| CS-UI-006 | hint | Automatic dark mode `#0f172a`/`slate-900` with no product reason | Exactly `#0f172a`, `#111827`, `bg-slate-900`, or `bg-gray-900` |

## Typography

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-UI-010 | hint | One default font family for everything (Inter/Roboto/system-ui) with no contrast between headings and body | Not implemented |
| CS-UI-011 | warn | Oversized hero heading with `tracking-tight` on every heading | Not implemented |
| CS-UI-012 | warn | Uppercase small labels everywhere (`uppercase tracking-wider` as the default style) | Four or more lines combining `uppercase` with `tracking-wide`/`tracking-wider`/`tracking-widest` |
| CS-UI-013 | warn | Faint, low-contrast text | Not implemented (render only). Contrast ratio below 4.5:1 for body text, 3:1 for large text |

## Icons, emoji, and badges

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-UI-020 | warn | Emoji used as a functional icon or feature marker in a heading, button, label, or list item | An emoji character (emoji presentation, not text symbols such as Â©, Â®, â„¢, arrows) at the start of `li`, `h1`-`h4`, `button`, or `label` content |
| CS-UI-021 | warn | "New/beta/AI-powered" pill above the hero heading | A `rounded-full` element with short text such as `new`, `beta`, `AI-powered`, `2.0` |
| CS-UI-022 | warn | Sparkle icon as a generic AI marker or logo | `<Sparkles>`, `data-lucide="sparkles"`, `sparkles-icon`, or the sparkle emoji |
| CS-UI-023 | hint | Three-column feature cards with a colored round icon above a short heading | Not implemented |

## Layout and spacing

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-UI-030 | warn | The same large radius on every element (`rounded-2xl` everywhere) | Six or more lines with `rounded-2xl`/`rounded-3xl` in one file |
| CS-UI-031 | hint | Random spacing values outside the scale (13px, 7px, 22px) | Not implemented |
| CS-UI-032 | warn | Everything centered: every section `text-center` | Four or more lines with `text-center`/`text-align: center` in one file |
| CS-UI-033 | hint | Cards nested in cards, each with shadow and border | Not implemented |
| CS-UI-034 | warn | Horizontal overflow on small screens | Render only: `scrollWidth > clientWidth` at 360 and 390 px |
| CS-UI-035 | warn | Touch targets below 44x44 px on primary controls | Render only: computed size of `button`, `a`, `input` at 390 px |

## Motion and decoration

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-UI-040 | warn | Generic entrance animation on every element (uniform fade-up) | Six or more lines with `fade-in`, `fade-up`, or `animate-fade` in one file |
| CS-UI-041 | hint | Animation that ignores `prefers-reduced-motion` | Not implemented |
| CS-UI-042 | hint | Decorative floating or pulsing elements | `animate-pulse`/`animate-bounce` on a line that is not a skeleton, loading, or spinner |
| CS-UI-043 | hint | Grid, dot, or noise background pattern used as filler | Not implemented |

## Fake content on the page

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-UI-050 | warn | Invented statistics or metrics on a marketing page ("10,000+ users", "99.9% uptime", "0.0001ms") | A large number next to `users`, `customers`, `downloads`, `uptime`, or `latency`. Real, sourced figures belong in `allow.json` with a reason |
| CS-UI-051 | block | Testimonial with an invented name, title, or avatar | Generic names such as "John Doe", "Jane Smith", "Sarah Johnson" |
| CS-UI-052 | warn | "Trusted by" logos with no real clients | Generic company names: Acme, Globex, Initech |
| CS-UI-053 | warn | Leftover placeholder text | Literal match: "lorem ipsum", "your text here", "your title here" |
| CS-UI-054 | warn | Fake terminal or code shown as decoration, with invented output | Not implemented |

## How to fix (in order)

1. Remove what has no function first: blobs, glows, badges, round icon containers.
2. Replace fake content with real content from the project, or delete the section. Never write replacement numbers.
3. Apply the colors, fonts, and accent moments from `DIRECTION.md`.
4. Tidy spacing to a fixed scale (multiples of 4 or 8) and rescan.

## Valid exceptions

Add an entry to `.clearslop/allow.json` with a reason when: a gradient is an approved part of the brand identity, an emoji is user content, or a figure comes from real connected data. The reason is mandatory.
