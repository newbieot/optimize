# Laporan Pengujian — PosNew Hub Optimize v5.0

Tanggal pengujian: 27 Juli 2026

## Hasil utama

- **Lulus** — pemeriksaan sintaks JavaScript (`node --check`).
- **Lulus** — regression test formula deterministik (`tests/formula-regression.js`).
- **Lulus** — `index.html` dan `beta.html` menggunakan versi aplikasi yang identik.
- **Lulus** — tidak ditemukan ID HTML ganda.
- **Lulus** — seluruh referensi aset lokal tersedia.
- **Lulus** — browser regression desktop dan mobile dengan data contoh: KPI `Rp33.474/kg`, status `Menguntungkan`, 3 baris hasil, tanpa console/page error.
- **Lulus** — render cetak A4 menghasilkan PDF dua halaman tanpa tabel lebar terpotong.
- **Lulus** — kasus berat nol/kosong ditangani dengan pembagian aman dan tidak menampilkan `Infinity` atau `NaN`.
- **Lulus** — input negatif yang tidak masuk akal ditandai melalui validasi inline.
- **Lulus** — reset, ekspor/impor JSON, penyimpanan skenario lokal, perbandingan skenario, salin ringkasan, dan print memiliki handler aktif.

## Sampel regression formula

Data uji menghasilkan:

- Total optimalisasi: Rp195.750
- Overhead 5%: Rp9.787,50
- Cost of fund: Rp1.287,12
- Biaya dasar: Rp206.824,62
- Total biaya setelah biaya langsung: Rp706.824,62
- DPP: Rp831.558,38
- Total nilai proyek: Rp840.705,52
- Laba: Rp124.733,76
- Nilai proyek per kg: Rp84.070,55/kg

Semua nilai tersebut cocok dengan assertion regression test.

## Koreksi formula preview

Perhitungan DPP lama sudah memasukkan biaya langsung. Namun, preview tabel lama belum memasukkan biaya langsung ke kolom `Total Biaya` dan `Laba`. Versi ini mengalokasikan biaya langsung secara proporsional berdasarkan chargeable weight setiap paket agar total preview konsisten dengan DPP dan ringkasan proyek. Formula ekspor dan komponen bisnis lainnya tetap dipertahankan.

## Batas pengujian lingkungan

Firebase Authentication dan sumber tarif Google Sheets/CSV merupakan layanan eksternal yang tidak dapat diakses secara live dari lingkungan pengujian terisolasi. Konfigurasi, URL sumber, parser, serta alur pemuatan lama tidak diubah. Regression browser dilakukan dengan stub deterministik agar alur UI, formula, rendering hasil, responsive layout, dan error console tetap dapat diuji secara konsisten. Setelah deploy, lakukan smoke test singkat pada domain produksi untuk login dan pemuatan tarif live.
