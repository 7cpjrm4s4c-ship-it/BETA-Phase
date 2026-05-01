/* ═══════════════════════════════════════════════════════
   mag.js — TechCalc Pro
   MAG / Druckhaltung — automatische Berechnung
   Abhängigkeit: keine (eigene Helfer)
═══════════════════════════════════════════════════════ */
'use strict';

window.MAG_STATE = window.MAG_STATE || {};

const MAG_STANDARD_SIZES = [
  8,12,18,25,35,50,80,100,140,200,250,300,400,500,600,800,1000,1500,2000,2500,3000,4000,5000
];

function _mag$(id)   { return document.getElementById(id); }
function _magNum(id) {
  const raw = _mag$(id)?.value;
  if (raw == null || String(raw).trim() === '') return NaN;
  return parseFloat(String(raw).replace(',', '.'));
}
function _magFmt(v, d = 1, u = '') {
  if (v == null || isNaN(v)) return '\u2013';
  return Number(v).toLocaleString('de-DE', {
    minimumFractionDigits: d, maximumFractionDigits: d
  }) + (u ? ' ' + u : '');
}

/* Ausdehnungskoeffizient aus Tabelle (Wasser, +Glykolzuschlag) */
function _magExpansionCoeff(tMin, tMax, medium) {
  const table = [
    [0,0],[10,0],[20,.002],[30,.004],[40,.008],[50,.012],
    [60,.017],[70,.023],[80,.029],[90,.036],[100,.043],
    [110,.052],[120,.062]
  ];
  const interp = T => {
    if (T <= table[0][0]) return table[0][1];
    for (let i = 1; i < table.length; i++) {
      const [t1,e1] = table[i-1], [t2,e2] = table[i];
      if (T <= t2) return e1 + (e2 - e1) * ((T - t1) / (t2 - t1));
    }
    return table[table.length - 1][1];
  };
  let e = Math.max(0, interp(tMax) - interp(tMin));
  if (medium === 'glycol25') e *= 1.08;
  if (medium === 'glycol35') e *= 1.14;
  return e;
}

function _magRecommendedSize(v) {
  return MAG_STANDARD_SIZES.find(s => s >= v) || Math.ceil(v / 500) * 500;
}

