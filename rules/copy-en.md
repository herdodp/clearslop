<!-- clearslop-ignore-file: this file lists trigger phrases as examples -->
# English copy rules (CS-EN)

These rules reject writing that sounds like generic AI output: empty claims, hype, and sentence frames that could be pasted onto any product. Levels: `block`, `warn`, `hint`.

Principle: every sentence must say something specific and true about the product. If it does not, delete the sentence.

The scanner implements only some of these rules. Run `explain <RULE_ID>` to check whether a rule has a detector. Phrases match case-insensitively on whole words; a trailing `*` in the table below means any word ending is accepted (for example `leverag*` matches leverage, leveraged, leveraging).

## Generic openers and closers

| ID | Level | Pattern | Trigger examples |
|---|---|---|---|
| CS-EN-001 | warn | Generic era or world opener | "fast-paced digital", "ever-evolving", "an era where" |
| CS-EN-002 | warn | Empty summary closer | "In conclusion,", "In summary," |
| CS-EN-003 | warn | Cliche call to action | "to the next level", "unlock the power", "start your journey" |
| CS-EN-004 | hint | Pleasantry opener in a reply or document | "Certainly!", "Great question!", "be happy to help", "Absolutely!" |

## Hype vocabulary

| ID | Level | Pattern | Trigger examples |
|---|---|---|---|
| CS-EN-010 | warn | Superlative without evidence | "revolutionar*", "game-changing", "cutting-edge", "next-generation", "world-class", "best-in-class" |
| CS-EN-011 | warn | Inflated verb | "leverag*", "harness the", "unleash*", "supercharg*", "elevate your", "empower*", "streamlin*", "seamless*" |
| CS-EN-012 | hint | Favorite AI word that people rarely use | "delv*", "tapestry", "testament to", "realm of", "multifaceted", "navigate the complexities" |
| CS-EN-013 | warn | Universal claim | "for everyone", "all your needs", "everything you need", "one-stop" |
| CS-EN-014 | warn | Unsourced numeric claim | "10x faster", "99% accuracy", "save hours" with no data or link. A sourced figure belongs in `allow.json` with a reason |

## Sentence structure

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-EN-020 | warn | Repeated "not just X, but Y" contrast | "not just" or "not only" on three or more lines in one file |
| CS-EN-021 | warn | Forced triplet | Not implemented. Rhythmic lists of three adjectives or nouns ("fast, simple, and powerful") more than twice per document |
| CS-EN-022 | hint | Rhetorical question opening a section | Not implemented |
| CS-EN-023 | hint | Em dash overuse | Not implemented |
| CS-EN-024 | hint | Chained transition words at sentence starts | "Moreover,", "Furthermore,", "Additionally," on four or more lines |
| CS-EN-025 | warn | Self-explaining sentence after every point | "Simply put,", "This means that", "In other words," on three or more lines |

## Headings, buttons, and microcopy

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-EN-030 | warn | All-caps heading or button with an exclamation mark | `h1`-`h3` or button text that is all caps and ends with "!" |
| CS-EN-031 | warn | Generic CTA button | "Get Started", "Learn More", "Click Here", "Submit" as a button label |
| CS-EN-032 | warn | Emoji as a list bullet or heading prefix | An emoji at the start of a list line or heading |
| CS-EN-033 | hint | Artificially friendly error or status message | "Oops!", "Uh-oh!", "Whoops!" |
| CS-EN-034 | hint | Generic descriptive placeholder text | "Enter your text here", "Type something..." |

## Markdown and documents

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-EN-040 | hint | A heading on every short paragraph | Not implemented |
| CS-EN-041 | hint | Excess bold text | Not implemented |
| CS-EN-042 | hint | Bullets that all start with a uniform bold label | Not implemented |
| CS-EN-043 | warn | README section made of badges and emoji with no content | Not implemented |

## How to fix

1. Delete sentences that carry no specific fact.
2. Replace claims with facts that can be verified from the project (real features, figures from data, real names). If there are none, delete the claim.
3. Write with concrete verbs and a clear subject, matching the tone in `DIRECTION.md`.
4. Rescan with `scan --only en`.

## Valid exceptions

Record an entry in `.clearslop/allow.json` with a reason when: the phrase is quoted from another source, the phrase is a product or brand name, or the text is an example in documentation about slop itself.
