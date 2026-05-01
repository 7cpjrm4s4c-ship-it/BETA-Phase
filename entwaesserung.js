/* ═══════════════════════════════════════════════════════
   entwaesserung.js — TechCalc Pro
   Entwässerung Quick Tool · DU · Schmutzwasserabfluss
   Quick-Check, keine vollständige Entwässerungsplanung
═══════════════════════════════════════════════════════ */
'use strict';

const EW_FIXTURES = [
  { key:'wc_6',       label:'WC 6 l',               du:2.0, pipe:'DN 90 / DN 100' },
  { key:'wc_9',       label:'WC 9 l / Bestand',     du:2.5, pipe:'DN 100' },
  { key:'washbasin',  label:'Waschtisch',            du:0.5, pipe:'DN 40 / DN 50' },
  { key:'shower',     label:'Dusche',                du:0.8, pipe:'DN 50' },
  { key:'bath',       label:'Badewanne',             du:0.8, pipe:'DN 50' },
  { key:'urinal',     label:'Urinal',                du:0.5, pipe:'DN 50' },
  { key:'sink',       label:'K\u00fcchensP\u00fcle', du:0.8, pipe:'DN 50' },
  { key:'dishwasher', label:'Geschirrsp\u00fcler',   du:0.8, pipe:'DN 50' },
  { key:'washer',     label:'Waschmaschine',         du:0.8, pipe:'DN 50' },
  { key:'floor',      label:'Bodenablauf',           du:0.8, pipe:'DN 50 / DN 70' },
  { key:'special',    label:'Sonderverbraucher',     du:1.0, pipe:'objektbezogen' },
];

const EW_K = {
  wohn:   { label:'Wohngeb\u00e4ude / wohn\u00e4hnlich',          k:0.5 },
  buero:  { label:'B\u00fcro / Verwaltung',                       k:0.5 },
  hotel:  { label:'Hotel / Beherbergung',                         k:0.7 },
  schule: { label:'Schule / Sport / \u00f6ffentlich',             k:0.7 },
  gewerb: { label:'Gewerbe / hohe Gleichzeitigkeit',              k:1.0 },
};

const EW_STATE = {
  result: null,
  editingName: null,
  straenge: JSON.parse(localStorage.getItem('ew_straenge') || '[]'),
};
window.EW_STATE = EW_STATE;

/* ─── HELFER ─── */
function ewNum(v)        { if (v == null) return 0; const n = parseFloat(String(v).replace(',','.').trim()); return isNaN(n)?0:n; }
function ewFmt(v, d=2)   { return (isNaN(v)||v==null) ? '\u2013' : Number(v).toFixed(d).replace('.',','); }
function ewGet(id)        { return document.getElementById(id); }
function ewSaveStraenge() { localStorage.setItem('ew_straenge', JSON.stringify(EW_STATE.straenge||[])); }

/* ─── ROHR-EMPFEHLUNG ─── */
function ewRecommendedPipe(qww, du) {
  if (du <= 2.5 && qww <= 1.0) return { anschluss:'DN 50',  sammel:'DN 70',             fall:'DN 70 / DN 80', grund:'DN 100' };
  if (du <= 8   && qww <= 2.0) return { anschluss:'DN 70',  sammel:'DN 80 / DN 100',    fall:'DN 100',        grund:'DN 100' };
  if (du <= 20  && qww <= 3.5) return { anschluss:'DN 100', sammel:'DN 100',            fall:'DN 100',        grund:'DN 125' };
  if (du <= 50  && qww <= 6.0) return { anschluss:'DN 100', sammel:'DN 125',            fall:'DN 125',        grund:'DN 150' };
  return { anschluss:'objektbezogen', sammel:'objektbezogen', fall:'objektbezogen', grund:'objektbezogen' };
}

function ewHints(result) {
  const h = [
    'L\u00fcftung der Entw\u00e4sserungsanlage pr\u00fcfen: Hauptl\u00fcftung / Nebenwl\u00fcftung nach Anlagenaufbau ber\u00fccksichtigen.',
    'R\u00fcckstauebene und ggf. R\u00fcckstausicherung/Hebeanlage objektbezogen pr\u00fcfen.',
    'Gef\u00e4lle, F\u00fcllungsgrad, Leitungsl\u00e4ngen, Richtungs\u00e4nderungen und \u00f6rtliche Satzungen bleiben separat zu pr\u00fcfen.',
  ];
  if (result.duTotal > 20) h.push('Hohe DU-Summe: Dimensionierung und L\u00fcftung fachplanerisch vertiefen.');
  if (result.floorCount > 0) h.push('Bodenabl\u00e4ufe nur mit geeigneter Geruchsverschluss-/Sperrwasserl\u00f6sung und Nutzungskonzept ansetzen.');
  return h;
}

