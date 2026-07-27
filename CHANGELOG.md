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
