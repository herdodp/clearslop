<!-- clearslop-ignore-file: berkas ini memuat frasa pemicu sebagai contoh -->
# Aturan Teks Bahasa Inggris (CS-EN)

Aturan ini menolak pola tulisan yang terdengar seperti keluaran AI generik: klaim tanpa isi, hype, dan kerangka kalimat yang bisa ditempel ke produk apa pun. Tingkat: `block`, `warn`, `hint`.

Prinsip: setiap kalimat harus memuat sesuatu yang spesifik dan benar tentang produk. Jika tidak ada, hapus kalimatnya.

## Kalimat pembuka dan penutup generik

| ID | Tingkat | Pola | Contoh pemicu |
|---|---|---|---|
| CS-EN-001 | warn | Pembuka era/dunia | "In today's fast-paced digital world", "In the ever-evolving landscape of", "In an era where" |
| CS-EN-002 | warn | Penutup rangkuman kosong | "In conclusion,", "In summary,", "Overall," di awal paragraf penutup |
| CS-EN-003 | warn | Ajakan klise di akhir | "Ready to take your X to the next level?", "Unlock the power of", "Start your journey today" |
| CS-EN-004 | hint | Pembuka basa-basi pada balasan atau dokumen | "Certainly!", "Great question!", "I'd be happy to help", "Absolutely!" |

## Kosakata hype

| ID | Tingkat | Pola | Contoh pemicu |
|---|---|---|---|
| CS-EN-010 | warn | Kata sifat superlatif tanpa bukti | "revolutionary", "game-changing", "cutting-edge", "next-generation", "world-class", "best-in-class" |
| CS-EN-011 | warn | Kata kerja berlebihan | "leverage", "harness", "unleash", "supercharge", "elevate", "empower", "streamline", "seamlessly" |
| CS-EN-012 | hint | Kata "AI-favorit" yang jarang dipakai manusia | "delve", "tapestry", "testament", "realm", "multifaceted", "navigate the complexities" |
| CS-EN-013 | warn | Klaim universal | "for everyone", "all your needs", "everything you need", "one-stop solution" |
| CS-EN-014 | block | Klaim angka tanpa sumber | "10x faster", "99% accuracy", "save hours every day" tanpa data atau tautan |

## Pola struktur kalimat

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-EN-020 | warn | Kontras "bukan X, melainkan Y" berulang | "It's not just X, it's Y", "Not only X but also Y" lebih dari dua kali per dokumen |
| CS-EN-021 | warn | Tiga serangkai paksa | Daftar tiga kata sifat/kata benda berirama ("fast, simple, and powerful") lebih dari dua kali per dokumen |
| CS-EN-022 | hint | Kalimat tanya retoris sebagai pembuka section | Baris pertama section diakhiri "?" lebih dari tiga kali per dokumen |
| CS-EN-023 | hint | Penggunaan tanda pisah (em dash) berlebihan | Lebih dari dua "â€”" per 200 kata |
| CS-EN-024 | hint | Kata sambung berantai di awal kalimat | "Moreover,", "Furthermore,", "Additionally," lebih dari tiga kali per dokumen |
| CS-EN-025 | warn | Kalimat penjelas diri ("This means that...", "Simply put,") setelah setiap poin | Lebih dari dua kemunculan per dokumen |

## Judul, tombol, dan mikroteks

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-EN-030 | warn | Judul huruf kapital semua dengan tanda seru | Teks `h1`-`h3` atau tombol: huruf besar semua + "!" |
| CS-EN-031 | warn | Tombol CTA generik | "Get Started", "Learn More", "Click Here", "Submit" sebagai satu-satunya label tombol utama |
| CS-EN-032 | warn | Emoji sebagai poin daftar atau awalan judul | Emoji di awal baris daftar atau judul |
| CS-EN-033 | hint | Pesan galat atau status yang ramah berlebihan | "Oops!", "Uh-oh!", "Whoops!" |
| CS-EN-034 | hint | Teks placeholder deskriptif generik | "Enter your text here", "Type something..." |

## Markdown dan dokumen

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-EN-040 | hint | Judul di setiap paragraf pendek | Lebih dari satu judul per 80 kata |
| CS-EN-041 | hint | Cetak tebal berlebihan | Lebih dari lima `**...**` per 150 kata |
| CS-EN-042 | hint | Poin daftar berawalan label tebal berpola seragam | Lebih dari empat `- **Label:** deskripsi` berurutan |
| CS-EN-043 | warn | Bagian README/dokumen berisi lencana dan emoji tanpa isi | Baris dominan lencana atau emoji di awal README |

## Cara memperbaiki

1. Hapus kalimat yang tidak membawa fakta spesifik.
2. Ganti klaim dengan fakta yang bisa diverifikasi dari proyek (fitur nyata, angka dari data, nama sebenarnya). Jika tidak ada, hapus klaimnya.
3. Tulis dengan kata kerja konkret dan subjek yang jelas, sesuai nada di `DIRECTION.md`.
4. Jalankan ulang `scan --only en`.

## Pengecualian sah

Catat di `.clearslop/allow.json` dengan alasan bila: frasa dikutip dari sumber lain, frasa menjadi nama produk atau merek, atau teks adalah contoh dalam dokumentasi tentang slop itu sendiri.
