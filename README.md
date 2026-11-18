# clearslop

clearslop adalah skill untuk agen koding AI yang membersihkan "slop" dari UI, teks (Inggris dan Indonesia), dan kode. Bedanya dengan filter berbasis instruksi biasa: pemeriksaan dilakukan oleh pemindai deterministik, bukan oleh penilaian model.

## Pembeda

- **Pemindai deterministik.** `scanner/clearslop.js` adalah CLI Node tanpa dependensi. Keluarannya berupa temuan, skor, dan exit code, jadi bisa dipakai di pre-commit hook atau CI.
- **Slop Score 0-100 dengan ratchet.** `baseline` menyimpan skor ke `.clearslop/baseline.json`. `ratchet` gagal (exit 1) bila skor memburuk atau temuan `block` bertambah.
- **Aturan bahasa Indonesia.** Pola slop berbahasa Indonesia (pembuka era digital, terjemahan harfiah idiom, kata isian) punya aturan sendiri (`CS-ID-*`).
- **Arah proyek.** Skill membuat `.clearslop/DIRECTION.md` dari isi proyek, lalu meminta persetujuan pengguna sebelum dipakai.
- **Pengecualian tercatat.** False positive masuk ke `.clearslop/allow.json` dengan alasan wajib, atau lewat direktif `clearslop-ignore: <alasan>` pada baris terkait.

## Alur

Detect -> Direct -> Enforce -> Remember. Detail ada di `SKILL.md`.

## Pasang

Salin folder ini ke `.snapgent/skills/clearslop/` (atau folder skill agen Anda), lalu sesuaikan path perintah di `SKILL.md` bila perlu.

## Pakai

```
node scanner/clearslop.js init
node scanner/clearslop.js scan [path] [--json] [--only ui,en,id,code]
node scanner/clearslop.js baseline [path]
node scanner/clearslop.js ratchet [path]
node scanner/clearslop.js explain <RULE_ID>
```

Exit code: `0` aman, `1` ada temuan `block` atau skor memburuk (ratchet), `2` kesalahan penggunaan.

## Isi

| Berkas | Fungsi |
|---|---|
| `SKILL.md` | Instruksi skill untuk agen |
| `scanner/clearslop.js` | Pemindai, skor, baseline, ratchet |
| `rules/ui.md` | Aturan UI (`CS-UI-*`) |
| `rules/copy-en.md` | Aturan teks Inggris (`CS-EN-*`) |
| `rules/copy-id.md` | Aturan teks Indonesia (`CS-ID-*`) |
| `rules/code.md` | Aturan kode dan komentar (`CS-CD-*`) |

## Status

Versi 0.1.0. Pemindai baru mencakup sebagian aturan di berkas `rules/` (yang sudah punya detektor bisa dicek dengan `explain`). Verifikasi render (Playwright) dan aturan kontras belum diimplementasikan.

## Lisensi

MIT. Aturan dan kode ditulis dari nol dan tidak disalin dari proyek lain.
