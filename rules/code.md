<!-- clearslop-ignore-file: berkas ini memuat pola pemicu sebagai contoh -->
# Aturan Kode dan Komentar (CS-CD)

Aturan ini menolak pola kode dan komentar yang khas keluaran AI: komentar yang hanya mengulang kode, hiasan, dan penanganan yang tidak perlu. Tingkat: `block`, `warn`, `hint`.

Prinsip: komentar menjelaskan *mengapa*, bukan *apa*. Kode yang sudah jelas tidak perlu komentar. Aturan ini tidak mengubah perilaku program, hanya membersihkan bentuknya.

## Komentar

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-CD-001 | warn | Komentar yang mengulang baris di bawahnya | Komentar satu baris yang berisi kata kerja dan nama yang sama dengan baris kode berikutnya (mis. `// increment counter` di atas `counter++`) |
| CS-CD-002 | warn | Spanduk pemisah dekoratif | Baris komentar berisi deretan `=`, `-`, `*`, `#` lebih dari 10 karakter, atau karakter garis/kotak Unicode (blok U+2500 sampai U+257F) |
| CS-CD-003 | warn | Emoji di dalam komentar atau log | Karakter emoji pada komentar, `console.log`, `print`, atau `logger` |
| CS-CD-004 | hint | Komentar penanda bagian yang kosong makna | `// Imports`, `// Constants`, `// Helper functions`, `// Main function`, `# Variables` |
| CS-CD-005 | warn | Komentar jejak AI | `Here's the`, `As an AI`, `Let me`, `Sure,`, `This function does the following`, `Berikut adalah`, `Fungsi ini melakukan` |
| CS-CD-006 | hint | Docstring/JSDoc yang hanya mengulang tanda tangan fungsi | Deskripsi param/return yang hanya mengulang nama dan tipe tanpa informasi tambahan |
| CS-CD-007 | block | Komentar `TODO`/`FIXME` tanpa pemilik atau konteks | `TODO` tanpa deskripsi, atau `TODO: implement` pada fungsi yang sudah diimplementasi |
| CS-CD-008 | hint | Kode yang dikomentari (dimatikan) dibiarkan | Tiga baris berurutan atau lebih berupa kode yang dikomentari |

## Kode

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-CD-020 | warn | Blok `try/catch` yang menelan galat | `catch` kosong, atau `catch` yang hanya `console.log(e)`/`pass`/`print(e)` tanpa penanganan |
| CS-CD-021 | hint | Penanganan berlapis yang tidak perlu | `try/catch` membungkus satu baris yang tidak bisa melempar galat, atau pengecekan null/undefined/falsy berulang untuk variabel yang sama |
| CS-CD-022 | warn | Nama generik tanpa makna | `data`, `result`, `temp`, `item`, `obj`, `handleClick`, `processData` sebagai nama fungsi atau variabel utama pada lebih dari tiga tempat |
| CS-CD-023 | warn | Fungsi pembungkus yang tidak menambah apa pun | Fungsi satu baris yang hanya memanggil fungsi lain dengan argumen yang sama |
| CS-CD-024 | hint | Konstanta untuk nilai yang dipakai sekali dengan komentar panjang | `const MAX = 5 // maximum` yang hanya dipakai satu kali |
| CS-CD-025 | warn | Fallback diam-diam yang menyembunyikan galat | Operator fallback (OR logis atau nullish coalescing) ke `[]`, `{}`, atau string kosong pada data yang seharusnya wajib ada |
| CS-CD-026 | block | Rahasia atau kunci tertanam di kode | Pola `sk-`, `AKIA`, `ghp_`, `api_key = "..."`, `password = "..."` dengan nilai literal |
| CS-CD-027 | hint | `console.log`/`print` debug tertinggal | `console.log`/`print` di luar berkas uji dan skrip CLI |
| CS-CD-028 | warn | Fungsi terlalu panjang tanpa alasan | Fungsi lebih dari 80 baris |

## README, commit, dan PR

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-CD-040 | warn | Pesan commit generik | `update`, `fix`, `changes`, `wip`, `misc` sebagai satu-satunya pesan |
| CS-CD-041 | hint | Pesan commit berlebihan dan berhias | Emoji pada pesan commit, atau baris pertama lebih dari 72 karakter |
| CS-CD-042 | warn | Deskripsi PR berisi bagian templat kosong | `## Summary` / `## Changes` yang hanya mengulang judul PR |
| CS-CD-043 | warn | README dengan bagian templat tanpa isi | `## Features`, `## Installation`, `## Contributing` yang isinya generik atau tidak sesuai proyek |

## Cara memperbaiki

1. Hapus komentar yang hanya mengulang kode. Pertahankan komentar yang menjelaskan alasan, batasan, atau jebakan.
2. Ganti nama generik dengan nama yang menyebut isi dan perannya.
3. Perlakukan `catch` kosong sebagai temuan perilaku: tangani galat dengan benar atau biarkan naik. Jangan sekadar menghapus komentar di dalamnya.
4. Temuan `CS-CD-026` (rahasia) harus ditindaklanjuti dengan memindahkan nilai ke variabel lingkungan dan mencabut kunci yang sudah terlanjur terekspos.
5. Jalankan ulang `scan --only code` dan pastikan uji yang ada tetap lolos.

## Pengecualian sah

Catat di `.clearslop/allow.json` dengan alasan bila: komentar dibutuhkan oleh alat (mis. `// eslint-disable`, `# noqa`, `@ts-expect-error`), kode dibuat oleh generator, atau berkas adalah contoh/uji untuk slop itu sendiri.
