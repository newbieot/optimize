## v5.2 — Excel CBA dan Scope of Work

- Menambahkan tombol **Proses Excel CBA** setelah kalkulasi berhasil.
- Membatasi input tambahan pada identitas pelanggan, alamat, kontak, dan tanggal mulai; nilai, rute, biaya, berat, serta dimensi diambil otomatis dari kalkulasi.
- Menambahkan sheet **CBA**, **Rincian Biaya Fix**, dan **NEW SOW** ke workbook formula-driven yang juga memuat sheet Perhitungan dan Tabel Optimalisasi.
- Mengambil dimensi per koli dari paket dengan berat volumetrik terbesar.
- Menghasilkan gambar pola operasi dari asal, rute, moda, dan tujuan, lalu menanamkannya langsung ke sheet NEW SOW.
- Mengganti referensi eksternal yang putus pada file contoh dengan formula internal antar-sheet.

## v5.1 — Footer parity with lacak.posnew.com
- Footer diubah menjadi bar tipis 38 px dengan garis oranye di atas dan latar navy.
- Menambahkan ikon brand, caption tengah, dan badge kreator interaktif seperti lacak.posnew.com.
- Versi mobile menggunakan tinggi 36 px, menyembunyikan caption, dan menjaga badge tetap ringkas.
- Tautan PosNew Hub dan profil kreator sekarang aktif serta aman dibuka di tab baru.

# Changelog

## v5.0 — UI/UX Redesign

- Mendesain ulang workspace menjadi panel input dan panel ringkasan yang responsif.
- Menambahkan KPI realtime: nilai proyek, DPP, total biaya, laba/rugi, margin, chargeable weight, dan metrik per kg.
- Menambahkan **Nilai Proyek per Kg** dengan basis total chargeable weight.
- Menambahkan rincian perhitungan, status proyek, dan insight berbasis hasil aktual.
- Menambahkan simpan, muat, duplikasi, bandingkan, dan hapus skenario lokal.
- Menambahkan salin/bagikan ringkasan, ekspor/impor JSON, reset, cetak, dan simpan PDF melalui dialog print.
- Memperbaiki preview perhitungan biaya langsung: biaya langsung kini dialokasikan proporsional per paket dan dimasukkan ke Total Biaya serta Laba. Sebelumnya DPP sudah memasukkan biaya langsung, tetapi kolom Total Biaya preview belum memasukkannya.
- Mempertahankan autentikasi Firebase, semua sumber tarif Google Sheets, chaining rute, kalkulasi volumetrik, aturan pembulatan CW, pajak, dan ekspor Excel.
- Menambahkan metadata SEO, manifest, sitemap, robots.txt, 404, dan security headers aman untuk Cloudflare Pages.
- Menambahkan focus state, target sentuh, semantic labels, reduced motion, dan layout cetak A4.
