<!-- clearslop-ignore-file: berkas ini memuat frasa pemicu sebagai contoh -->
# Aturan Teks Bahasa Indonesia (CS-ID)

Aturan ini menolak pola tulisan berbahasa Indonesia yang terdengar seperti keluaran AI generik: terjemahan kaku dari bahasa Inggris, hype, dan kalimat yang bisa ditempel ke produk apa pun. Tingkat: `block`, `warn`, `hint`.

Prinsip: tulisan Indonesia yang baik terdengar seperti orang yang menulisnya langsung dalam bahasa Indonesia, bukan seperti terjemahan. Jika sebuah kalimat tidak memuat hal spesifik dan benar tentang produk, hapus.

## Pembuka dan penutup generik

| ID | Tingkat | Pola | Contoh pemicu |
|---|---|---|---|
| CS-ID-001 | warn | Pembuka era/zaman | "Di era digital ini", "Di era modern saat ini", "Dalam dunia yang serba cepat", "Di tengah perkembangan teknologi yang pesat" |
| CS-ID-002 | warn | Penutup rangkuman kosong | "Kesimpulannya,", "Sebagai kesimpulan,", "Secara keseluruhan," di awal paragraf penutup |
| CS-ID-003 | warn | Ajakan klise | "Siap membawa bisnis Anda ke level berikutnya?", "Mulai perjalanan Anda hari ini", "Wujudkan impian Anda bersama kami" |
| CS-ID-004 | hint | Basa-basi pembuka balasan | "Tentu saja!", "Pertanyaan yang bagus!", "Dengan senang hati saya akan membantu", "Baik, mari kita mulai" |
| CS-ID-005 | warn | Ajakan eksplorasi generik | "Mari kita eksplorasi", "Mari kita selami", "Mari kita bahas lebih dalam", "Yuk, kita kupas tuntas" |

## Kosakata hype dan kata isian

| ID | Tingkat | Pola | Contoh pemicu |
|---|---|---|---|
| CS-ID-010 | warn | Superlatif tanpa bukti | "revolusioner", "terdepan", "terbaik di kelasnya", "kelas dunia", "inovatif", "canggih", "mutakhir" |
| CS-ID-011 | warn | Kata kerja berlebihan | "memberdayakan", "mengoptimalkan", "memaksimalkan", "merevolusi", "menghadirkan solusi", "mengakselerasi" |
| CS-ID-012 | warn | Klaim universal | "untuk semua kebutuhan Anda", "solusi satu pintu", "segala yang Anda butuhkan", "cocok untuk siapa saja" |
| CS-ID-013 | block | Klaim angka tanpa sumber | "10x lebih cepat", "akurasi 99%", "hemat waktu berjam-jam" tanpa data atau tautan |
| CS-ID-014 | hint | Frasa pengisi yang menunda isi | "Perlu diketahui bahwa", "Penting untuk dicatat bahwa", "Tak dapat dipungkiri bahwa", "Tidak bisa dipungkiri" |
| CS-ID-015 | hint | Kata "AI-favorit" dalam tulisan Indonesia | "lanskap", "ekosistem" tanpa objek jelas, "sinergi", "holistik", "komprehensif", "paradigma baru", "transformasi digital" |

## Terjemahan kaku dan struktur kalimat

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-ID-020 | warn | Kontras "bukan hanya X, tetapi juga Y" berulang | "Bukan hanya ... tetapi juga", "Tidak hanya ... melainkan" lebih dari dua kali per dokumen |
| CS-ID-021 | warn | Tiga serangkai paksa | "cepat, mudah, dan andal" berirama lebih dari dua kali per dokumen |
| CS-ID-022 | warn | Kalimat pasif berantai ("dapat dilakukan", "dapat digunakan", "dapat diakses") | Lebih dari tiga "dapat di-" per 200 kata |
| CS-ID-023 | warn | Terjemahan harfiah dari idiom Inggris | "di akhir hari", "mengambil langkah mundur", "bola ada di tangan Anda", "mengubah permainan", "di luar kotak" |
| CS-ID-024 | hint | Kata sambung berantai di awal kalimat | "Selain itu,", "Lebih lanjut,", "Di samping itu,", "Oleh karena itu," lebih dari tiga kali per dokumen |
| CS-ID-025 | hint | Kalimat penjelas diri setelah setiap poin | "Artinya,", "Dengan kata lain,", "Singkatnya," lebih dari dua kali per dokumen |
| CS-ID-026 | hint | Kalimat tanya retoris sebagai pembuka section | Baris pertama section diakhiri "?" lebih dari tiga kali per dokumen |
| CS-ID-027 | warn | "Anda" berlebihan dan nada kaku pada produk yang ditujukan ke audiens santai | "Anda" lebih dari 8 kali per 150 kata, tidak sesuai nada di `DIRECTION.md` |

## Judul, tombol, dan mikroteks

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-ID-030 | warn | Judul kapital semua dengan tanda seru | Teks `h1`-`h3` atau tombol: huruf besar semua + "!" |
| CS-ID-031 | warn | Tombol CTA generik | "Mulai Sekarang", "Pelajari Lebih Lanjut", "Klik Di Sini", "Kirim" sebagai satu-satunya label tombol utama |
| CS-ID-032 | warn | Emoji sebagai poin daftar atau awalan judul | Emoji di awal baris daftar atau judul |
| CS-ID-033 | hint | Pesan galat yang dibuat-buat ramah | "Ups!", "Oops!", "Waduh!", "Aduh!" tanpa informasi penyebab |
| CS-ID-034 | hint | Placeholder generik | "Masukkan teks Anda di sini", "Ketik sesuatu...", "Judul di sini" |
| CS-ID-035 | hint | Pesan galat tanpa tindakan lanjut | "Terjadi kesalahan." / "Terjadi kesalahan, silakan coba lagi nanti." tanpa penyebab atau langkah |

## Campur bahasa dan ejaan

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-ID-040 | hint | Istilah Inggris tanpa perlu di tengah kalimat Indonesia | "leverage", "seamless", "scalable", "powerful", "user-friendly" padahal ada padanan biasa |
| CS-ID-041 | hint | Judul Title Case Inggris pada teks Indonesia | Tiap kata berhuruf kapital pada judul berbahasa Indonesia ("Solusi Terbaik Untuk Bisnis Anda") |
| CS-ID-042 | hint | Ketidakkonsistenan sapaan | Campuran "Anda", "kamu", "kalian", "Kakak" dalam satu dokumen |

## Cara memperbaiki

1. Hapus kalimat yang tidak membawa fakta spesifik.
2. Ganti klaim dengan fakta yang bisa diverifikasi dari proyek (fitur nyata, angka dari data, nama sebenarnya). Jika tidak ada, hapus klaimnya.
3. Tulis dengan kata kerja aktif dan subjek jelas. Contoh: ganti "Fitur ini dapat digunakan untuk membuat laporan" dengan "Buat laporan dari satu tabel."
4. Samakan sapaan dan nada dengan `DIRECTION.md`.
5. Jalankan ulang `scan --only id`.

## Pengecualian sah

Catat di `.clearslop/allow.json` dengan alasan bila: frasa dikutip dari sumber lain, frasa menjadi nama produk atau merek, atau teks adalah contoh dalam dokumentasi tentang slop itu sendiri.
