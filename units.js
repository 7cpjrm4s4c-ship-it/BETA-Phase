/* ═══════════════════════════════════════════════════════════════════════════════
   UNITS.JS — Einheitenrechner
   Druck, Leistung, Energie, Volumenstrom, Gewicht, Volumen, Fläche
   KEINE UI-Definitionen
═══════════════════════════════════════════════════════════════════════════════ */
'use strict';

const UNITS = {
  pressure: {
    title: 'Druck — Umrechnung',
    base: 'Pa',
    units: [
      { key:'bar',  label:'bar',  factor:1e5 },
      { key:'mbar', label:'mbar', factor:1e2 },
      { key:'mWs',  label:'mWs',  factor:9806.65, decimals:2 },
      { key:'Pa',   label:'Pa',   factor:1 },
      { key:'hPa',  label:'hPa',  factor:1e2 },
      { key:'kPa',  label:'kPa',  factor:1e3 },
    ],
    defFrom:'mbar', defTo:'kPa',
  },
  power: {
    title: 'Leistung — Umrechnung',
    base: 'W',
    units: [
      { key:'W',   label:'W',    factor:1 },
      { key:'kW',  label:'kW',   factor:1e3 },
      { key:'MW',  label:'MW',   factor:1e6 },
      { key:'Js',  label:'J/s',  factor:1 },
      { key:'kJs', label:'kJ/s', factor:1e3 },
    ],
    defFrom:'W', defTo:'kW',
  },
  energy: {
    title: 'Energie — Umrechnung',
    base: 'J',
    units: [
      { key:'J',   label:'J',   factor:1 },
      { key:'kJ',  label:'kJ',  factor:1e3 },
      { key:'Ws',  label:'Ws',  factor:1 },
      { key:'Wh',  label:'Wh',  factor:3600 },
      { key:'kWh', label:'kWh', factor:3.6e6 },
    ],
    defFrom:'kWh', defTo:'kJ',
  },
  flow: {
    title: 'Volumenstrom — Umrechnung',
    base: 'm3h',
    units: [
      { key:'m3h',   label:'m³/h',   factor:1 },
      { key:'m3min', label:'m³/min', factor:60 },
      { key:'m3s',   label:'m³/s',   factor:3600 },
      { key:'ls',    label:'l/s',    factor:3.6 },
      { key:'lmin',  label:'l/min',  factor:0.06 },
      { key:'lh',    label:'l/h',    factor:0.001 },
    ],
    defFrom:'m3h', defTo:'ls',
  },
  mass: {
    title: 'Gewicht — Umrechnung',
    base: 'kg',
    units: [
      { key:'mg', label:'mg', factor:1e-6 },
      { key:'g',  label:'g',  factor:1e-3 },
      { key:'kg', label:'kg', factor:1 },
      { key:'t',  label:'t',  factor:1e3 },
    ],
    defFrom:'kg', defTo:'g',
  },
  volume: {
    title: 'Volumen — Umrechnung',
    base: 'm3',
    units: [
      { key:'mm3', label:'mm³',  factor:1e-9 },
      { key:'cm3', label:'cm³',  factor:1e-6 },
      { key:'dm3', label:'dm³',  factor:1e-3 },
      { key:'l',   label:'Liter',factor:1e-3 },
      { key:'m3',  label:'m³',   factor:1 },
    ],
    defFrom:'m3', defTo:'l',
  },
  area: {
    title: 'Fläche — Umrechnung',
    base: 'm2',
    units: [
      { key:'mm2', label:'mm²',  factor:1e-6 },
      { key:'cm2', label:'cm²',  factor:1e-4 },
      { key:'dm2', label:'dm²',  factor:1e-2 },
      { key:'m2',  label:'m²',   factor:1 },
      { key:'ha',  label:'ha',   factor:1e4 },
      { key:'km2', label:'km²',  factor:1e6 },
    ],
    defFrom:'m2', defTo:'cm2',
  },
};

let UCurrent = 'pressure';

