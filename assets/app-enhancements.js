(() => {
  'use strict';
  const STORAGE_KEY = 'posnew_optimize_scenarios_v5';
  const LAST_STATE_KEY = 'posnew_optimize_last_state_v5';
  let latestModel = null;
  let deleteArmed = false;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const rupiah = n => Number.isFinite(n) ? `Rp${new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Math.round(n))}` : '—';
  const number = (n, digits=0) => Number.isFinite(n) ? new Intl.NumberFormat('id-ID',{maximumFractionDigits:digits}).format(n) : '—';
  const escapeHtml = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function toast(message, type='info') {
    let region = $('#toastRegion');
    if (!region) {
      region = document.createElement('div'); region.id='toastRegion'; region.setAttribute('aria-live','polite'); document.body.appendChild(region);
    }
    const item = document.createElement('div'); item.className=`toast ${type}`; item.textContent=message; region.appendChild(item);
    setTimeout(() => item.remove(), 3400);
  }
  window.showToast = toast;
  window.alert = (message) => toast(String(message), /gagal|error|harus|pilih|isi/i.test(String(message)) ? 'error' : 'info');

  function mountLayout() {
    const main = $('#appMain'); if (!main || $('.workspace-shell')) return;
    const loading = $('#loadingStatus');
    const intro = document.createElement('section');
    intro.className='app-intro';
    intro.innerHTML=`<div><h2>Analisis proyek logistik, lebih cepat dan terukur.</h2><p>Susun paket dan rute, tinjau struktur biaya, lalu lihat nilai proyek per kilogram dengan dasar <strong>chargeable weight</strong>.</p></div><div class="progress-strip" aria-label="Tahapan analisis"><span class="progress-chip"><strong>1</strong>Parameter</span><span class="progress-chip"><strong>2</strong>Rute</span><span class="progress-chip"><strong>3</strong>Biaya</span><span class="progress-chip"><strong>4</strong>Hasil</span></div>`;
    loading.insertAdjacentElement('beforebegin', intro);

    const result = $('#hasil-container');
    const sections = $$(':scope > section', main).filter(x => x !== intro && x !== result);
    const action = $('#btnHitung')?.parentElement;
    const shell = document.createElement('div'); shell.className='workspace-shell';
    const form = document.createElement('div'); form.className='workspace-form';
    sections.forEach(s => form.appendChild(s));
    if (action) { action.className='primary-action-bar'; action.insertAdjacentHTML('afterbegin','<p>Hasil dihitung dengan formula bisnis yang sama dan diperbarui secara lokal di perangkat.</p>'); form.appendChild(action); }
    const summary = document.createElement('aside'); summary.className='workspace-summary'; summary.setAttribute('aria-label','Ringkasan analisis');
    summary.innerHTML = summaryMarkup();
    shell.append(form,summary); result.insertAdjacentElement('beforebegin',shell);
    rebuildResultsShell(result);
    enhanceHeader(); enhanceFooter(); enhanceAccessibility(); bindActions(); renderScenarioOptions(); updateSummary(calculateModel(false));
  }

  function enhanceHeader(){
    const h=$('#appHeader'); if(!h)return;
    h.innerHTML=`<div class="app-brand-lockup"><div class="app-brand-mark" aria-hidden="true">O</div><div class="app-brand-copy"><small>PosNew Hub</small><h1>Optimalisasi Proyek Logistik</h1></div><span class="app-version text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full">v5.1</span></div><div class="header-actions"><span class="header-privacy">🔒 Data diproses di browser</span><button onclick="logoutFirebase()" class="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg font-bold text-sm">Keluar</button></div>`;
  }
  function enhanceFooter(){
    const f=$('#appFooter'); if(!f)return;
    f.innerHTML=`<div class="footer-brand"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4.5 7.5 7.5 4.2 7.5-4.2M12 12v8.2"/></svg><a href="https://posnew.com" target="_blank" rel="noopener noreferrer">PosNew Hub</a></div><p class="footer-desc">Business tools for smarter logistics decisions.</p><a class="footer-creator-badge" href="https://posnew.com/about-me.html" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"/></svg>Created by <strong>Ikhsan Radiansyah</strong> · 2026</a>`;
  }

  function summaryMarkup(){
    return `<section class="summary-card"><div class="summary-heading"><div><h2>Ringkasan Profitabilitas</h2><p>Diperbarui otomatis saat input berubah</p></div><span id="projectStatus" class="status-pill status-empty">Data Belum Lengkap</span></div><div class="kpi-grid"><div class="kpi featured"><div class="kpi-label">Nilai Proyek per Kg</div><div class="kpi-value" id="kpiProjectKg">—</div><div class="kpi-help">Total nilai proyek ÷ total chargeable weight</div></div>${[['kpiProject','Total Nilai Proyek'],['kpiRevenue','Pendapatan (DPP)'],['kpiCost','Total Biaya'],['kpiProfit','Laba / Rugi'],['kpiMargin','Margin'],['kpiWeight','Chargeable Weight'],['kpiRevenueKg','Pendapatan per Kg'],['kpiCostKg','Biaya per Kg'],['kpiProfitKg','Laba per Kg'],['kpiPackages','Jumlah Paket']].map(([id,l])=>`<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-value" id="${id}">—</div></div>`).join('')}</div><ul id="insightList" class="insight-list"><li>Lengkapi parameter proyek untuk melihat insight otomatis.</li></ul><div class="action-grid"><button class="action-primary" id="copySummaryBtn">Salin Ringkasan</button><button id="shareSummaryBtn">Bagikan</button><button id="printBtn">Cetak / PDF</button><button id="exportJsonBtn">Ekspor Data</button><button id="importJsonBtn">Muat Data</button><button class="action-danger" id="resetBtn">Reset</button></div><input id="importFile" class="hidden-file-input" type="file" accept="application/json"></section>
    <section class="scenario-card"><h3>Skenario Lokal</h3><div class="scenario-row"><input id="scenarioName" type="text" maxlength="60" placeholder="Nama skenario, mis. Udara 15%"><select id="scenarioSelect"><option value="">Pilih skenario tersimpan</option></select></div><div class="scenario-actions"><button id="saveScenarioBtn">Simpan</button><button id="duplicateScenarioBtn">Duplikasi</button><button id="loadScenarioBtn">Muat</button><button id="deleteScenarioBtn">Hapus</button><button id="compareScenarioBtn">Bandingkan</button><button id="clearLocalBtn">Hapus Data</button></div><p class="storage-note">Skenario disimpan hanya di localStorage browser ini dan tidak dikirim ke server.</p></section>`;
  }

  function rebuildResultsShell(result){
    if(!result)return;
    result.innerHTML=`<div class="results-head"><div><h2>Hasil Analisis Proyek</h2><p id="labelTujuan"></p><p class="print-meta" id="printMeta"></p></div><div class="results-actions"><button id="copyResultsBtn">Salin</button><button id="printResultsBtn">Cetak / PDF</button><button class="excel" onclick="exportToExcel()">Unduh Excel</button></div></div><div class="results-body"><div class="breakdown-grid"><div class="breakdown-card"><h3>Rincian Perhitungan</h3><div id="breakdownList" class="breakdown-list"></div><p class="formula-note">Basis berat: total chargeable weight. Volumetrik menggunakan pembagi 6.000 untuk udara dan 4.000 untuk darat/laut. Nilai proyek per kg tidak sama dengan biaya per kg.</p></div><div class="comparison-card"><h3>Perbandingan Skenario</h3><div id="comparisonOutput" class="comparison-output">Pilih skenario tersimpan, lalu tekan <strong>Bandingkan</strong> untuk melihat selisih terhadap kondisi saat ini.</div></div></div><div class="print-input-card"><h3>Ringkasan Input</h3><div id="printInputList" class="breakdown-list"></div></div><div class="table-scroll overflow-x-auto"><table class="w-full text-sm text-left text-gray-700 border" id="tableHasil"><thead id="hasilHeaders"></thead><tbody id="tbodyHasil"></tbody><tfoot id="tfootHasil"></tfoot></table></div></div>`;
  }

  function getRoutes(){
    return $$('.rute-baris').map(row=>{
      const id=row.id.split('-')[2], moda=$(`#rute-moda-${id}`)?.value||'', origin=$(`#rute-origin-${id}`)?.value||'';
      const custom=$(`#rute-dest-custom-${id}`), dest=custom?custom.value.toUpperCase():($(`#rute-dest-${id}`)?.value||'');
      const basis=$(`#rute-basis-${id}`)?.value||'KG';
      const tarif=Number($(`#rute-tarif-${id}`)?.dataset.value||0);
      return {id,moda,origin,dest,basis,tarif};
    }).filter(r=>r.tarif>0);
  }

  function calculateModel(requireComplete=true){
    const destination=$('#tujuanAkhirSelect')?.value||'';
    const marginInput=Number($('#inputMargin')?.value||15), margin=marginInput/100;
    const directCost=typeof unformatRupiah==='function'?unformatRupiah($('#inputNominalBL')?.value||'0'):0;
    const routes=getRoutes(); const tertiaryRate=Number($('#tarifTersier')?.dataset.value||0);
    const rows=$$('.paket-row');
    const packages=rows.map((row,i)=>({name:$('.paket-nama',row)?.value||`PAKET ${i+1}`,actual:Number($('.paket-aktual',row)?.value||0),vol:Number($('.paket-vol',row)?.value||0),cw:Number($('.paket-cw',row)?.value||0)}));
    const invalid = !destination || !packages.length || packages.some(p=>p.cw<=0) || routes.length===0 || marginInput>=100 || marginInput<0;
    if(requireComplete && invalid) return {valid:false,destination,marginInput,packages,routes};
    let baseTotal=0;
    const detailed=packages.map(p=>{
      const collecting=1000,processing=1000,routeCosts=routes.map(r=>r.basis==='KOLI'?r.tarif*Math.ceil(p.cw/30):r.tarif*p.cw),tertiary=tertiaryRate*p.cw,delivery=2875*p.cw;
      const optimization=collecting+processing+routeCosts.reduce((a,b)=>a+b,0)+tertiary+delivery,overhead=optimization*.05,cof=optimization*30/365*.08,baseCost=optimization+overhead+cof;baseTotal+=baseCost;
      return {...p,collecting,processing,routeCosts,tertiary,delivery,optimization,overhead,cof,baseCost};
    });
    const totalWeight=packages.reduce((s,p)=>s+p.cw,0),totalCost=baseTotal+directCost,dpp=(margin<1?totalCost/(1-margin):NaN),projectValue=dpp*1.011,ppn=dpp*.011,profit=dpp-totalCost,actualMargin=dpp>0?profit/dpp*100:0;
    detailed.forEach(p=>{const ratio=baseTotal>0?p.baseCost/baseTotal:1/detailed.length;p.directCost=directCost*ratio;p.totalCost=p.baseCost+p.directCost;p.dpp=dpp*ratio;p.projectValue=p.dpp*1.011;p.ppn=p.dpp*.011;p.profit=p.dpp-p.totalCost;p.margin=p.dpp>0?p.profit/p.dpp*100:0;});
    const safeDiv=n=>totalWeight>0?n/totalWeight:NaN;
    const components=[['Biaya langsung',directCost],['Rute utama & lanjutan',detailed.reduce((s,p)=>s+p.routeCosts.reduce((a,b)=>a+b,0),0)],['Delivery',detailed.reduce((s,p)=>s+p.delivery,0)],['Tersier',detailed.reduce((s,p)=>s+p.tertiary,0)],['Collecting & processing',detailed.reduce((s,p)=>s+p.collecting+p.processing,0)],['Overhead',detailed.reduce((s,p)=>s+p.overhead,0)],['Cost of fund',detailed.reduce((s,p)=>s+p.cof,0)]].sort((a,b)=>b[1]-a[1]);
    const status=invalid?'empty':profit<0?'bad':actualMargin<10?'warn':'good';
    return {valid:!invalid,destination,marginInput,margin,packages:detailed,routes,tertiaryRate,directCost,totalWeight,baseTotal,totalCost,dpp,projectValue,ppn,profit,actualMargin,projectKg:safeDiv(projectValue),revenueKg:safeDiv(dpp),costKg:safeDiv(totalCost),profitKg:safeDiv(profit),components,status,pph:$('#checkPajakBL')?.checked?directCost*.02:0};
  }

  function updateSummary(model){
    latestModel=model;
    const set=(id,v)=>{const el=$(`#${id}`);if(el)el.textContent=v};
    const complete=model && model.valid && Number.isFinite(model.dpp);
    set('kpiProjectKg',complete?`${rupiah(model.projectKg)}/kg`:'—');set('kpiProject',complete?rupiah(model.projectValue):'—');set('kpiRevenue',complete?rupiah(model.dpp):'—');set('kpiCost',complete?rupiah(model.totalCost):'—');set('kpiProfit',complete?rupiah(model.profit):'—');set('kpiMargin',complete?`${number(model.actualMargin,2)}%`:'—');set('kpiWeight',model?.totalWeight>0?`${number(model.totalWeight,2)} kg`:'—');set('kpiRevenueKg',complete?`${rupiah(model.revenueKg)}/kg`:'—');set('kpiCostKg',complete?`${rupiah(model.costKg)}/kg`:'—');set('kpiProfitKg',complete?`${rupiah(model.profitKg)}/kg`:'—');set('kpiPackages',model?.packages?.length?`${model.packages.length} paket`:'—');
    const status=$('#projectStatus'); if(status){const map={empty:['Data Belum Lengkap','status-empty'],good:['Menguntungkan','status-good'],warn:['Margin Tipis','status-warn'],bad:['Rugi','status-bad']},m=map[model?.status||'empty'];status.textContent=m[0];status.className=`status-pill ${m[1]}`;}
    const insights=$('#insightList'); if(insights){let arr=[];if(!complete)arr=['Lengkapi tujuan, berat paket, rute, dan tarif untuk memperoleh analisis.'];else{arr.push(model.actualMargin>=15?`Margin ${number(model.actualMargin,2)}% berada pada tingkat yang sehat.`:model.actualMargin>=10?`Margin ${number(model.actualMargin,2)}% cukup, tetapi masih perlu dijaga.`:`Margin ${number(model.actualMargin,2)}% tergolong tipis.`);if(model.components[0]?.[1]>0)arr.push(`${model.components[0][0]} adalah komponen biaya terbesar (${rupiah(model.components[0][1])}).`);arr.push(`Setiap 1 kg chargeable weight menghasilkan nilai proyek rata-rata ${rupiah(model.projectKg)}.`);if(model.costKg>model.revenueKg)arr.push('Biaya per kg lebih tinggi daripada pendapatan per kg; proyek berada di bawah titik impas.');}insights.innerHTML=arr.map(x=>`<li>${escapeHtml(x)}</li>`).join('');}
  }

  function validateForm(){
    $$('.field-error').forEach(e=>e.classList.remove('field-error'));$$('.field-error-text').forEach(e=>e.remove());let first=null;
    const mark=(el,msg)=>{if(!el)return;el.classList.add('field-error');const s=document.createElement('small');s.className='field-error-text';s.textContent=msg;el.insertAdjacentElement('afterend',s);first ||= el;};
    if(!$('#tujuanAkhirSelect')?.value)mark($('#tujuanAkhirSelect'),'Pilih tujuan akhir.');
    const margin=Number($('#inputMargin')?.value);if(!Number.isFinite(margin)||margin<0||margin>=100)mark($('#inputMargin'),'Margin harus 0% sampai kurang dari 100%.');
    $$('.paket-row').forEach(row=>{const actual=Number($('.paket-aktual',row)?.value||0),p=Number($('.paket-p',row)?.value||0),l=Number($('.paket-l',row)?.value||0),t=Number($('.paket-t',row)?.value||0);if(actual<0||p<0||l<0||t<0)mark($('.paket-aktual',row),'Nilai negatif tidak diperbolehkan.');if(Math.max(actual,p*l*t)<=0)mark($('.paket-aktual',row),'Masukkan berat aktual atau dimensi paket.');});
    if(getRoutes().length===0)mark($('#ruteContainer'),'Pilih rute dan tarif yang valid.');
    if(first){first.scrollIntoView({behavior:'smooth',block:'center'});toast('Periksa field yang ditandai sebelum menghitung.','error');return false;}return true;
  }

  function renderResults(model){
    if(!model?.valid)return;
    const result=$('#hasil-container'); result.classList.remove('hidden');
    $('#labelTujuan').textContent=`Tujuan akhir: ${model.destination} · Basis: ${number(model.totalWeight,2)} kg chargeable weight`;
    $('#printMeta').textContent=`Dibuat ${new Intl.DateTimeFormat('id-ID',{dateStyle:'long',timeStyle:'short'}).format(new Date())}`;
    const routeHeads=model.routes.map(r=>`<th class="px-3 py-3 text-right whitespace-nowrap">${escapeHtml(r.moda)}<br><small>${escapeHtml(r.origin)} → ${escapeHtml(r.dest)}</small></th>`).join('');
    $('#hasilHeaders').className='text-xs text-white uppercase bg-posblue';
    $('#hasilHeaders').innerHTML=`<tr><th class="px-3 py-3">Paket</th><th class="px-3 py-3 text-right">CW (kg)</th><th class="px-3 py-3 text-right">Nilai Proyek</th><th class="px-3 py-3 text-right">DPP</th><th class="px-3 py-3 text-right">PPN</th><th class="px-3 py-3 text-right">Collecting</th><th class="px-3 py-3 text-right">Processing</th>${routeHeads}<th class="px-3 py-3 text-right">Tersier</th><th class="px-3 py-3 text-right">Delivery</th><th class="px-3 py-3 text-right">Overhead</th><th class="px-3 py-3 text-right">COF</th><th class="px-3 py-3 text-right">Biaya Langsung</th><th class="px-3 py-3 text-right">Total Biaya</th><th class="px-3 py-3 text-right">Laba</th><th class="px-3 py-3 text-right">Margin</th></tr>`;
    $('#tbodyHasil').innerHTML=model.packages.map(p=>`<tr><td class="px-3 py-3 font-bold whitespace-nowrap">${escapeHtml(p.name)}</td><td class="px-3 py-3 text-right">${number(p.cw,2)}</td><td class="px-3 py-3 text-right">${rupiah(p.projectValue)}</td><td class="px-3 py-3 text-right">${rupiah(p.dpp)}</td><td class="px-3 py-3 text-right">${rupiah(p.ppn)}</td><td class="px-3 py-3 text-right">${rupiah(p.collecting)}</td><td class="px-3 py-3 text-right">${rupiah(p.processing)}</td>${p.routeCosts.map(x=>`<td class="px-3 py-3 text-right">${rupiah(x)}</td>`).join('')}<td class="px-3 py-3 text-right">${rupiah(p.tertiary)}</td><td class="px-3 py-3 text-right">${rupiah(p.delivery)}</td><td class="px-3 py-3 text-right">${rupiah(p.overhead)}</td><td class="px-3 py-3 text-right">${rupiah(p.cof)}</td><td class="px-3 py-3 text-right">${rupiah(p.directCost)}</td><td class="px-3 py-3 text-right font-bold">${rupiah(p.totalCost)}</td><td class="px-3 py-3 text-right font-bold">${rupiah(p.profit)}</td><td class="px-3 py-3 text-right">${number(p.margin,2)}%</td></tr>`).join('');
    const colspan=7+model.routes.length;
    $('#tfootHasil').className='bg-gray-200 font-bold text-posblue uppercase text-sm';
    $('#tfootHasil').innerHTML=`<tr><td class="px-3 py-4">Grand Total</td><td class="px-3 py-4 text-right">${number(model.totalWeight,2)}</td><td class="px-3 py-4 text-right">${rupiah(model.projectValue)}</td><td class="px-3 py-4 text-right">${rupiah(model.dpp)}</td><td class="px-3 py-4 text-right">${rupiah(model.ppn)}</td><td colspan="${colspan}" class="px-3 py-4 text-right">Total biaya dasar ${rupiah(model.baseTotal)} + biaya langsung ${rupiah(model.directCost)}</td><td class="px-3 py-4 text-right">${rupiah(model.totalCost)}</td><td class="px-3 py-4 text-right">${rupiah(model.profit)}</td><td class="px-3 py-4 text-right">${number(model.actualMargin,2)}%</td></tr>`;
    $('#printInputList').innerHTML=[['Tujuan akhir',model.destination],['Moda utama',$('input[name=\"modaUtama\"]:checked')?.value||'—'],['Jumlah paket',`${model.packages.length} paket`],['Paket',model.packages.map(p=>`${p.name} (${number(p.cw,2)} kg)`).join(', ')],['Rute',model.routes.map(r=>`${r.moda}: ${r.origin} → ${r.dest} @ ${rupiah(r.tarif)}/${r.basis.toLowerCase()}`).join('; ')],['Tarif tersier',`${rupiah(model.tertiaryRate)}/kg`],['Target margin',`${number(model.marginInput,2)}%`],['Biaya langsung',`${$('#inputNamaBL')?.value||'Biaya langsung'} - ${rupiah(model.directCost)}`]].map(([a,b])=>`<div class=\"breakdown-line\"><span>${escapeHtml(a)}</span><strong>${escapeHtml(b)}</strong></div>`).join('');
    $('#breakdownList').innerHTML=[['Total chargeable weight',`${number(model.totalWeight,2)} kg`],['Total nilai proyek (DPP + PPN)',rupiah(model.projectValue)],['Pendapatan sebelum PPN (DPP)',rupiah(model.dpp)],['PPN 1,1%',rupiah(model.ppn)],['Biaya optimalisasi + overhead + COF',rupiah(model.baseTotal)],['Biaya langsung',rupiah(model.directCost)],['PPh 2% biaya langsung (informasi)',rupiah(model.pph)],['Total biaya',rupiah(model.totalCost)],['Laba / rugi',rupiah(model.profit)],['Margin',`${number(model.actualMargin,2)}%`],['Nilai proyek per kg',`${rupiah(model.projectKg)}/kg`],['Pendapatan per kg',`${rupiah(model.revenueKg)}/kg`],['Biaya per kg',`${rupiah(model.costKg)}/kg`],['Laba per kg',`${rupiah(model.profitKg)}/kg`]].map(([a,b])=>`<div class="breakdown-line"><span>${a}</span><strong>${b}</strong></div>`).join('');
    result.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function runCalculation(){if(!validateForm())return;const model=calculateModel(true);if(!model.valid){toast('Data proyek belum lengkap.','error');return;}latestModel=model;globalRutes=model.routes.map(r=>({nama:`JALUR ${r.moda}: ${r.origin} ➔ ${r.dest}`,tarif:r.tarif,moda:r.moda,basis:r.basis}));globalTersier={nama:`TERSIER KCU: ${model.destination}`,tarif:model.tertiaryRate};updateSummary(model);renderResults(model);saveLastState();toast('Analisis berhasil diperbarui.','success');}

  function serializeState(){return {version:5,savedAt:new Date().toISOString(),destination:$('#tujuanAkhirSelect')?.value||'',mode:$('input[name="modaUtama"]:checked')?.value||'UDARA',packageCount:Number($('#jumlahPaket')?.value||1),packages:$$('.paket-row').map(r=>({name:$('.paket-nama',r)?.value||'',actual:Number($('.paket-aktual',r)?.value||0),p:Number($('.paket-p',r)?.value||0),l:Number($('.paket-l',r)?.value||0),t:Number($('.paket-t',r)?.value||0)})),routes:getRoutes(),margin:Number($('#inputMargin')?.value||15),directName:$('#inputNamaBL')?.value||'',directCost:$('#inputNominalBL')?.value||'',pph:!!$('#checkPajakBL')?.checked};}
  function applyState(state){
    if(!state)return; const mode=$(`input[name="modaUtama"][value="${state.mode||'UDARA'}"]`);if(mode)mode.checked=true;
    $('#jumlahPaket').value=Math.max(1,state.packageCount||state.packages?.length||1);renderPaketRows();(state.packages||[]).forEach((p,i)=>{const row=$$('.paket-row')[i];if(!row)return;$('.paket-nama',row).value=p.name;$('.paket-aktual',row).value=p.actual;$('.paket-p',row).value=p.p;$('.paket-l',row).value=p.l;$('.paket-t',row).value=p.t;calcCW($('.paket-aktual',row));});
    if(state.destination){if($('#tujuanAkhirSelect')?.tomselect)$('#tujuanAkhirSelect').tomselect.setValue(state.destination);else $('#tujuanAkhirSelect').value=state.destination;syncTersier();}
    $('#inputMargin').value=state.margin??15;$('#inputNamaBL').value=state.directName||'';$('#inputNominalBL').value=state.directCost||'';$('#checkPajakBL').checked=!!state.pph;
    if(state.routes?.length){$('#ruteContainer').innerHTML='';ruteCount=0;state.routes.forEach(r=>{tambahRute(r.moda,r.origin,r.dest);const id=ruteCount,setVals=()=>{const ti=$(`#rute-tarif-${id}`);if(ti){ti.dataset.value=r.tarif;ti.value=formatRupiahUI(r.tarif);}const b=$(`#rute-basis-${id}`);if(b)b.value=r.basis||'KG';const c=$(`#rute-dest-custom-${id}`);if(c)c.value=r.dest||'';};setTimeout(setVals,0);});}else renderDefaultRoutes();
    setTimeout(()=>{updateSummary(calculateModel(false));toast('Data berhasil dimuat.','success');},50);
  }
  function scenarios(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]}}
  function storeScenarios(list){localStorage.setItem(STORAGE_KEY,JSON.stringify(list));renderScenarioOptions();}
  function renderScenarioOptions(){const sel=$('#scenarioSelect');if(!sel)return;const current=sel.value;sel.innerHTML='<option value="">Pilih skenario tersimpan</option>'+scenarios().map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');sel.value=current;}
  function saveScenario(){const name=$('#scenarioName').value.trim()||`Skenario ${new Intl.DateTimeFormat('id-ID',{dateStyle:'short',timeStyle:'short'}).format(new Date())}`;const list=scenarios();const item={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,state:serializeState(),model:calculateModel(false)};list.push(item);storeScenarios(list);$('#scenarioSelect').value=item.id;toast(`Skenario “${name}” disimpan.`,'success');}
  function selectedScenario(){return scenarios().find(s=>s.id===$('#scenarioSelect').value)}
  function loadScenario(){const s=selectedScenario();if(!s)return toast('Pilih skenario yang akan dimuat.','error');applyState(s.state);}
  function deleteScenario(){const s=selectedScenario();if(!s)return toast('Pilih skenario yang akan dihapus.','error');storeScenarios(scenarios().filter(x=>x.id!==s.id));toast('Skenario dihapus.','success');}
  function duplicateScenario(){const s=selectedScenario();if(!s)return toast('Pilih skenario yang akan diduplikasi.','error');const list=scenarios(),copy={...s,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:`${s.name} (Salinan)`,state:{...s.state,savedAt:new Date().toISOString()}};list.push(copy);storeScenarios(list);$('#scenarioSelect').value=copy.id;toast('Skenario diduplikasi.','success');}
  function compareScenario(){const s=selectedScenario(),cur=calculateModel(false),out=$('#comparisonOutput');if(!s?.model?.valid||!cur.valid)return toast('Pilih skenario valid dan lengkapi kondisi saat ini.','error');const d=(a,b)=>a-b;out.innerHTML=`Dibandingkan dengan <strong>${escapeHtml(s.name)}</strong>:<br>Nilai proyek: <strong>${d(cur.projectValue,s.model.projectValue)>=0?'+':''}${rupiah(d(cur.projectValue,s.model.projectValue))}</strong><br>Total biaya: <strong>${d(cur.totalCost,s.model.totalCost)>=0?'+':''}${rupiah(d(cur.totalCost,s.model.totalCost))}</strong><br>Laba: <strong>${d(cur.profit,s.model.profit)>=0?'+':''}${rupiah(d(cur.profit,s.model.profit))}</strong><br>Margin: <strong>${d(cur.actualMargin,s.model.actualMargin)>=0?'+':''}${number(d(cur.actualMargin,s.model.actualMargin),2)} poin</strong><br>Nilai/kg: <strong>${d(cur.projectKg,s.model.projectKg)>=0?'+':''}${rupiah(d(cur.projectKg,s.model.projectKg))}/kg</strong>`;}

  function summaryText(){const m=latestModel?.valid?latestModel:calculateModel(false);if(!m.valid)return 'Data proyek belum lengkap.';return `RINGKASAN ANALISIS PROYEK LOGISTIK\nTujuan: ${m.destination}\nJumlah paket: ${m.packages.length}\nChargeable weight: ${number(m.totalWeight,2)} kg\nTotal nilai proyek: ${rupiah(m.projectValue)}\nPendapatan (DPP): ${rupiah(m.dpp)}\nTotal biaya: ${rupiah(m.totalCost)}\nLaba/rugi: ${rupiah(m.profit)}\nMargin: ${number(m.actualMargin,2)}%\nNilai proyek per kg: ${rupiah(m.projectKg)}/kg\nBiaya per kg: ${rupiah(m.costKg)}/kg\nBasis: total chargeable weight.`;}
  async function copySummary(){try{await navigator.clipboard.writeText(summaryText());toast('Ringkasan disalin.','success')}catch{toast('Tidak dapat mengakses clipboard.','error')}}
  async function shareSummary(){const text=summaryText();if(navigator.share)try{await navigator.share({title:'Analisis Proyek Logistik',text});return}catch(e){if(e.name==='AbortError')return}await copySummary();}
  function exportJson(){const blob=new Blob([JSON.stringify(serializeState(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`optimize-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('Data JSON diekspor.','success');}
  function resetAll(){const form=$('.workspace-form');$$('input',form).forEach(i=>{if(i.type==='radio')i.checked=i.value==='UDARA';else if(i.type==='checkbox')i.checked=false;});$('#jumlahPaket').value=1;$('#inputMargin').value=15;$('#inputNamaBL').value='';$('#inputNominalBL').value='';if($('#tujuanAkhirSelect')?.tomselect)$('#tujuanAkhirSelect').tomselect.clear();else $('#tujuanAkhirSelect').value='';renderPaketRows();const row=$('.paket-row');if(row){$('.paket-nama',row).value='PAKET 1';$('.paket-aktual',row).value=10;$('.paket-p',row).value=20;$('.paket-l',row).value=20;$('.paket-t',row).value=20;calcCW($('.paket-aktual',row));}renderDefaultRoutes();$('#hasil-container').classList.add('hidden');updateSummary(calculateModel(false));localStorage.removeItem(LAST_STATE_KEY);toast('Form dikembalikan ke nilai awal.','success');}
  function saveLastState(){try{localStorage.setItem(LAST_STATE_KEY,JSON.stringify(serializeState()))}catch{}}
  function bindActions(){
    $('#copySummaryBtn')?.addEventListener('click',copySummary);$('#shareSummaryBtn')?.addEventListener('click',shareSummary);$('#printBtn')?.addEventListener('click',()=>window.print());$('#copyResultsBtn')?.addEventListener('click',copySummary);$('#printResultsBtn')?.addEventListener('click',()=>window.print());$('#exportJsonBtn')?.addEventListener('click',exportJson);$('#importJsonBtn')?.addEventListener('click',()=>$('#importFile').click());$('#importFile')?.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{applyState(JSON.parse(r.result))}catch{toast('File JSON tidak valid.','error')}};r.readAsText(file);});$('#resetBtn')?.addEventListener('click',resetAll);$('#saveScenarioBtn')?.addEventListener('click',saveScenario);$('#loadScenarioBtn')?.addEventListener('click',loadScenario);$('#deleteScenarioBtn')?.addEventListener('click',deleteScenario);$('#duplicateScenarioBtn')?.addEventListener('click',duplicateScenario);$('#compareScenarioBtn')?.addEventListener('click',compareScenario);$('#clearLocalBtn')?.addEventListener('click',()=>{if(!deleteArmed){deleteArmed=true;$('#clearLocalBtn').textContent='Klik lagi';toast('Klik sekali lagi untuk menghapus semua data lokal.');setTimeout(()=>{deleteArmed=false;if($('#clearLocalBtn'))$('#clearLocalBtn').textContent='Hapus Data'},4000);return}localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(LAST_STATE_KEY);renderScenarioOptions();deleteArmed=false;$('#clearLocalBtn').textContent='Hapus Data';toast('Semua data lokal dihapus.','success')});
    let timer;document.addEventListener('input',e=>{if(e.target.closest('.workspace-form')){clearTimeout(timer);timer=setTimeout(()=>updateSummary(calculateModel(false)),120)}});document.addEventListener('change',e=>{if(e.target.closest('.workspace-form')){clearTimeout(timer);timer=setTimeout(()=>updateSummary(calculateModel(false)),120)}});
  }
  function enhanceAccessibility(){
    $$('input,select,button').forEach((el,i)=>{if(!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')){const label=el.closest('div')?.querySelector('label');el.setAttribute('aria-label',label?.textContent?.trim()||el.textContent?.trim()||el.placeholder||`Kontrol ${i+1}`)}});$$('table').forEach(t=>t.setAttribute('role','table'));$$('.overflow-x-auto').forEach(x=>x.classList.add('table-scroll'));const vp=$('meta[name="viewport"]');if(vp)vp.content='width=device-width, initial-scale=1';
  }

  const originalCalc=window.hitungOptimalisasi;window.__legacyHitungOptimalisasi=originalCalc;window.hitungOptimalisasi=runCalculation;
  const start=()=>mountLayout(); if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
