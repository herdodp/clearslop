---
name: clearslop
description: Use when the user asks to clear, audit, or prevent AI slop (generic UI, filler copy in English or Indonesian, AI-shaped code and comments) or mentions clearslop, slop score, or slop baseline. Runs a deterministic scanner, builds a project direction, fixes findings, and ratchets the score.
---

# clearslop

clearslop menghapus "slop" AI dari UI, teks (Inggris dan Indonesia), dan kode. Bedanya dengan filter berbasis instruksi: **pemeriksaan dilakukan oleh pemindai deterministik, bukan oleh penilaian model**. Model tidak boleh menyatakan lolos tanpa keluaran pemindai.

Alur: **Detect -> Direct -> Enforce -> Remember**.

## Berkas skill

- `scanner/clearslop.js`: pemindai CLI Node tanpa dependensi. Sumber kebenaran untuk temuan dan skor.
- `rules/ui.md`: aturan UI dan visual (ID `CS-UI-*`).
- `rules/copy-en.md`: aturan teks bahasa Inggris (ID `CS-EN-*`).
- `rules/copy-id.md`: aturan teks bahasa Indonesia (ID `CS-ID-*`).
- `rules/code.md`: aturan kode dan komentar (ID `CS-CD-*`).

Baca hanya berkas aturan yang relevan dengan tugas. Jangan memuat semuanya sekaligus.

## Perintah pemindai

Dijalankan dari root workspace (path di bawah untuk skill yang terpasang di `.snapgent/skills/clearslop/`):

```
node .snapgent/skills/clearslop/scanner/clearslop.js init
node .snapgent/skills/clearslop/scanner/clearslop.js scan [path] [--json] [--only ui,en,id,code]
node .snapgent/skills/clearslop/scanner/clearslop.js ratchet [path]
node .snapgent/skills/clearslop/scanner/clearslop.js baseline [path]
node .snapgent/skills/clearslop/scanner/clearslop.js explain <RULE_ID>
```

Exit code: `0` bersih atau skor tidak memburuk, `1` ada temuan `block` atau skor memburuk (mode ratchet), `2` kesalahan penggunaan.

## Fase 1: Detect

1. Jalankan `scan` pada path yang diminta (default: root workspace).
2. Tampilkan ke pengguna: Slop Score (0-100, makin tinggi makin bersih), jumlah temuan per tingkat, dan 10 temuan teratas beserta lokasi `berkas:baris`.
3. Jangan mengedit apa pun pada fase ini.

## Fase 2: Direct

Pemindai hanya bisa menolak, tidak bisa menciptakan karakter. Karena itu:

1. Jika `.clearslop/DIRECTION.md` belum ada, buat dari bahan yang sudah ada di proyek: `package.json`, README, nama produk, teks yang sudah dipublikasikan, dan token desain yang ada. Jangan menanyakan hal yang bisa dibaca dari berkas.
2. Isi maksimal 40 baris: siapa pengguna, nada suara (satu kalimat), satu atau dua momen yang boleh memakai warna aksen, satu detail khas produk, dan daftar kata terlarang khusus proyek.
3. Tampilkan ke pengguna dan minta persetujuan sebelum dipakai. Arahan yang belum disetujui tidak boleh dipakai untuk membenarkan perubahan.

## Fase 3: Enforce

1. Perbaiki temuan berurutan dari tingkat `block`, lalu `warn`, lalu `hint`. Satu berkas per putaran, dan jalankan ulang `scan` pada berkas itu setelah mengedit.
2. Setiap perbaikan harus berpegang pada `DIRECTION.md`. Menghapus slop tanpa pengganti yang sesuai arahan hanya menghasilkan hasil hambar. Jika tidak ada pengganti yang jujur, hapus barisnya.
3. Jangan mengarang angka, testimoni, atau klaim sebagai pengganti. Slop diganti dengan hal yang benar, bukan dengan slop lain.
4. Jika temuan adalah false positive, jangan diakali. Tambahkan ke `.clearslop/allow.json` beserta alasan singkat, lalu beri tahu pengguna.
5. Kalau satu perbaikan memunculkan temuan baru, batalkan perbaikan itu dan coba pendekatan lain.

## Fase 4: Remember

1. Setelah semua temuan `block` selesai, jalankan `baseline` untuk menyimpan skor ke `.clearslop/baseline.json`.
2. Pada pekerjaan berikutnya jalankan `ratchet`. Jika skor lebih buruk dari baseline, anggap pekerjaan belum selesai dan perbaiki sebelum melapor.
3. Pasang hook bila pengguna setuju: `init` menawarkan pre-commit hook dan contoh langkah CI yang memanggil `ratchet`.

## Aturan keras

- Tidak ada klaim "bersih" atau "lolos" tanpa keluaran `scan` atau `ratchet` yang baru dijalankan pada kondisi berkas terakhir.
- Jangan mengubah aturan pemindai atau `allow.json` hanya untuk menaikkan skor.
- Jangan menyentuh berkas di luar path yang diminta. Perubahan besar atau massal perlu konfirmasi.
- Aturan dan skor bersifat panduan kualitas, bukan pengganti penilaian manusia pada keputusan desain.

## Laporan akhir

Singkat dan berbasis keluaran pemindai:

```
clearslop: skor <sebelum> -> <sesudah>  (baseline <n>)
block: <n>  warn: <n>  hint: <n>
Berkas diubah: <daftar>
Pengecualian ditambahkan: <daftar atau tidak ada>
Exit ratchet: <0|1>
```