/* ─── BERECHNUNG ─── */
function calcMAG() {
  const system   = _mag$('mag-system')?.value  || 'heizung';
  const medium   = _mag$('mag-medium')?.value  || 'water';
  const VA       = _magNum('mag-volume');
  const tMin     = _magNum('mag-tmin');
  const tMax     = _magNum('mag-tmax');
  const h        = _magNum('mag-height');
  const pSV      = _magNum('mag-sv');
  const p0Manual = _magNum('mag-p0');
  const peManual = _magNum('mag-pe');
  const hintEl   = _mag$('mag-hints');

  const set = (id, txt) => { const el = _mag$(id); if (el) el.textContent = txt; };

  if ([VA, tMin, tMax, h, pSV].some(isNaN) || VA <= 0 || pSV <= 0 || tMax <= tMin) {
    ['mag-ve','mag-reserve','mag-vn-min','mag-vn-rec','mag-pressures','mag-pe-out','mag-psys-out']
      .forEach(id => set(id, '\u2013'));
    if (hintEl) hintEl.innerHTML = 'Anlagenvolumen, Temperaturen, statische H\u00f6he und Sicherheitsventil eingeben.';
    window.MAG_STATE.last = null;
    return null;
  }

  const pSys = h * 0.1 + 0.5;
  const e    = _magExpansionCoeff(tMin, tMax, medium);
  const VE   = VA * e;
  const reserve = Math.max(3, VA * .005);
  const p0   = (!isNaN(p0Manual) && p0Manual > 0) ? p0Manual : Math.max(.8, h * 0.1 + .3);
  const pFill = pSys;
  const pe   = (!isNaN(peManual) && peManual > 0) ? peManual : Math.max(p0 + .5, pSV - .5);
  const pressureSpreadOk = pe > p0 + .1;
  const VNmin = pressureSpreadOk ? (VE + reserve) * ((pe + 1) / (pe - p0)) : NaN;
  const rec   = pressureSpreadOk ? _magRecommendedSize(VNmin) : NaN;

  set('mag-ve',        _magFmt(VE, 1, 'l'));
  set('mag-reserve',   _magFmt(reserve, 1, 'l'));
  set('mag-vn-min',    _magFmt(VNmin, 1, 'l'));
  set('mag-vn-rec',    isNaN(rec) ? 'Druck pr\u00fcfen' : rec + ' l');
  set('mag-pressures', _magFmt(p0, 1, 'bar') + ' / ' + _magFmt(pFill, 1, 'bar'));
  set('mag-pe-out',    _magFmt(pe, 1, 'bar'));
  set('mag-psys-out',  _magFmt(pSys, 1, 'bar'));

  const warnings = [];
  if (pSV <= pSys)          warnings.push('<span class="mag-safety-warning">Sicherheitsventil zu klein dimensioniert: Systemdruck liegt am oder über dem Ansprechdruck.</span>');
  else if (pSV <= pSys+0.3) warnings.push('<span class="mag-safety-warning">Sicherheitsventil kritisch: Reserve zum Systemdruck prüfen.</span>');
  if (!pressureSpreadOk)    warnings.push('Enddruck muss über dem Vordruck liegen. Druckhaltung prüfen.');
  if (pe >= pSV)            warnings.push('Enddruck liegt am oder über dem Sicherheitsventil-Ansprechdruck. Enddruck reduzieren.');
  else if (pe > pSV - 0.2)  warnings.push('Enddruck sehr nah am Sicherheitsventil-Ansprechdruck. Reserve prüfen.');
  warnings.push('Systemdruck aus H\u00f6he: p = h \u00d7 0,1 + 0,5 bar.');
  if (system === 'solar')   warnings.push('Solar-MAG: Stillstandsvolumen und h\u00f6here Temperaturbelastung zus\u00e4tzlich pr\u00fcfen.');
  if (medium !== 'water')   warnings.push('Glykolgemisch \u00fcber Zuschlagsfaktor ber\u00fccksichtigt. Herstellerdaten ma\u00dfgebend.');
  warnings.push('Quick-Check zur Vorauslegung. Vollst\u00e4ndige Auslegung nach Herstellerangaben und DIN EN 12828 pr\u00fcfen.');

  if (hintEl) {
    hintEl.innerHTML = warnings.map(w =>
      w.includes('mag-safety-warning')
        ? `<div class="mag-safety-line">${w}</div>`
        : '\u2022 ' + w
    ).join('<br>');
  }

  const result = { system, medium, VA, tMin, tMax, h, pSV, pSys, e, VE, reserve, p0, pFill, pe, VNmin, recommended: rec };
  window.MAG_STATE.last = result;
  return result;
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  ['mag-system','mag-medium','mag-volume','mag-tmin','mag-tmax','mag-height','mag-sv','mag-p0','mag-pe']
    .forEach(id => {
      document.getElementById(id)?.addEventListener('input',  calcMAG);
      document.getElementById(id)?.addEventListener('change', calcMAG);
    });
  calcMAG();
});

/* ─── PDF-Snapshot Provider ─── */
window.TCP_PDF_SNAPSHOTS = window.TCP_PDF_SNAPSHOTS || {};
window.TCP_PDF_SNAPSHOTS.mag = function getMagPdfSnapshot() {
  try { calcMAG(); } catch (_) {}
  const text      = id => document.getElementById(id)?.textContent?.trim() || '\u2013';
  const input     = id => document.getElementById(id)?.value?.trim()       || '\u2013';
  const selectTxt = id => {
    const el = document.getElementById(id);
    return el?.options?.[el.selectedIndex]?.text || '\u2013';
  };
  return {
    module:  'mag',
    inputs:  { 'mag-volume':_mag$('mag-volume')?.value, 'mag-tmin':_mag$('mag-tmin')?.value,
                'mag-tmax':_mag$('mag-tmax')?.value, 'mag-height':_mag$('mag-height')?.value,
                'mag-sv':_mag$('mag-sv')?.value },
    selects: { 'mag-system': selectTxt('mag-system'), 'mag-medium': selectTxt('mag-medium') },
    outputs: { 'mag-ve': text('mag-ve'), 'mag-reserve': text('mag-reserve'),
                'mag-vn-min': text('mag-vn-min'), 'mag-vn-rec': text('mag-vn-rec'),
                'mag-pressures': text('mag-pressures'), 'mag-pe-out': text('mag-pe-out') },
    hints:   document.getElementById('mag-hints')?.innerText?.trim() || '\u2013',
    raw:     window.MAG_STATE || null,
    generatedAt: new Date().toISOString()
  };
};
