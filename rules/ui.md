<!-- clearslop-ignore-file: berkas ini memuat pola pemicu sebagai contoh -->
# Aturan UI (CS-UI)

Aturan ini menolak pola visual yang muncul karena kebiasaan, bukan karena kebutuhan produk. Setiap aturan punya ID, tingkat, dan cara deteksi. Tingkat: `block` (harus diperbaiki), `warn` (perbaiki kecuali ada alasan tercatat), `hint` (saran).

Prinsip: aturan ini hanya menolak. Karakter visual datang dari `.clearslop/DIRECTION.md`, bukan dari file ini.

## Warna dan latar

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-UI-001 | warn | Gradien ungu-ke-biru atau ungu-ke-pink sebagai latar utama atau teks judul | `linear-gradient` dengan hue 250-320 pada dua stop atau lebih; kelas Tailwind `from-purple-*`/`from-violet-*` bersama `to-blue-*`/`to-pink-*`/`to-indigo-*` |
| CS-UI-002 | warn | Gradien pada teks judul (`bg-clip-text` + `text-transparent`) | Kombinasi `background-clip: text` dan warna transparan, atau kelas `bg-clip-text` + `text-transparent` |
| CS-UI-003 | warn | Glow dekoratif: bayangan berwarna dengan blur besar tanpa fungsi | `box-shadow`/`drop-shadow` dengan blur >= 24px dan warna non-netral (saturasi tinggi); kelas `shadow-*-500/50` ke atas |
| CS-UI-004 | hint | Blob buram di latar (lingkaran besar blur sebagai dekorasi) | Elemen `absolute` dengan `blur-3xl`/`filter: blur(>=60px)` dan `rounded-full` |
| CS-UI-005 | warn | Lebih dari dua warna aksen jenuh pada satu layar | Hitung hue unik (jenuh > 60%) pada token dan kelas warna di satu berkas; > 2 memicu |
| CS-UI-006 | hint | Mode gelap otomatis `#0f172a`/`slate-900` tanpa alasan produk | Nilai latar tepat `#0f172a`, `#111827`, `bg-slate-900`, `bg-gray-900` sebagai latar body |

## Tipografi

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-UI-010 | hint | Satu keluarga font bawaan untuk semua (Inter/Roboto/system-ui) tanpa kontras antara judul dan isi | `font-family` hanya berisi Inter, Roboto, atau `system-ui` di seluruh berkas gaya |
| CS-UI-011 | warn | Ukuran judul hero berlebihan dengan `tracking-tight` pada semua judul | Lebih dari tiga elemen `h1`-`h3` dengan `tracking-tight`/`letter-spacing` negatif yang sama |
| CS-UI-012 | warn | Huruf kapital semua pada label kecil di mana-mana (`uppercase tracking-wider` sebagai gaya default) | Lebih dari tiga kemunculan `uppercase` dengan `tracking-wide`/`tracking-wider`/`tracking-widest` |
| CS-UI-013 | warn | Teks pudar sulit dibaca (kontras rendah) | Rasio kontras teks terhadap latar < 4.5:1 untuk teks biasa, < 3:1 untuk teks besar (butuh nilai warna eksplisit; hanya diperiksa bila kedua warna terbaca) |

## Ikon, emoji, dan lencana

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-UI-020 | block | Emoji sebagai ikon fungsional atau penanda fitur dalam judul, tombol, atau daftar | Karakter emoji pada awal `li`, `h1`-`h4`, `button`, atau `label`; kecuali di dalam konten pengguna |
| CS-UI-021 | warn | Lencana "baru/beta/AI-powered" sebagai pil di atas judul hero | Elemen pil kecil (`rounded-full` + teks pendek) tepat sebelum `h1` yang berisi `new`, `beta`, `AI`, `2.0`, `baru`, `ber-AI` |
| CS-UI-022 | warn | Ikon berkilau (sparkle) sebagai logo atau penanda AI generik | Nama ikon `sparkles`, `wand`, `stars` atau emoji berkilau pada area logo/nav |
| CS-UI-023 | hint | Kartu fitur tiga kolom dengan ikon bulat berwarna di atas judul pendek | Tiga atau lebih kartu sibling, masing-masing dengan wadah ikon `rounded-full`/`rounded-xl` berlatar warna lembut |