/* ─── FIXTURE-LISTE HTML ─── */
function ewRowsHtml() {
  return EW_FIXTURES.map(f => `
    <div class="ew-row" data-ew-key="${f.key}">
      <div class="ew-fixture">
        <strong>${f.label}</strong>
        <span>DU ${ewFmt(f.du,1)} \u00b7 ${f.pipe}</span>
      </div>
      <div class="iwrap ew-count-wrap">
        <input class="inp-sm ew-count" id="ew-${f.key}" type="number" min="0" step="1" value="0"
               inputmode="numeric" aria-label="${f.label} Anzahl">
        <span class="iunit">Stk.</span>
      </div>
    </div>`).join('');
}

/* ─── BERECHNUNG ─── */
function calcEntwaesserung() {
  const use   = ewGet('ew-use')?.value || 'wohn';
  const kData = EW_K[use] || EW_K.wohn;
  let duTotal = 0, floorCount = 0;
  const rows  = [];

  EW_FIXTURES.forEach(f => {
    const n  = Math.max(0, Math.round(ewNum(ewGet('ew-' + f.key)?.value)));
    const du = n * f.du;
    if (n > 0) rows.push({ ...f, count:n, du });
    duTotal    += du;
    if (f.key === 'floor') floorCount += n;
  });

  const specialQ = ewNum(ewGet('ew-special-q')?.value);
  const qww  = duTotal > 0 ? kData.k * Math.sqrt(duTotal) + specialQ : specialQ;
  const dims  = ewRecommendedPipe(qww, duTotal);
  const result = { use, useLabel:kData.label, k:kData.k, duTotal, specialQ, qww, dims, rows, floorCount };
  EW_STATE.result = result;
  _ewRender(result);
  return result;
}

function _ewRender(r) {
  const set = (id, txt) => { const el = ewGet(id); if (el) el.textContent = txt; };
  set('ew-du-total',      ewFmt(r.duTotal, 1));
  set('ew-qww',           ewFmt(r.qww, 2));
  set('ew-dim-anschluss', r.dims.anschluss);
  set('ew-dim-sammel',    r.dims.sammel);
  set('ew-dim-fall',      r.dims.fall);
  set('ew-dim-grund',     r.dims.grund);
  set('ew-k-label',       `K = ${ewFmt(r.k,2)} \u00b7 ${r.useLabel}`);

  const detail = ewGet('ew-detail');
  if (detail) {
    detail.innerHTML = r.rows.length
      ? r.rows.map(row => `<div class="ew-detail-row"><span>${row.count}\u00d7 ${row.label}</span><strong>${ewFmt(row.du,1)} DU</strong></div>`).join('')
      : '<p style="color:var(--t3);font-size:12px;text-align:center;padding:8px 0">Entw\u00e4sserungsgegenstände eingeben →</p>';
  }
  const hints = ewGet('ew-hints');
  if (hints) hints.innerHTML = ewHints(r).map(h => `<div>\u2022 ${h}</div>`).join('');
}

/* ─── STRANG HINZUFÜGEN ─── */
function addEntwaesserungStrang() {
  const r = calcEntwaesserung();
  if (!r || r.duTotal <= 0) return;
  const strang = {
    id:      Date.now(),
    name:    (ewGet('ew-strang-name')?.value?.trim() || EW_STATE.editingName || `Strang ${(EW_STATE.straenge?.length||0)+1}`),
    duTotal: r.duTotal,
    qww:     r.qww,
    dims:    r.dims,
    rows:    r.rows,
  };
  EW_STATE.straenge = EW_STATE.straenge || [];
  EW_STATE.straenge.push(strang);
  ewSaveStraenge();
  renderStrangListe();
  renderEntwaesserungTotals();
  _ewResetInputs();
  const nameEl = ewGet('ew-strang-name'); if (nameEl) nameEl.value = '';
  EW_STATE.editingName = null;
  calcEntwaesserung();
}

function _ewResetInputs() {
  EW_FIXTURES.forEach(f => { const el = ewGet('ew-'+f.key); if (el) el.value = 0; });
  const sq = ewGet('ew-special-q'); if (sq) sq.value = '';
}

/* ─── STRANG LÖSCHEN ─── */
function deleteEntwaesserungStrang(id) {
  EW_STATE.straenge = (EW_STATE.straenge||[]).filter(s => s.id !== id);
  ewSaveStraenge();
  renderStrangListe();
  renderEntwaesserungTotals();
}
/* Legacy-Alias für gespeicherte onclick-Strings in localStorage */
window.deleteStrang = deleteEntwaesserungStrang;
window.deleteEntwaesserungStrang = deleteEntwaesserungStrang;

/* ─── STRANG BEARBEITEN ─── */
function editEntwaesserungStrang(id) {
  const list = EW_STATE.straenge || [];
  const s    = list.find(x => Number(x.id) === Number(id));
  if (!s) return;
  _ewResetInputs();
  EW_STATE.editingName = s.name || null;
  const nameEl = ewGet('ew-strang-name'); if (nameEl) nameEl.value = s.name || '';
  (s.rows||[]).forEach(r => { const el = ewGet('ew-'+r.key); if (el) el.value = Number(r.count)||0; });
  EW_STATE.straenge = list.filter(x => Number(x.id) !== Number(id));
  ewSaveStraenge();
  renderStrangListe();
  renderEntwaesserungTotals();
  calcEntwaesserung();
}
window.editEntwaesserungStrang = editEntwaesserungStrang;

