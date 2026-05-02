/* MAG — Druckhaltung */
'use strict';

window.MAG_STATE = window.MAG_STATE || {};

const MAG_STANDARD_SIZES = [8,12,18,25,35,50,80,100,140,200,250,300,400,500,600,800,1000,1500,2000,2500,3000,4000,5000];

function _magNum(id) {
  const raw = document.getElementById(id)?.value;
  if (raw == null || String(raw).trim() === '') return NaN;
  return parseFloat(String(raw).replace(',', '.'));
}

function _magFmt(v, d = 1, u = '') {
  if (v == null || isNaN(v)) return '–';
  return Number(v).toLocaleString('de-DE', {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  }) + (u ? ' ' + u : '');
}

function calcMAG() {
  const VA = _magNum('mag-volume');
  const tMin = _magNum('mag-tmin');
  const tMax = _magNum('mag-tmax');
  const h = _magNum('mag-height');
  const pSV = _magNum('mag-sv');

  const set = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  if ([VA, tMin, tMax, h, pSV].some(isNaN) || VA <= 0 || pSV <= 0 || tMax <= tMin) {
    ['mag-ve','mag-reserve','mag-vn-min','mag-vn-rec','mag-pressures','mag-p0-out']
      .forEach(id => set(id, '–'));
    return null;
  }

  const pSys = h * 0.1 + 0.5;
  const e = Math.max(0, (tMax - tMin) / 100 * 0.005);
  const VE = VA * e;
  const reserve = Math.max(3, VA * .005);
  const p0 = Math.max(.8, h * 0.1 + .3);
  const pe = Math.max(p0 + .5, pSV - .5);
  const VNmin = (VE + reserve) * ((pe + 1) / (pe - p0));
  const rec = MAG_STANDARD_SIZES.find(s => s >= VNmin) || Math.ceil(VNmin / 500) * 500;

  set('mag-ve', _magFmt(VE, 1, 'l'));
  set('mag-reserve', _magFmt(reserve, 1, 'l'));
  set('mag-vn-min', _magFmt(VNmin, 1, 'l'));
  set('mag-vn-rec', rec + ' l');
  set('mag-pressures', _magFmt(p0, 1, 'bar') + ' / ' + _magFmt(pSys, 1, 'bar'));
  set('mag-p0-out', _magFmt(p0, 1, 'bar'));

  window.MAG_STATE.last = { VA, tMin, tMax, h, pSV, VE, reserve, p0, pe, VNmin, recommended: rec };
  return window.MAG_STATE.last;
}

document.addEventListener('DOMContentLoaded', () => {
  ['mag-volume','mag-tmin','mag-tmax','mag-height','mag-sv']
    .forEach(id => {
      document.getElementById(id)?.addEventListener('input', calcMAG);
      document.getElementById(id)?.addEventListener('change', calcMAG);
    });
  calcMAG();
});