## Layout dan spasi

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-UI-030 | warn | Semua sudut memakai radius besar yang sama (`rounded-2xl` di setiap elemen) | Lebih dari lima `rounded-2xl`/`rounded-3xl` dengan nilai identik dalam satu berkas |
| CS-UI-031 | hint | Nilai spasi acak di luar skala (mis. 13px, 7px, 22px) | Nilai `px` pada `margin`/`padding`/`gap` yang bukan kelipatan 4 |
| CS-UI-032 | warn | Semuanya di tengah: seluruh section `text-center` tanpa pengecualian | Lebih dari tiga section dengan `text-center`/`text-align: center` pada wadah utama |
| CS-UI-033 | hint | Kartu bersarang kartu (kartu dalam kartu, masing-masing berbayang dan berbingkai) | Elemen dengan border + shadow + radius yang berisi anak dengan ketiganya |
| CS-UI-034 | warn | Overflow horizontal pada lebar layar kecil | Hanya lewat verifikasi render (`--render`): `scrollWidth > clientWidth` pada lebar 360 dan 390 |
| CS-UI-035 | warn | Target sentuh < 44x44px pada kontrol utama | Hanya lewat verifikasi render: ukuran terhitung `button`, `a`, `input` pada lebar 390 |

## Gerak dan dekorasi

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-UI-040 | warn | Animasi masuk generik pada semua elemen (fade-up seragam) | Kelas/animasi `fade-in`/`animate-fade-in-up` pada lebih dari lima elemen |
| CS-UI-041 | hint | Animasi tanpa menghormati `prefers-reduced-motion` | Ada `animation`/`transition` panjang (> 300ms) tetapi tidak ada media query `prefers-reduced-motion` di proyek |
| CS-UI-042 | hint | Elemen mengambang/berdenyut tanpa fungsi (`animate-pulse`, `animate-bounce` dekoratif) | `animate-pulse`/`animate-bounce` pada elemen non-loading |
| CS-UI-043 | hint | Latar pola grid/titik/noise sebagai pengisi kosong | Gambar latar `radial-gradient` berulang kecil atau SVG grid sebagai latar section |

## Konten palsu pada UI

| ID | Tingkat | Pola | Deteksi |
|---|---|---|---|
| CS-UI-050 | block | Statistik atau metrik karangan pada halaman pemasaran ("10,000+ pengguna", "99.9% uptime", "0.0001ms") | Angka besar + satuan di dekat kata `users`, `uptime`, `latency`, `pengguna`, `ROI`, tanpa sumber data atau variabel |
| CS-UI-051 | block | Testimoni dengan nama, jabatan, atau avatar karangan | Blok testimoni berisi nama generik ("John Doe", "Jane Smith", "Sarah Johnson") atau avatar placeholder |
| CS-UI-052 | block | Logo "dipercaya oleh" tanpa klien nyata | Bagian `trusted by` / `dipercaya oleh` dengan logo placeholder atau nama perusahaan generik (Acme, Globex, Initech) |
| CS-UI-053 | warn | Teks isian sisa (lorem ipsum, "Your text here", "Judul di sini") | Kecocokan literal |
| CS-UI-054 | warn | Terminal/kode palsu sebagai pajangan yang berisi keluaran karangan | Blok mirip terminal dengan keluaran statis yang tidak berasal dari produk |

## Cara memperbaiki (urutan)

1. Hapus dulu yang tidak punya fungsi (blob, glow, lencana, ikon bulat).
2. Ganti konten palsu dengan konten nyata dari proyek, atau hapus bagiannya. Jangan membuat angka pengganti.
3. Terapkan warna, font, dan momen aksen dari `DIRECTION.md`.
4. Rapikan spasi ke skala tetap (kelipatan 4 atau 8) dan jalankan ulang `scan`.

## Pengecualian sah

Tambahkan ke `.clearslop/allow.json` dengan alasan bila: gradien memang bagian identitas merek yang disetujui, emoji adalah konten pengguna, atau angka berasal dari data nyata yang terhubung. Alasan wajib diisi.