function ufmt(v, decimals) {
  if (v == null || isNaN(v)) return '–';
  const d = Math.min(2, Math.max(0, decimals ?? 2));
  return Number(v).toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}

function buildSelects(cat) {
  const d = UNITS[cat];
  const fs = document.getElementById('unit-from-sel');
  const ts = document.getElementById('unit-to-sel');
  if (!fs || !ts) return;
  fs.innerHTML = '';
  ts.innerHTML = '';
  d.units.forEach(u => {
    fs.innerHTML += `<option value="${u.key}"${u.key===d.defFrom?' selected':''}>${u.label}</option>`;
    ts.innerHTML += `<option value="${u.key}"${u.key===d.defTo  ?' selected':''}>${u.label}</option>`;
  });
}

function unitCat(cat) {
  UCurrent = cat;
  const sel = document.getElementById('unit-cat-sel');
  if (sel && sel.value !== cat) sel.value = cat;
  const title = document.getElementById('unit-card-title');
  if (title) title.textContent = UNITS[cat].title;
  buildSelects(cat);
  const fv = document.getElementById('unit-from-val'); 
  if (fv) fv.value = '';
  const tv = document.getElementById('unit-to-val');
  if (tv) { tv.textContent = '–'; tv.style.color = 'var(--t4)'; }
  const al = document.getElementById('unit-all-list');
  if (al) al.innerHTML = '<p style="color:var(--t3);font-size:12px;text-align:center;padding:12px 0">Wert eingeben →</p>';
}

function unitCalc() {
  const d    = UNITS[UCurrent];
  const raw  = parseFloat(document.getElementById('unit-from-val')?.value);
  const fKey = document.getElementById('unit-from-sel')?.value;
  const tKey = document.getElementById('unit-to-sel')?.value;
  const tv   = document.getElementById('unit-to-val');
  const al   = document.getElementById('unit-all-list');

  if (isNaN(raw)) {
    if (tv) { tv.textContent = '–'; tv.style.color = 'var(--t4)'; }
    if (al) al.innerHTML = '<p style="color:var(--t3);font-size:12px;text-align:center;padding:12px 0">Wert eingeben →</p>';
    return;
  }

  const fUnit  = d.units.find(u => u.key === fKey);
  const tUnit  = d.units.find(u => u.key === tKey);
  const base   = raw * fUnit.factor;
  const result = base / tUnit.factor;

  if (tv) { tv.textContent = ufmt(result, tUnit.decimals); tv.style.color = 'var(--grn)'; }

  if (al) {
    let html = '';
    d.units.forEach(u => {
      const v      = base / u.factor;
      const isFrom = u.key === fKey;
      const isTo   = u.key === tKey;
      const cls    = (isFrom || isTo) ? 'unit-row uh' : 'unit-row';
      const marker = isFrom ? ' ←' : isTo ? ' →' : '';
      html += `<div class="${cls}">
        <span class="unit-k">${u.label}${marker}</span>
        <span class="unit-v">${ufmt(v, u.decimals)}</span>
      </div>`;
    });
    al.innerHTML = html;
  }
}

function unitSwap() {
  const fs = document.getElementById('unit-from-sel');
  const ts = document.getElementById('unit-to-sel');
  const tmp = fs.value;
  fs.value = ts.value;
  ts.value = tmp;
  const resText = document.getElementById('unit-to-val')?.textContent;
  if (resText && resText !== '–') {
    const n = parseFloat(resText.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(n)) document.getElementById('unit-from-val').value = n;
  }
  unitCalc();
}

document.addEventListener('DOMContentLoaded', () => {
  unitCat('pressure');
  document.getElementById('unit-cat-sel')?.addEventListener('change', (e) => unitCat(e.target.value));
  document.getElementById('unit-from-val')?.addEventListener('input', unitCalc);
  document.getElementById('unit-from-sel')?.addEventListener('change', unitCalc);
  document.getElementById('unit-to-sel')?.addEventListener('change', unitCalc);
  document.getElementById('unit-swap-btn')?.addEventListener('click', unitSwap);
});