/* ─── STRANG-LISTE RENDERN (Event-Delegation statt onclick) ─── */
function renderStrangListe() {
  const host = ewGet('ew-strang-list');
  if (!host) return;
  const list = EW_STATE.straenge || [];
  if (!list.length) {
    host.innerHTML = '<p style="color:var(--t3);font-size:12px">Noch keine Str\u00e4nge angelegt.</p>';
    renderEntwaesserungTotals();
    return;
  }
  /* data-id statt onclick — Handler läuft per Event-Delegation auf dem Container */
  host.innerHTML = list.map(s => `
    <div class="ew-strang-row">
      <div class="ew-strang-main">
        <strong>${s.name}</strong>
        <span>${ewFmt(s.duTotal,1)} DU \u00b7 Qww ${ewFmt(s.qww,2)} l/s</span>
      </div>
      <div class="ui-action-row">
        <button class="ew-mini-btn" type="button" data-ew-edit="${s.id}">Bearbeiten</button>
        <button class="ew-mini-btn danger" type="button" data-ew-del="${s.id}">L\u00f6schen</button>
      </div>
    </div>`).join('');
  renderEntwaesserungTotals();
}

/* ─── AGGREGATE ─── */
function ewAggregateStraenge() {
  const list = EW_STATE.straenge || [];
  const totals = {};
  let duTotal = 0, qwwTotal = 0;
  list.forEach(s => {
    duTotal  += Number(s.duTotal)||0;
    qwwTotal += Number(s.qww)||0;
    (s.rows||[]).forEach(r => {
      const key = r.key || r.label || 'unknown';
      if (!totals[key]) totals[key] = { key, label:r.label||key, count:0, du:0 };
      totals[key].count += Number(r.count)||0;
      totals[key].du    += Number(r.du)||0;
    });
  });
  return { list, duTotal, qwwTotal, fixtures: Object.values(totals).filter(x => x.count > 0) };
}

function renderEntwaesserungTotals() {
  const host = ewGet('ew-total-fixtures');
  if (!host) return;
  const agg = ewAggregateStraenge();
  if (!agg.list.length) {
    host.innerHTML = '<p style="color:var(--t3);font-size:12px">Noch keine Str\u00e4nge angelegt.</p>';
    return;
  }
  const rows = agg.fixtures.map(f => `
    <div class="ew-fixture-total-row">
      <strong>${f.label}</strong><span>${f.count} Stk.</span><span>${ewFmt(f.du,1)} DU</span>
    </div>`).join('');
  host.innerHTML = `
    <div class="ew-total-head">
      <span>Str\u00e4nge: <strong>${agg.list.length}</strong></span>
      <span>\u03a3DU: <strong>${ewFmt(agg.duTotal,1)}</strong></span>
      <span>\u03a3Qww: <strong>${ewFmt(agg.qwwTotal,2)} l/s</strong></span>
    </div>
    <div class="ew-strang-summary">${rows||'<p style="color:var(--t3);font-size:12px">Keine Gegenst\u00e4nde gespeichert.</p>'}</div>`;
}

/* ─── INIT ─── */
function initEntwaesserung() {
  const list = ewGet('ew-fixture-list');
  if (list && !list.dataset.ready) {
    list.innerHTML = ewRowsHtml();
    list.dataset.ready = '1';
  }

  /* Eingabe-Events */
  document.querySelectorAll('#tab-entwaesserung input, #tab-entwaesserung select').forEach(el => {
    el.addEventListener('input',  calcEntwaesserung);
    el.addEventListener('change', calcEntwaesserung);
  });

  /* Strang hinzufügen */
  ewGet('ew-calc-btn')?.addEventListener('click', addEntwaesserungStrang);

  /* Event-Delegation für Bearbeiten / Löschen in der Strang-Liste */
  ewGet('ew-strang-list')?.addEventListener('click', e => {
    const editId = e.target.closest('[data-ew-edit]')?.dataset?.ewEdit;
    const delId  = e.target.closest('[data-ew-del]')?.dataset?.ewDel;
    if (editId) editEntwaesserungStrang(Number(editId));
    if (delId)  deleteEntwaesserungStrang(Number(delId));
  });

  renderStrangListe();
  renderEntwaesserungTotals();
  calcEntwaesserung();
}

document.addEventListener('DOMContentLoaded', initEntwaesserung);

/* ─── PDF-Snapshot Provider ─── */
window.TCP_PDF_SNAPSHOTS = window.TCP_PDF_SNAPSHOTS || {};
window.TCP_PDF_SNAPSHOTS.entwaesserung = function getEntwaesserungPdfSnapshot() {
  return typeof getEntwaesserungPdfData === 'function'
    ? getEntwaesserungPdfData()
    : { current: window.EW_STATE?.result || null, aggregate: null, generatedAt: new Date().toISOString() };
};

function getEntwaesserungPdfData() {
  const current = EW_STATE.result || calcEntwaesserung();
  return { current, straenge: EW_STATE.straenge||[], aggregate: ewAggregateStraenge() };
}
window.getEntwaesserungPdfData = getEntwaesserungPdfData;
