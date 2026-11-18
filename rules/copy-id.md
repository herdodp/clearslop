<!-- clearslop-ignore-file: this file lists trigger phrases as examples -->
# Indonesian copy rules (CS-ID)

These rules detect generic AI-style writing in Indonesian: stiff translation from English, hype, and sentences that could be pasted onto any product. Levels: `block`, `warn`, `hint`.

The trigger phrases below are Indonesian on purpose, because they are the text the scanner looks for. Each table gives an English gloss of the pattern. All explanations are in English.

Principle: good Indonesian copy sounds like it was written in Indonesian, not translated. If a sentence says nothing specific and true about the product, delete it.

The scanner implements only some of these rules. Run `explain <RULE_ID>` to check whether a rule has a detector. Phrases match case-insensitively on whole words.

## Generic openers and closers

| ID | Level | Pattern | Trigger examples |
|---|---|---|---|
| CS-ID-001 | warn | Generic era opener ("in this digital era") | "di era digital", "di era modern", "dalam dunia yang serba cepat", "di tengah perkembangan teknologi" |
| CS-ID-002 | warn | Empty summary closer | "kesimpulannya,", "sebagai kesimpulan,", "secara keseluruhan," |
| CS-ID-003 | warn | Cliche call to action ("take your business to the next level") | "ke level berikutnya", "mulai perjalanan anda", "wujudkan impian anda" |
| CS-ID-004 | hint | Pleasantry opener in a reply ("great question", "happy to help") | "pertanyaan yang bagus", "dengan senang hati saya akan membantu", "tentu saja!" |
| CS-ID-005 | warn | Generic exploration invitation ("let's explore", "let's dive in") | "mari kita eksplorasi", "mari kita selami", "mari kita bahas lebih dalam", "kita kupas tuntas" |

## Hype vocabulary and filler

| ID | Level | Pattern | Trigger examples |
|---|---|---|---|
| CS-ID-010 | warn | Superlative without evidence ("revolutionary", "world class", "cutting edge") | "revolusioner", "terdepan", "terbaik di kelasnya", "kelas dunia", "mutakhir" |
| CS-ID-011 | warn | Inflated verb ("empower", "optimize", "maximize", "accelerate") | "memberdayakan", "mengoptimalkan", "memaksimalkan", "merevolusi", "menghadirkan solusi", "mengakselerasi" |
| CS-ID-012 | warn | Universal claim ("for all your needs", "one-stop solution") | "untuk semua kebutuhan anda", "solusi satu pintu", "segala yang anda butuhkan", "cocok untuk siapa saja" |
| CS-ID-013 | warn | Unsourced numeric claim ("10x faster", "99% accuracy") | "10x lebih cepat", "akurasi 99%", "hemat waktu berjam-jam" with no data or link. A sourced figure belongs in `allow.json` with a reason |
| CS-ID-014 | hint | Filler phrase that delays the content ("it should be noted that") | "perlu diketahui bahwa", "penting untuk dicatat bahwa", "tak dapat dipungkiri", "tidak bisa dipungkiri" |
| CS-ID-015 | hint | Favorite AI words in Indonesian ("holistic", "synergy", "new paradigm") | "holistik", "sinergi", "paradigma baru", "transformasi digital", "komprehensif" |

## Stiff translation and sentence structure

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-ID-020 | warn | Repeated "not only X but also Y" contrast | "bukan hanya" or "tidak hanya" on three or more lines in one file |
| CS-ID-021 | warn | Forced triplet ("fast, easy, and reliable") | Not implemented |
| CS-ID-022 | warn | Chained passive constructions ("dapat dilakukan", "dapat digunakan") | Not implemented |
| CS-ID-023 | warn | Literal translation of an English idiom | "di akhir hari" (end of the day), "langkah mundur" (step back), "bola ada di tangan" (the ball is in your court), "mengubah permainan" (game changer), "di luar kotak" (outside the box) |
| CS-ID-024 | hint | Chained transition words at sentence starts | "selain itu,", "lebih lanjut,", "di samping itu,", "oleh karena itu," on four or more lines |
| CS-ID-025 | hint | Self-explaining sentence after every point ("in other words", "in short") | "artinya,", "dengan kata lain,", "singkatnya," on three or more lines |
| CS-ID-026 | hint | Rhetorical question opening a section | Not implemented |
| CS-ID-027 | warn | Excess formal "Anda" in copy aimed at a casual audience | Not implemented |

## Headings, buttons, and microcopy

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-ID-030 | warn | All-caps heading with an exclamation mark | Not implemented. The English rule `CS-EN-030` already matches all-caps headings and buttons |
| CS-ID-031 | warn | Generic CTA button ("Start now", "Learn more", "Click here", "Send") | "mulai sekarang", "pelajari lebih lanjut", "klik di sini", "kirim" as a button label |
| CS-ID-032 | warn | Emoji as a list bullet or heading prefix | Not implemented. The English rule `CS-EN-032` already matches this in any language |
| CS-ID-033 | hint | Artificially friendly error message ("Oops!") | "ups!", "waduh!", "aduh!" |
| CS-ID-034 | hint | Generic placeholder ("Enter your text here", "Heading here") | "masukkan teks anda di sini", "ketik sesuatu...", "judul di sini" |
| CS-ID-035 | hint | Error message with no cause or next step ("An error occurred.") | "terjadi kesalahan." |

## Mixed language and spelling

| ID | Level | Pattern | Detection |
|---|---|---|---|
| CS-ID-040 | hint | Needless English terms inside Indonesian sentences | Not implemented. Examples: "leverage", "seamless", "scalable", "powerful", "user-friendly" |
| CS-ID-041 | hint | English-style Title Case on Indonesian headings | Not implemented |
| CS-ID-042 | hint | Inconsistent forms of address | Not implemented. Mixing "Anda", "kamu", "kalian" in one document |

## How to fix

1. Delete sentences that carry no specific fact.
2. Replace claims with facts that can be verified from the project (real features, figures from data, real names). If there are none, delete the claim.
3. Use active verbs and a clear subject. Example: replace "Fitur ini dapat digunakan untuk membuat laporan" ("This feature can be used to create reports") with "Buat laporan dari satu tabel." ("Build reports from a single table.")
4. Keep the form of address and tone consistent with `DIRECTION.md`.
5. Rescan with `scan --only id`.

## Valid exceptions

Record an entry in `.clearslop/allow.json` with a reason when: the phrase is quoted from another source, the phrase is a product or brand name, or the text is an example in documentation about slop itself.
