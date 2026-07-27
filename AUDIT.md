# Audit Fitur dan Formula

## Fungsi lama yang dipertahankan

- Login Firebase email/password dan Google, termasuk whitelist domain/email.
- Pemuatan database tarif Garuda, regional, Lion Parcel, primer darat/laut, sekunder, dan tersier.
- Pencarian tujuan dengan Tom Select.
- Multi-paket, paste tabel dari Excel, berat aktual, dimensi, berat volumetrik, dan chargeable weight.
- Pembagi volumetrik 6.000 untuk udara dan 4.000 untuk darat/laut.
- Pembulatan chargeable weight ke atas jika pecahan lebih dari 0,30; minimum 1 kg.
- Universal route chaining, rute primer/sekunder/Lion Parcel/sekunder setempat, basis per kg/per koli.
- Tarif tersier otomatis, target margin, biaya langsung, dan opsi PPh 2%.
- Collecting Rp1.000/paket, processing Rp1.000/paket, delivery Rp2.875/kg.
- Overhead 5% dan cost of fund 30/365 × 8%.
- Kalkulasi tabel dan ekspor Excel dengan dua sheet.

## Formula utama

- Volumetrik = P × L × T ÷ 6.000 (udara) atau 4.000 (darat/laut).
- Chargeable weight = maksimum berat aktual dan volumetrik, dibulatkan sesuai aturan 0,30.
- Total optimalisasi = collecting + processing + seluruh biaya rute + tersier + delivery.
- Biaya dasar = total optimalisasi + overhead 5% + cost of fund.
- Total biaya = biaya dasar + biaya langsung.
- DPP = total biaya ÷ (1 − target margin).
- PPN = DPP × 1,1%.
- Total nilai proyek = DPP + PPN.
- Laba = DPP − total biaya.
- Margin = laba ÷ DPP.
- Nilai proyek per kg = total nilai proyek ÷ total chargeable weight.
- Pendapatan/biaya/laba per kg menggunakan denominator chargeable weight yang sama.
