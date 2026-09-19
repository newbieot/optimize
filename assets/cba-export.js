(() => {
  'use strict';

  const COLORS = {
    navy: 'FF1C2D5A',
    orange: 'FFEF4123',
    section: 'FFED7D00',
    lime: 'FFC6E000',
    yellow: 'FFFFFF00',
    paleYellow: 'FFFFF7CC',
    paleBlue: 'FFEAF2FB',
    gray: 'FFE5E7EB',
    darkGray: 'FF4B5563',
    white: 'FFFFFFFF',
    black: 'FF111827'
  };
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF4B5563' } },
    left: { style: 'thin', color: { argb: 'FF4B5563' } },
    bottom: { style: 'thin', color: { argb: 'FF4B5563' } },
    right: { style: 'thin', color: { argb: 'FF4B5563' } }
  };
  const moneyFormat = '"Rp" #,##0;[Red]("Rp" #,##0);-';

  const colName = index => {
    let name = '';
    while (index > 0) {
      const remainder = (index - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      index = Math.floor((index - 1) / 26);
    }
    return name;
  };

  const safeText = value => String(value ?? '').trim();
  const cleanFilePart = value => safeText(value).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'Proyek';
  const placeName = value => {
    const text = safeText(value);
    const parts = text.split(' - ').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : text;
  };
  const formatIndonesianDate = date => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
  const addDays = (date, days) => {
    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  };
  const formula = (cell, expression, result) => {
    cell.value = { formula: expression, result: Number.isFinite(result) ? result : 0 };
  };
  function styleRange(sheet, range, style) {
    const [start, end] = range.split(':');
    const decode = address => {
      const match = address.match(/^([A-Z]+)(\d+)$/);
      let col = 0;
      for (const char of match[1]) col = col * 26 + char.charCodeAt(0) - 64;
      return { row: Number(match[2]), col };
    };
    const a = decode(start), b = decode(end || start);
    for (let row = a.row; row <= b.row; row += 1) {
      for (let col = a.col; col <= b.col; col += 1) Object.assign(sheet.getCell(row, col), style.cell || {});
    }
    for (let row = a.row; row <= b.row; row += 1) {
      for (let col = a.col; col <= b.col; col += 1) {
        const cell = sheet.getCell(row, col);
        if (style.font) cell.font = { ...(cell.font || {}), ...style.font };
        if (style.fill) cell.fill = style.fill;
        if (style.border) cell.border = style.border;
        if (style.alignment) cell.alignment = { ...(cell.alignment || {}), ...style.alignment };
        if (style.numFmt) cell.numFmt = style.numFmt;
      }
    }
  }

  function mergeAndSet(sheet, range, value, options = {}) {
    sheet.mergeCells(range);
    const cell = sheet.getCell(range.split(':')[0]);
    cell.value = value === '' ? null : value;
    if (options.font) cell.font = options.font;
    if (options.fill) cell.fill = options.fill;
    if (options.alignment) cell.alignment = options.alignment;
    if (options.border) styleRange(sheet, range, { border: options.border });
    return cell;
  }

  function sectionBar(sheet, range, text) {
    return mergeAndSet(sheet, range, text, {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.section } },
      font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.black } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: thinBorder
    });
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 5) {
    const words = safeText(text).split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
        if (lines.length === maxLines - 1) break;
      } else current = candidate;
    }
    if (current && lines.length < maxLines) lines.push(current);
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    return lines.length;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawArrow(ctx, fromX, toX, y) {
    ctx.strokeStyle = '#EF4123';
    ctx.fillStyle = '#EF4123';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(fromX, y);
    ctx.lineTo(toX - 18, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX, y);
    ctx.lineTo(toX - 24, y - 14);
    ctx.lineTo(toX - 24, y + 14);
    ctx.closePath();
    ctx.fill();
  }

  function createOperationDiagram(model, meta) {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 530;
    const ctx = canvas.getContext('2d');
    const origin = placeName(model.routes[0]?.origin || 'Lokasi asal');
    const destination = placeName(model.destination || model.routes.at(-1)?.dest || 'Lokasi tujuan');
    const stops = [origin, ...model.routes.map(route => placeName(route.dest))].filter((stop, index, all) => stop && all.indexOf(stop) === index);
    const modes = model.routes.map(route => route.moda).filter((mode, index, all) => mode && all.indexOf(mode) === index);
    const routeText = `${stops.join(' → ')} • ${modes.join(' + ')}`;
    const background = ctx.createLinearGradient(0, 0, 1400, 500);
    background.addColorStop(0, '#F4F9FF');
    background.addColorStop(1, '#E1F2FA');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#102B57';
    ctx.font = '700 34px Arial';
    ctx.fillText(`POLA OPERASI ${origin.toUpperCase()} → ${destination.toUpperCase()}`, 48, 60);
    ctx.fillStyle = '#53657D';
    ctx.font = '22px Arial';
    ctx.fillText(`Door to Door • ${model.packages.length} koli • ${Math.round(model.totalWeight * 100) / 100} kg chargeable weight`, 48, 94);

    const steps = [
      { no: '1', title: 'PENJEMPUTAN', text: `${meta.customer} • ${origin}`, color: '#EF4123' },
      { no: '2', title: 'COLLECTING & PROCESSING', text: `Verifikasi, timbang, dan proses di Kantor Pos ${origin}`, color: '#F59E0B' },
      { no: '3', title: 'TRANSPORTASI', text: routeText || 'Moda optimalisasi jaringan Pos Indonesia', color: '#14A3B8' },
      { no: '4', title: 'DELIVERY', text: `Serah terima kiriman di ${destination}`, color: '#1F7A4D' }
    ];
    const cardWidth = 290, cardHeight = 270, gap = 48, startX = 42, cardY = 132;
    steps.forEach((step, index) => {
      const x = startX + index * (cardWidth + gap);
      ctx.shadowColor = 'rgba(16,43,87,.16)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 7;
      roundedRect(ctx, x, cardY, cardWidth, cardHeight, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.shadowColor = 'transparent';

      roundedRect(ctx, x, cardY, cardWidth, 62, 22);
      ctx.fillStyle = '#102B57';
      ctx.fill();
      ctx.fillRect(x, cardY + 34, cardWidth, 28);

      ctx.beginPath();
      ctx.arc(x + 38, cardY + 31, 22, 0, Math.PI * 2);
      ctx.fillStyle = step.color;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 23px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(step.no, x + 38, cardY + 39);
      ctx.textAlign = 'left';
      ctx.font = '700 15px Arial';
      ctx.fillText(step.title, x + 70, cardY + 38);

      ctx.fillStyle = step.color;
      roundedRect(ctx, x + 24, cardY + 88, 68, 68, 16);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(index === 0 ? 'PU' : index === 1 ? 'CP' : index === 2 ? 'TR' : 'DL', x + 58, cardY + 131);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#263A55';
      ctx.font = '18px Arial';
      wrapCanvasText(ctx, step.text, x + 24, cardY + 188, cardWidth - 48, 26, 4);
      if (index < steps.length - 1) drawArrow(ctx, x + cardWidth + 7, x + cardWidth + gap - 7, cardY + cardHeight / 2);
    });

    ctx.fillStyle = '#102B57';
    ctx.font = '700 18px Arial';
    ctx.fillText('Alur dibuat otomatis dari paket dan rute pada kalkulasi optimalisasi.', 48, 492);
    return canvas.toDataURL('image/png');
  }

  function baseWorkbook() {
    if (!window.ExcelJS) throw new Error('Modul pembuat Excel CBA belum tersedia. Muat ulang halaman dan coba lagi.');
    const workbook = new window.ExcelJS.Workbook();
    workbook.creator = 'PosNew Hub';
    workbook.lastModifiedBy = 'PosNew Hub';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;
    workbook.calcProperties.forceFullCalc = true;
    return workbook;
  }

  function styleDataSheet(sheet, headerRow, lastColumn) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: lastColumn } };
    sheet.getRow(headerRow).height = 34;
    sheet.getRow(headerRow).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.white } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === headerRow) return;
      row.eachCell(cell => {
        cell.font = { name: 'Arial', size: 9, color: { argb: COLORS.black } };
        cell.alignment = { vertical: 'middle' };
        cell.border = thinBorder;
      });
    });
  }

  function addOptimizationSheets(workbook, model) {
    const calc = workbook.addWorksheet('Perhitungan');
    const table = workbook.addWorksheet('Tabel Optimalisasi');
    const routeStart = 13;
    const tertiaryCol = routeStart + model.routes.length;
    const deliveryCol = tertiaryCol + 1;
    const optimizationCol = tertiaryCol + 2;
    const overheadCol = tertiaryCol + 3;
    const cofCol = tertiaryCol + 4;
    const baseCostCol = tertiaryCol + 5;
    const profitCol = tertiaryCol + 6;
    const marginCol = tertiaryCol + 7;
    const lastPackageRow = model.packages.length + 1;
    const totalRow = lastPackageRow + 1;
    const divisor = safeText(document.querySelector('input[name="modaUtama"]:checked')?.value) === 'UDARA' ? 6000 : 4000;

    const tableHeaders = [
      'NAMA PAKET', 'BERAT AKTUAL (KG)', 'PANJANG (CM)', 'LEBAR (CM)', 'TINGGI (CM)',
      'BERAT VOLUMETRIK (KG)', 'CHARGEABLE WEIGHT (KG)', 'NILAI PROYEK (MARGIN TARGET)',
      'DPP', 'PPN (1.1%)', 'COLLECTING', 'PROCESSING',
      ...model.routes.map(route => `JALUR ${route.moda}: ${route.origin} → ${route.dest}`),
      `TERSIER KCU: ${model.destination}`, 'DELIVERY', 'TOTAL OPTIMALISASI', 'OVERHEAD (5%)',
      'COF', 'TOTAL BIAYA DASAR', 'LABA SEBELUM BIAYA LANGSUNG', 'MARGIN (%)'
    ];
    table.addRow(tableHeaders);
    model.packages.forEach((item, index) => {
      const rowNumber = index + 2;
      const row = table.addRow([item.name, item.actual, item.p, item.l, item.t]);
      row.height = 23;
      formula(table.getCell(rowNumber, 6), `C${rowNumber}*D${rowNumber}*E${rowNumber}/${divisor}`, item.vol);
      formula(table.getCell(rowNumber, 7), `MAX(1,IF((MAX(B${rowNumber},F${rowNumber})-INT(MAX(B${rowNumber},F${rowNumber})))>0.3,INT(MAX(B${rowNumber},F${rowNumber}))+1,INT(MAX(B${rowNumber},F${rowNumber}))))`, item.cw);
      formula(table.getCell(rowNumber, 8), `I${rowNumber}*1.011`, item.projectValue);
      const baseCostLetter = colName(baseCostCol);
      formula(
        table.getCell(rowNumber, 9),
        `((SUM(${baseCostLetter}$2:${baseCostLetter}$${lastPackageRow})+Perhitungan!$I$2)/(1-${model.margin.toFixed(8)}))*(${baseCostLetter}${rowNumber}/SUM(${baseCostLetter}$2:${baseCostLetter}$${lastPackageRow}))`,
        item.dpp
      );
      formula(table.getCell(rowNumber, 10), `I${rowNumber}*0.011`, item.ppn);
      table.getCell(rowNumber, 11).value = item.collecting;
      table.getCell(rowNumber, 12).value = item.processing;
      model.routes.forEach((route, routeIndex) => {
        const routeCol = routeStart + routeIndex;
        const routeFormula = route.basis === 'KOLI'
          ? `ROUNDUP($G${rowNumber}/30,0)*${route.tarif}`
          : `$G${rowNumber}*${route.tarif}`;
        formula(table.getCell(rowNumber, routeCol), routeFormula, item.routeCosts[routeIndex]);
      });
      formula(table.getCell(rowNumber, tertiaryCol), `$G${rowNumber}*${model.tertiaryRate}`, item.tertiary);
      formula(table.getCell(rowNumber, deliveryCol), `$G${rowNumber}*2875`, item.delivery);
      formula(table.getCell(rowNumber, optimizationCol), `SUM(K${rowNumber}:${colName(deliveryCol)}${rowNumber})`, item.optimization);
      formula(table.getCell(rowNumber, overheadCol), `${colName(optimizationCol)}${rowNumber}*0.05`, item.overhead);
      formula(table.getCell(rowNumber, cofCol), `${colName(optimizationCol)}${rowNumber}*30/365*0.08`, item.cof);
      formula(table.getCell(rowNumber, baseCostCol), `SUM(${colName(optimizationCol)}${rowNumber}:${colName(cofCol)}${rowNumber})`, item.baseCost);
      formula(table.getCell(rowNumber, profitCol), `I${rowNumber}-${colName(baseCostCol)}${rowNumber}`, item.dpp - item.baseCost);
      formula(table.getCell(rowNumber, marginCol), `${colName(profitCol)}${rowNumber}/I${rowNumber}`, item.dpp ? (item.dpp - item.baseCost) / item.dpp : 0);
    });

    table.getCell(totalRow, 1).value = 'GRAND TOTAL';
    for (let col = 2; col <= marginCol; col += 1) {
      if ([3, 4, 5].includes(col)) continue;
      if (col === marginCol) {
        formula(table.getCell(totalRow, col), `${colName(profitCol)}${totalRow}/I${totalRow}`, (model.dpp - model.baseTotal) / model.dpp);
      } else {
        const values = {
          2: model.packages.reduce((sum, item) => sum + item.actual, 0), 6: model.packages.reduce((sum, item) => sum + item.vol, 0),
          7: model.totalWeight, 8: model.projectValue, 9: model.dpp, 10: model.ppn, 11: model.packages.reduce((sum, item) => sum + item.collecting, 0),
          12: model.packages.reduce((sum, item) => sum + item.processing, 0), [tertiaryCol]: model.packages.reduce((sum, item) => sum + item.tertiary, 0),
          [deliveryCol]: model.packages.reduce((sum, item) => sum + item.delivery, 0), [optimizationCol]: model.packages.reduce((sum, item) => sum + item.optimization, 0),
          [overheadCol]: model.packages.reduce((sum, item) => sum + item.overhead, 0), [cofCol]: model.packages.reduce((sum, item) => sum + item.cof, 0),
          [baseCostCol]: model.baseTotal, [profitCol]: model.dpp - model.baseTotal
        };
        model.routes.forEach((route, routeIndex) => { values[routeStart + routeIndex] = model.packages.reduce((sum, item) => sum + item.routeCosts[routeIndex], 0); });
        formula(table.getCell(totalRow, col), `SUM(${colName(col)}2:${colName(col)}${lastPackageRow})`, values[col] || 0);
      }
    }
    styleDataSheet(table, 1, marginCol);
    table.getRow(totalRow).height = 25;
    styleRange(table, `A${totalRow}:${colName(marginCol)}${totalRow}`, {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray } },
      font: { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.navy } }
    });
    for (let col = 2; col <= marginCol; col += 1) table.getCell(totalRow, col).alignment = { horizontal: 'right', vertical: 'middle' };
    for (let row = 2; row <= totalRow; row += 1) {
      table.getCell(row, 6).numFmt = '0.00';
      table.getCell(row, 7).numFmt = '0.00';
      for (let col = 8; col < marginCol; col += 1) table.getCell(row, col).numFmt = moneyFormat;
      table.getCell(row, marginCol).numFmt = '0.00%';
    }
    table.columns.forEach((column, index) => { column.width = index === 0 ? 26 : index < 7 ? 16 : 21; });
    table.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

    const calcHeaders = [
      'NO', 'ORIGIN', 'DESTINATION', 'BERAT TOTAL (KG)', 'JUMLAH KOLI', 'PROYEKSI PENDAPATAN',
      'DPP', 'PPN (1.1%)', 'BIAYA LANGSUNG', 'PPh 2%', 'NET BIAYA LANGSUNG', 'JUMLAH BIAYA LANGSUNG',
      'BTL | BIAYA OPTIMALISASI', 'BTL | OVERHEAD 5%', 'BTL | COST OF FUND', 'JUMLAH BTL',
      'TOTAL BIAYA', 'LABA', '% MARGIN'
    ];
    calc.addRow(calcHeaders);
    calc.addRow([1, model.routes[0]?.origin || '', model.destination, null, model.packages.length]);
    formula(calc.getCell('D2'), `'Tabel Optimalisasi'!G${totalRow}`, model.totalWeight);
    formula(calc.getCell('F2'), `'Tabel Optimalisasi'!H${totalRow}`, model.projectValue);
    formula(calc.getCell('G2'), 'F2*100/101.1', model.dpp);
    formula(calc.getCell('H2'), 'G2*0.011', model.ppn);
    calc.getCell('I2').value = model.directCost;
    formula(calc.getCell('J2'), model.pph > 0 ? 'I2*0.02' : '0', model.pph);
    formula(calc.getCell('K2'), 'I2-J2', model.directCost - model.pph);
    formula(calc.getCell('L2'), 'I2', model.directCost);
    formula(calc.getCell('M2'), `'Tabel Optimalisasi'!${colName(optimizationCol)}${totalRow}`, model.packages.reduce((sum, item) => sum + item.optimization, 0));
    formula(calc.getCell('N2'), 'M2*0.05', model.packages.reduce((sum, item) => sum + item.overhead, 0));
    formula(calc.getCell('O2'), 'M2*30/365*0.08', model.packages.reduce((sum, item) => sum + item.cof, 0));
    formula(calc.getCell('P2'), 'M2+N2+O2', model.baseTotal);
    formula(calc.getCell('Q2'), 'L2+P2', model.totalCost);
    formula(calc.getCell('R2'), 'G2-Q2', model.profit);
    formula(calc.getCell('S2'), 'R2/G2', model.actualMargin / 100);
    styleDataSheet(calc, 1, 19);
    calc.getRow(2).height = 24;
    for (let col = 6; col <= 18; col += 1) calc.getCell(2, col).numFmt = moneyFormat;
    calc.getCell('D2').numFmt = '0.00';
    calc.getCell('S2').numFmt = '0.00%';
    calc.columns.forEach((column, index) => { column.width = index === 0 ? 7 : index < 5 ? 20 : 23; });
    calc.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9 };
    return { totalRow, optimizationCol };
  }

  function addCbaSheet(workbook, model, meta) {
    const sheet = workbook.addWorksheet('CBA');
    sheet.views = [{ showGridLines: false }];
    sheet.columns = [
      { width: 3 }, { width: 3 }, { width: 3 }, { width: 7 }, { width: 33 }, { width: 4 }, { width: 22 }, { width: 23 }
    ];
    mergeAndSet(sheet, 'D1:G1', 'PT POS INDONESIA (PERSERO)', { font: { name: 'Arial', size: 9, bold: true } });
    sheet.getCell('H1').value = 'Lampiran 1';
    mergeAndSet(sheet, 'D2:G2', `KANTOR CABANG UTAMA ${meta.origin.toUpperCase()}`, { font: { name: 'Arial', size: 9, bold: true } });
    mergeAndSet(sheet, 'D4:H4', 'COST AND BENEFIT ANALYSIS ( C B A )', { font: { name: 'Arial', size: 12, bold: true }, alignment: { horizontal: 'center' } });
    mergeAndSet(sheet, 'D5:H5', `KANTOR CABANG UTAMA ${meta.origin.toUpperCase()}`, { font: { name: 'Arial', size: 10, bold: true }, alignment: { horizontal: 'center' } });

    const inputs = [
      ['1. NAMA PELANGGAN', meta.customer, ''],
      ['2. JENIS KIRIMAN (KOMODITI)', meta.commodity, ''],
      ['3. TUJUAN KIRIMAN', meta.destination.toUpperCase(), ''],
      ['4. JENIS LAYANAN', 'FREIGHT FORWARDING', ''],
      ['5. ALAT TRANSPORTASI', `${meta.mode} - POLA OPTIMALISASI`, ''],
      ['6. NILAI PROYEK', model.projectValue, ''],
      ['7. NILAI BARANG', 0, ''],
      ['8. VOLUME PROYEK', model.totalWeight, 'Kg'],
      ['', model.packages.reduce((sum, item) => sum + (item.p * item.l * item.t / 1000000), 0), 'M³'],
      ['9. PERIODE PELAKSANAAN', `${formatIndonesianDate(meta.startDate)} - ${formatIndonesianDate(meta.endDate)}`, ''],
      ['10. TERMIN WAKTU PEMBAYARAN', 30, 'Hari']
    ];
    inputs.forEach((item, index) => {
      const row = 7 + index;
      mergeAndSet(sheet, `D${row}:E${row}`, item[0]);
      sheet.getCell(`F${row}`).value = ':';
      sheet.getCell(`G${row}`).value = item[1];
      sheet.getCell(`H${row}`).value = item[2] || null;
      styleRange(sheet, `D${row}:H${row}`, { font: { name: 'Arial', size: 9 }, alignment: { vertical: 'middle', wrapText: true } });
    });
    formula(sheet.getCell('G12'), 'Perhitungan!F2', model.projectValue);
    sheet.getCell('G12').numFmt = moneyFormat;
    sheet.getCell('G13').numFmt = moneyFormat;
    sheet.getCell('G14').numFmt = '0.00';
    sheet.getCell('G15').numFmt = '0.00';
    styleRange(sheet, 'D17:H17', { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } } });

    sheet.getCell('D19').value = 'NO';
    sheet.getCell('E19').value = 'URAIAN';
    mergeAndSet(sheet, 'F19:G19', 'BSU');
    sheet.getCell('H19').value = 'KET';
    styleRange(sheet, 'D19:H19', { border: thinBorder, font: { name: 'Arial', size: 9, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' } });

    const rows = {
      21: ['1', 'PENDAPATAN'], 22: ['2', 'PPN'], 23: ['3', 'REIMBURSEMENT'], 24: ['4', 'NILAI PROYEK'],
      26: ['5', 'BIAYA'], 27: ['', 'BIAYA LANGSUNG:'], 28: ['', 'A. BIAYA TRANSPORTASI'], 29: ['', 'B. BIAYA PRAPOSTING'],
      30: ['', 'C. BIAYA ASURANSI NILAI BARANG'], 31: ['', 'D. BIAYA ADMINISTRASI DAN UMUM'], 32: ['', 'E. BIAYA SDM'],
      33: ['', 'JUMLAH BIAYA LANGSUNG'], 35: ['', 'REIMBURSEMENT BIAYA'], 37: ['', 'BIAYA TAK LANGSUNG:'],
      38: ['', 'A. OVER HEAD'], 39: ['', 'B. COST OF FUND'], 40: ['', 'C. ASURANSI TIDAK LANGSUNG'],
      41: ['', 'D. BIAYA OPTIMALISASI'], 42: ['', 'JUMLAH BIAYA TAK LANGSUNG'], 44: ['', 'TOTAL BIAYA'],
      46: ['6', 'LABA'], 47: ['7', 'PROFIT MARGIN (%)']
    };
    Object.entries(rows).forEach(([rowText, values]) => {
      const row = Number(rowText);
      sheet.getCell(`D${row}`).value = values[0] || null;
      sheet.getCell(`E${row}`).value = values[1];
      mergeAndSet(sheet, `F${row}:G${row}`, null);
      styleRange(sheet, `D${row}:H${row}`, { border: thinBorder, font: { name: 'Arial', size: 9 }, alignment: { vertical: 'middle' } });
    });
    formula(sheet.getCell('F21'), 'Perhitungan!G2', model.dpp);
    formula(sheet.getCell('F22'), 'Perhitungan!H2', model.ppn);
    sheet.getCell('F23').value = 0;
    formula(sheet.getCell('F24'), 'SUM(F21:F23)', model.projectValue);
    sheet.getCell('F28').value = 0;
    sheet.getCell('F29').value = 0;
    sheet.getCell('F30').value = 0;
    formula(sheet.getCell('F31'), 'Perhitungan!L2', model.directCost);
    sheet.getCell('F32').value = 0;
    formula(sheet.getCell('F33'), 'SUM(F28:F32)', model.directCost);
    sheet.getCell('F35').value = 0;
    formula(sheet.getCell('F38'), 'Perhitungan!N2', model.packages.reduce((sum, item) => sum + item.overhead, 0));
    formula(sheet.getCell('F39'), 'Perhitungan!O2', model.packages.reduce((sum, item) => sum + item.cof, 0));
    sheet.getCell('F40').value = 0;
    formula(sheet.getCell('F41'), 'Perhitungan!M2', model.packages.reduce((sum, item) => sum + item.optimization, 0));
    formula(sheet.getCell('F42'), 'SUM(F38:F41)', model.baseTotal);
    formula(sheet.getCell('F44'), 'F33+F42', model.totalCost);
    formula(sheet.getCell('F46'), 'F21-F44', model.profit);
    formula(sheet.getCell('F47'), 'F46/F21', model.actualMargin / 100);
    for (const row of [21,22,23,24,28,29,30,31,32,33,35,38,39,40,41,42,44,46]) sheet.getCell(`F${row}`).numFmt = moneyFormat;
    sheet.getCell('F47').numFmt = '0.00%';
    styleRange(sheet, 'E27:H27', { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.yellow } }, font: { name: 'Arial', size: 9, bold: true } });
    styleRange(sheet, 'E33:G33', { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.yellow } }, font: { name: 'Arial', size: 9, bold: true } });
    styleRange(sheet, 'D44:H44', { font: { name: 'Arial', size: 9, bold: true } });
    styleRange(sheet, 'D46:H47', { font: { name: 'Arial', size: 9, bold: true } });

    sheet.getCell('H50').value = `${meta.origin}, ${formatIndonesianDate(new Date())}`;
    sheet.getCell('E51').value = 'Divalidasi Oleh:';
    sheet.getCell('G51').value = 'Divalidasi Oleh:';
    sheet.getCell('H51').value = 'Dibuat Oleh:';
    sheet.getCell('E52').value = 'EGM';
    sheet.getCell('G52').value = 'Deputy EGM';
    sheet.getCell('H52').value = 'Manajer Penjualan';
    sheet.getCell('E56').value = 'Khresna Adi Nugraha';
    sheet.getCell('G56').value = 'Def Afuww Wildan Everest';
    sheet.getCell('H56').value = 'Ikhsan Radiansyah';
    sheet.getCell('E57').value = 'Nippos: 986393010';
    sheet.getCell('G57').value = 'Nippos: 994480234';
    sheet.getCell('H57').value = 'Nippos: 995480412';
    sheet.getCell('E60').value = 'Ditetapkan oleh';
    sheet.getCell('G60').value = 'Divalidasi oleh';
    sheet.getCell('H60').value = 'Divalidasi oleh';
    sheet.getCell('E61').value = 'EVP Regional 1';
    sheet.getCell('G61').value = 'DEVP Reg 1 Medan';
    sheet.getCell('H61').value = 'DOVP Reg 1 Medan';
    sheet.getCell('E64').value = 'Raden Bagus Muhammad Yusuf';
    sheet.getCell('E65').value = 'Nippos: 973343140';
    styleRange(sheet, 'D50:H65', { font: { name: 'Arial', size: 8 }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } });
    sheet.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9, printArea: 'D1:H65' };
    return sheet;
  }

  function directCostTarget(name) {
    const text = safeText(name).toLowerCase();
    const map = [
      [/standar|layanan/, 6], [/proses|processing/, 7], [/pesawat|udara/, 8], [/sewa|kendaraan|armada/, 9],
      [/bbm|bahan bakar|pelumas/, 10], [/pajak|retribusi/, 11], [/cetak|formulir|register/, 12], [/pemasaran/, 13],
      [/alat tulis|atk/, 17], [/perlengkapan kantor/, 18], [/foto ?copy/, 19], [/telepon|fax|telegram/, 22],
      [/makan|lembur/, 23], [/perjalanan dinas/, 24], [/rapat/, 25], [/pengawasan|pemeriksaan/, 26],
      [/kesehatan|k-?3|keselamatan/, 27], [/klaim.*surat|suratpos/, 28], [/klaim.*logistik/, 29], [/klaim/, 30]
    ];
    return map.find(([pattern]) => pattern.test(text))?.[1] || 14;
  }

  function addDirectCostSheet(workbook, model, meta) {
    const sheet = workbook.addWorksheet('Rincian Biaya Fix');
    sheet.views = [{ showGridLines: false }];
    sheet.columns = [{ width: 18 }, { width: 48 }, { width: 22 }];
    mergeAndSet(sheet, 'A1:C1', 'Form CBA 2 (Rincian Biaya Langsung)', { font: { name: 'Arial', size: 13, bold: true }, alignment: { horizontal: 'center' } });
    sheet.getCell('A2').value = 'ID Project';
    mergeAndSet(sheet, 'B2:C2', null);
    sheet.getCell('B2').value = { formula: "'NEW SOW'!D3", result: meta.projectId };
    ['A2', 'B2', 'C2'].forEach(address => { sheet.getCell(address).font = { name: 'Arial', size: 9, bold: address === 'A2' }; });
    sheet.addRow([]);
    sheet.getRow(4).values = ['Kode Rekening', 'Uraian', 'BSU Biaya'];
    styleRange(sheet, 'A4:C4', { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lime } }, border: thinBorder, font: { name: 'Arial', size: 9, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' } });
    mergeAndSet(sheet, 'A5:C5', 'Beban Operasi', { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.yellow } }, border: thinBorder, font: { name: 'Arial', size: 9, bold: true }, alignment: { horizontal: 'center' } });
    const accounts = {
      6: ['5102010301', 'Standar Layanan'], 7: ['5102020209', 'Beban Pemrosesan Kiriman LN Lainnya'], 8: ['5102030201', 'Pesawat Udara Luar Negeri'],
      9: ['5102050002', 'Sewa Kendaraan Roda 4 dan 6'], 10: ['5102050004', 'Bahan Bakar Minyak dan Pelumas'], 11: ['5102050005', 'Pajak dan Retribusi'],
      12: ['5102060008', 'Pencetakan Model-Model, Formulir, Register'], 13: ['5102080001', 'Pemasaran Surat Pos dan Paket Pos'], 14: ['', 'Beban Operasi Lainnya'],
      17: ['5103010001', 'Alat Tulis Menulis'], 18: ['5103010002', 'Perlengkapan Kantor'], 19: ['5103010003', 'Pemakaian Fotocopy'],
      22: ['5104010002', 'Pemakaian Telepon/Telegram/Fax'], 23: ['5104020001', 'Uang makan dan Lembur'], 24: ['5104030001', 'Perjalanan Dinas Dalam Negeri'],
      25: ['5104040002', 'Penyelenggaraan Rapat'], 26: ['5104050002', 'Pengawasan/Pemeriksaan'], 27: ['5104060001', 'Keselamatan dan Kesehatan Kerja (K-3)'],
      28: ['5104110001', 'Beban Klaim Jasa Suratpos / Paketpos'], 29: ['5104110002', 'Beban Klaim Jasa Logistik'], 30: ['5104110099', 'Beban Klaim Jasa Lainnya']
    };
    Object.entries(accounts).forEach(([rowText, values]) => {
      const row = Number(rowText);
      sheet.getCell(row, 1).value = values[0];
      sheet.getCell(row, 2).value = values[1];
      sheet.getCell(row, 3).value = null;
      styleRange(sheet, `A${row}:C${row}`, { border: thinBorder, font: { name: 'Arial', size: 9 } });
    });
    const targetRow = directCostTarget(meta.directCostName);
    if (targetRow === 14 && meta.directCostName) sheet.getCell('B14').value = meta.directCostName;
    sheet.getCell(targetRow, 3).value = model.directCost;
    sheet.getCell(targetRow, 3).numFmt = moneyFormat;
    sheet.getCell('A15').value = 'Jumlah Beban Operasi';
    sheet.mergeCells('A15:B15');
    formula(sheet.getCell('C15'), 'SUM(C6:C14)', targetRow <= 14 ? model.directCost : 0);
    mergeAndSet(sheet, 'A16:C16', 'Beban Administrasi', { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.yellow } }, border: thinBorder, font: { name: 'Arial', size: 9, bold: true }, alignment: { horizontal: 'center' } });
    sheet.getCell('A20').value = 'Jumlah Beban Administrasi';
    sheet.mergeCells('A20:B20');
    formula(sheet.getCell('C20'), 'SUM(C17:C19)', targetRow >= 17 && targetRow <= 19 ? model.directCost : 0);
    mergeAndSet(sheet, 'A21:C21', 'Beban Umum', { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.yellow } }, border: thinBorder, font: { name: 'Arial', size: 9, bold: true }, alignment: { horizontal: 'center' } });
    sheet.getCell('A31').value = 'Jumlah Beban Umum';
    sheet.mergeCells('A31:B31');
    formula(sheet.getCell('C31'), 'SUM(C22:C30)', targetRow >= 22 ? model.directCost : 0);
    sheet.getCell('A32').value = 'Total Biaya Langsung (Beban Operasi + Beban Administrasi + Beban Umum)';
    sheet.mergeCells('A32:B32');
    formula(sheet.getCell('C32'), 'SUM(C15,C20,C31)', model.directCost);
    for (const row of [15,20,31,32]) {
      styleRange(sheet, `A${row}:C${row}`, { border: thinBorder, font: { name: 'Arial', size: 9, bold: true } });
      sheet.getCell(row, 3).numFmt = moneyFormat;
    }
    sheet.getCell('C34').value = `${meta.origin}, ${formatIndonesianDate(new Date())}`;
    sheet.getCell('A35').value = 'Divalidasi oleh:';
    sheet.getCell('B35').value = 'Divalidasi oleh:';
    sheet.getCell('C35').value = 'Dibuat Oleh:';
    sheet.getCell('A36').value = 'Executive General Manager';
    sheet.getCell('B36').value = 'Deputy EGM';
    sheet.getCell('C36').value = 'Manajer Penjualan';
    sheet.getCell('A40').value = 'Khresna Adi Nugraha';
    sheet.getCell('B40').value = 'Def Afuww Wildan Everest';
    sheet.getCell('C40').value = 'Ikhsan Radiansyah';
    sheet.getCell('A41').value = 'Nippos: 986393010';
    sheet.getCell('B41').value = 'Nippos: 994480234';
    sheet.getCell('C41').value = 'Nippos: 995480412';
    sheet.getCell('A43').value = 'Ditetapkan oleh';
    sheet.getCell('B43').value = 'Divalidasi oleh';
    sheet.getCell('C43').value = 'Divalidasi oleh';
    sheet.getCell('A44').value = 'EVP Regional 1';
    sheet.getCell('B44').value = 'DEVP Reg 1 Medan';
    sheet.getCell('C44').value = 'DOVP Reg 1 Medan';
    sheet.getCell('A47').value = 'Raden Bagus Muhammad Yusuf';
    sheet.getCell('A48').value = 'Nippos: 973343140';
    styleRange(sheet, 'A34:C48', { font: { name: 'Arial', size: 8 }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } });
    sheet.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9, printArea: 'A1:C48' };
    return sheet;
  }

  function addSowSheet(workbook, model, meta, diagramDataUrl) {
    const sheet = workbook.addWorksheet('NEW SOW');
    sheet.views = [{ showGridLines: false }];
    sheet.columns = [
      { width: 3 }, { width: 30 }, { width: 3 }, { width: 28 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }
    ];
    mergeAndSet(sheet, 'B2:H2', 'SCOPE OF WORK', { border: thinBorder, font: { name: 'Arial', size: 18, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' } });
    sheet.getRow(2).height = 46;
    sheet.getCell('B3').value = 'ID Dan Judul Proyek';
    sheet.getCell('C3').value = ':';
    mergeAndSet(sheet, 'D3:H3', meta.projectId);
    styleRange(sheet, 'B3:H3', { border: thinBorder, font: { name: 'Arial', size: 9, bold: true }, alignment: { vertical: 'middle', wrapText: true } });
    sectionBar(sheet, 'B5:H5', '1.1 Client and Project Information');

    const left = [
      [6, 'Nama Mitra:', 7, meta.customer], [8, 'Nama PIC:', 9, meta.customer], [10, 'Alamat Mitra:', 11, meta.pickupAddress],
      [12, 'No Telp dan No Hp:', 13, meta.phone || '-'], [14, 'E-Mail:', 15, meta.email || '-'], [16, 'Penjelasan Pola Operasi:', null, null]
    ];
    left.forEach(([labelRow, label, valueRow, value]) => {
      mergeAndSet(sheet, `B${labelRow}:D${labelRow}`, label, { border: thinBorder, font: { name: 'Arial', size: 9, bold: true } });
      if (valueRow) mergeAndSet(sheet, `B${valueRow}:D${valueRow}`, value, { border: thinBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.yellow } }, font: { name: 'Arial', size: 9 }, alignment: { vertical: 'middle', wrapText: true } });
    });
    sheet.getRow(11).height = 38;
    const patternText = [
      `1. Kiriman ${meta.commodity} dijemput di alamat ${meta.customer}. Petugas Pos menerima dan memeriksa packing list kiriman.`,
      `2. Kiriman dicatat, diverifikasi, ditimbang, dan diproses di Kantor Pos ${meta.origin}.`,
      `3. Kiriman diberangkatkan melalui ${model.routes.map(route => `${route.moda} ${placeName(route.origin)} ke ${placeName(route.dest)}`).join(', ')} dengan pola optimalisasi jaringan Pos Indonesia.`,
      `4. Kiriman didistribusikan ke ${meta.destination} dan diserahterimakan di alamat tujuan.`
    ].join('\n');
    mergeAndSet(sheet, 'B17:D19', patternText, { border: thinBorder, font: { name: 'Arial', size: 9 }, alignment: { vertical: 'top', wrapText: true } });
    [17,18,19].forEach(row => { sheet.getRow(row).height = 34; });

    mergeAndSet(sheet, 'E6:H6', 'Project Location', { border: thinBorder, font: { name: 'Arial', size: 9, bold: true } });
    mergeAndSet(sheet, 'E7:H7', meta.origin.toUpperCase(), { border: thinBorder, font: { name: 'Arial', size: 9 } });
    mergeAndSet(sheet, 'E8:H8', 'REGIONAL/KCU/KC Penanggung Jawab:', { border: thinBorder, font: { name: 'Arial', size: 9, bold: true } });
    mergeAndSet(sheet, 'E9:H9', `KCU ${meta.origin}`, { border: thinBorder, font: { name: 'Arial', size: 9 } });
    mergeAndSet(sheet, 'E10:H10', 'Nama PIC / Jabatan / CP:', { border: thinBorder, font: { name: 'Arial', size: 9, bold: true } });
    mergeAndSet(sheet, 'E11:H11', 'Manajer Kurlog', { border: thinBorder, font: { name: 'Arial', size: 9 } });
    mergeAndSet(sheet, 'E12:H12', 'GAMBAR POLA OPERASI', { border: thinBorder, font: { name: 'Arial', size: 9, bold: true }, alignment: { horizontal: 'center' } });
    styleRange(sheet, 'E13:H19', { border: thinBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.paleBlue } } });
    const diagramId = workbook.addImage({ base64: diagramDataUrl, extension: 'png' });
    sheet.addImage(diagramId, { tl: { col: 4.08, row: 12.08 }, ext: { width: 600, height: 227 }, editAs: 'oneCell' });
    [13,14,15,16].forEach(row => { sheet.getRow(row).height = 20; });

    sectionBar(sheet, 'B20:H20', '1.2 Project Detail / Detail Proyek');
    const representative = model.packages.reduce((best, item) => !best || item.vol > best.vol ? item : best, null);
    const detailRows = [
      [21, 'Origin (Asal Kiriman)', meta.origin, 'Nama Origin', `${meta.customer} / ${meta.pickupAddress}`],
      [22, 'Destinasi (Tujuan Kiriman)', meta.destination, 'Nama Destinasi', `${meta.customer} / ${meta.dropoffAddress}`],
      [23, 'Jenis Cargo (General/Special/Dangerous Good) dan Nama Cargo', `General Cargo: ${meta.mode}`, '', ''],
      [24, 'Bentuk Kiriman', `Kiriman ${meta.commodity}`, '', ''], [25, 'Tujuan Proyek', meta.commodity, '', ''],
      [26, 'Frekuensi Pelaksanaan', 'Sekali dalam Masa Proyek', '', ''], [27, 'Berat Kiriman (per koli)', representative?.actual || representative?.cw || 0, 'Total berat', model.totalWeight],
      [28, 'Dimensi Per koli (cm)', `P${representative?.p || 0} × L${representative?.l || 0} × T${representative?.t || 0} cm`, '', ''],
      [29, 'Jumlah Koli', `${model.packages.length} Koli`, '', ''], [30, 'Estimasi trip', '14 Hari', '', ''], [31, 'Pola Operasi', 'Door to Door', '', ''],
      [32, 'Jenis Layanan (FTL/LTL)', 'Door to Door', '', ''], [33, 'Jenis Kendaraan', 'Optimalisasi', '', '']
    ];
    detailRows.forEach(([row, label, value, rightLabel, rightValue]) => {
      sheet.getCell(row, 2).value = label;
      sheet.getCell(row, 3).value = ':';
      sheet.getCell(row, 4).value = value;
      if (rightLabel) sheet.getCell(row, 5).value = rightLabel;
      if (rightLabel) sheet.getCell(row, 6).value = '=';
      if (rightValue !== '') { sheet.mergeCells(row, 7, row, 8); sheet.getCell(row, 7).value = rightValue; }
      styleRange(sheet, `B${row}:H${row}`, { border: thinBorder, font: { name: 'Arial', size: 9 }, alignment: { vertical: 'middle', wrapText: true } });
      sheet.getCell(row, 2).font = { name: 'Arial', size: 9, bold: true };
    });
    sheet.getRow(21).height = 34;
    sheet.getRow(22).height = 48;
    sheet.getCell('H27').numFmt = '0.00';

    sectionBar(sheet, 'B34:H34', '1.3 Vendor Selection Process/Proses Pemilihan Vendor');
    sheet.mergeCells('B35:B41');
    sheet.getCell('B35').value = 'Syarat mitra penyedia jasa';
    sheet.mergeCells('C35:C41');
    sheet.getCell('C35').value = ':';
    const vendorRules = [
      'Kendaraan vendor harus sesuai jenis kargo, aman, dan mampu mengakomodasi kiriman.',
      '1. Memiliki dokumen legalitas perusahaan, SIUP, SITU/Keterangan Domisili, TDP, SPKP, NIB, dan NPWP.',
      '2. Memiliki armada dan jaringan layanan sesuai kebutuhan customer.',
      '3. Memiliki kecakapan, pengalaman, kemampuan teknis, manajerial, dan kewenangan untuk melakukan perjanjian.',
      '4. Memiliki sumber daya manusia, modal, dan infrastruktur yang diperlukan.',
      '5. Tidak dalam pengawasan pengadilan, tidak pailit, dan kegiatan usaha tidak sedang dihentikan.',
      '6. Mampu bekerja sesuai SLA yang disepakati.'
    ];
    vendorRules.forEach((text, index) => { mergeAndSet(sheet, `D${35 + index}:H${35 + index}`, text); });
    styleRange(sheet, 'B35:H41', { border: thinBorder, font: { name: 'Arial', size: 8 }, alignment: { vertical: 'middle', wrapText: true } });
    sheet.getCell('B35').font = { name: 'Arial', size: 9, bold: true };
    [['Vendor Terpilih','Menggunakan Pola Optimalisasi'],['Nomor Induk Berusaha (NIB)','Menggunakan Pola Optimalisasi'],['Nomor NPWP','Menggunakan Pola Optimalisasi'],['Company Profil Vendor','Menggunakan Pola Optimalisasi']].forEach((item, index) => {
      const row = 42 + index;
      sheet.getCell(row, 2).value = item[0]; sheet.getCell(row, 3).value = ':'; mergeAndSet(sheet, `D${row}:H${row}`, item[1]);
      styleRange(sheet, `B${row}:H${row}`, { border: thinBorder, font: { name: 'Arial', size: 9 }, alignment: { vertical: 'middle' } });
      sheet.getCell(row, 2).font = { name: 'Arial', size: 9, bold: true };
    });

    sectionBar(sheet, 'B46:H46', '1.4 Design Work Completed to date (or) required/Pekerjaan Dinyatakan Selesai');
    const completion = [
      '1. Seluruh muatan sudah diantar ke lokasi tujuan yang telah ditetapkan.',
      '2. Invoice dilakukan setelah pekerjaan selesai dan dilampiri Berita Acara Serah Terima.',
      '3. Teknis pekerjaan mengacu pada SPK.',
      '4. Customer, PT Pos, ataupun vendor tidak diperkenankan membatalkan SPK secara sepihak.',
      '5. Jatuh tempo customer maksimal 30 hari setelah tagihan lengkap diterima.'
    ];
    completion.forEach((text, index) => { mergeAndSet(sheet, `B${47 + index}:H${47 + index}`, text, { border: thinBorder, font: { name: 'Arial', size: 9 } }); });
    sectionBar(sheet, 'B53:H53', '1.5 Timeline of Project/Waktu Pelaksanaan Proyek');
    mergeAndSet(sheet, 'B54:D54', 'Start Work Date/Tanggal Mulai:', { border: thinBorder, font: { name: 'Arial', size: 9 }, alignment: { horizontal: 'center' } });
    mergeAndSet(sheet, 'E54:H54', 'End Work Date/Tanggal Akhir:', { border: thinBorder, font: { name: 'Arial', size: 9 }, alignment: { horizontal: 'center' } });
    mergeAndSet(sheet, 'B55:D55', meta.startDate, { border: thinBorder, font: { name: 'Arial', size: 10, bold: true }, alignment: { horizontal: 'center' } });
    mergeAndSet(sheet, 'E55:H55', meta.endDate, { border: thinBorder, font: { name: 'Arial', size: 10, bold: true }, alignment: { horizontal: 'center' } });
    sheet.getCell('B55').numFmt = 'dd-mmm-yy';
    sheet.getCell('E55').numFmt = 'dd-mmm-yy';
    sectionBar(sheet, 'B56:H56', '1.6 Approval Requirements/Persyaratan Persetujuan');
    const approvals = [
      'Armada angkut harus layak jalan, sesuai kondisi muatan, memenuhi ketentuan keselamatan, dan memiliki dokumen lengkap.',
      'Driver memiliki KTP, SIM yang sesuai, nomor HP, dan dalam keadaan sehat.',
      'Kiriman dipacking sesuai standar dan dijaga aman serta tidak basah selama perjalanan.',
      'Truck dilengkapi lashing/sling belt dan peralatan pendukung yang diperlukan.',
      'Melaksanakan ketentuan safety K3.',
      'Melakukan pengawasan pemuatan dan pembongkaran untuk mengurangi risiko kerusakan.',
      'Menginformasikan progres, mendokumentasikan pekerjaan, dan bertanggung jawab atas keamanan kiriman.'
    ];
    approvals.forEach((text, index) => { mergeAndSet(sheet, `B${57 + index}:H${57 + index}`, text, { border: thinBorder, font: { name: 'Arial', size: 8 }, alignment: { vertical: 'middle', wrapText: true } }); });
    sectionBar(sheet, 'B65:H65', '1.7 Additional Requirements and/or Conditions/Persyaratan dan/atau Ketentuan Tambahan');
    mergeAndSet(sheet, 'B66:H67', '', { border: thinBorder });
    mergeAndSet(sheet, 'E69:H69', `${meta.origin}, ${formatIndonesianDate(new Date())}`, { font: { name: 'Arial', size: 9 }, alignment: { horizontal: 'center' } });
    mergeAndSet(sheet, 'E70:H70', 'Diajukan Oleh,', { font: { name: 'Arial', size: 9 }, alignment: { horizontal: 'center' } });
    mergeAndSet(sheet, 'E71:H71', 'Executive General Manager', { font: { name: 'Arial', size: 9 }, alignment: { horizontal: 'center' } });
    mergeAndSet(sheet, 'E72:H72', `KCU ${meta.origin}`, { font: { name: 'Arial', size: 9 }, alignment: { horizontal: 'center' } });
    mergeAndSet(sheet, 'E75:H75', 'Khresna Adi Nugraha', { font: { name: 'Arial', size: 9, underline: true }, alignment: { horizontal: 'center' } });
    mergeAndSet(sheet, 'E76:H76', 'Nippos: 986393010', { font: { name: 'Arial', size: 9 }, alignment: { horizontal: 'center' } });
    sheet.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 2, paperSize: 9, printArea: 'B2:H76' };
    return sheet;
  }

  function prepareMeta(model, formData) {
    const startDate = formData.startDate ? new Date(`${formData.startDate}T00:00:00Z`) : new Date();
    const origin = placeName(model.routes[0]?.origin || 'Origin');
    const destination = placeName(model.destination || model.routes.at(-1)?.dest || 'Destinasi');
    const commodity = model.packages.map(item => item.name).filter(Boolean).join(', ') || 'Paket';
    const customer = safeText(formData.customer);
    return {
      customer,
      pickupAddress: safeText(formData.pickupAddress),
      dropoffAddress: safeText(formData.dropoffAddress),
      phone: safeText(formData.phone),
      email: safeText(formData.email),
      startDate,
      endDate: addDays(startDate, 13),
      origin,
      destination,
      commodity,
      mode: safeText(document.querySelector('input[name="modaUtama"]:checked')?.value || model.routes[0]?.moda || 'DARAT'),
      directCostName: safeText(document.querySelector('#inputNamaBL')?.value || 'Beban Operasi Lainnya'),
      projectId: `${commodity} ${destination} ${customer}`.toUpperCase().replace(/\s+/g, ' ').trim()
    };
  }

  async function download(model, formData) {
    if (!model?.valid) throw new Error('Kalkulasi proyek belum lengkap.');
    const meta = prepareMeta(model, formData);
    if (!meta.customer || !meta.pickupAddress || !meta.dropoffAddress) throw new Error('Nama pelanggan, alamat penjemputan, dan alamat tujuan wajib diisi.');
    const workbook = baseWorkbook();
    addOptimizationSheets(workbook, model);
    addCbaSheet(workbook, model, meta);
    addDirectCostSheet(workbook, model, meta);
    const diagram = createOperationDiagram(model, meta);
    addSowSheet(workbook, model, meta, diagram);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `CBA_Optimalisasi_${cleanFilePart(meta.destination)}_${cleanFilePart(meta.customer)}.xlsx`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return filename;
  }

  window.PosNewCba = { download, createOperationDiagram };
})();
