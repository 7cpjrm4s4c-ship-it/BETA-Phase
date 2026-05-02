/* WRG & Mischluft — aus Document übernommen */
'use strict';

function wrgToggleSign(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const raw = String(inp.value).replace(',', '.').trim();
  const v = parseFloat(raw);
  if (isNaN(v) || v === 0) {
    if (!raw.startsWith('-')) inp.value = '-';
    inp.focus(); return;
  }
  inp.value = String(-v).replace('.', ',');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
}

const _P = 1013.25;
const _pws = T => 6.112 * Math.exp(17.62 * T / (243.12 + T));
const _x = (T, phi) => {
  if (isNaN(T) || isNaN(phi) || phi <= 0) return 0;
  const pw = phi / 100 * _pws(T);
  return pw >= _P ? 999 : +(1000 * 0.622 * pw / (_P - pw)).toFixed(3);
};
const _h = (T, x) => +(1.006 * T + x / 1000 * (2501 + 1.86 * T)).toFixed(2);
const _phi = (T, x) => {
  if (isNaN(T) || isNaN(x) || x < 0) return NaN;
  const pw = x / 1000 * _P / (0.622 + x / 1000);
  return +(100 * pw / _pws(T)).toFixed(1);
};
const _rho = T => +(353.05 / (T + 273.15)).toFixed(4);
const _n = v => {
  if (v === null || v === undefined) return NaN;
  const s = String(v).replace(',', '.').trim();
  if (s === '' || s === '-') return NaN;
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
};

function calcWRG() {
  const T_ab = _n(document.getElementById('wrg-ab-t')?.value);
  const ph_ab = _n(document.getElementById('wrg-ab-phi')?.value);
  const T_au = _n(document.getElementById('wrg-au-t')?.value);
  const ph_au = _n(document.getElementById('wrg-au-phi')?.value);
  const eta = _n(document.getElementById('wrg-eta')?.value) / 100;
  const el = document.getElementById('wrg-result');
  if (!el) return;
  if ([T_ab, ph_ab, T_au, ph_au, eta].some(isNaN)) {
    el.innerHTML = '<p style="color:var(--t3);font-size:12px;text-align:center;padding:12px">Alle Felder ausfüllen →</p>';
    return;
  }
  const x_ab = _x(T_ab, ph_ab), h_ab = _h(T_ab, x_ab);
  const x_au = _x(T_au, ph_au), h_au = _h(T_au, x_au);
  const T_zl = +(T_au + eta * (T_ab - T_au)).toFixed(1);
  const x_zl = x_au, T_fl = +(T_ab - eta * (T_ab - T_au)).toFixed(1), x_fl = x_ab;
  const s_zl = { T: T_zl, phi: _phi(T_zl, x_zl), x: x_zl, h: _h(T_zl, x_zl) };
  const s_fl = { T: T_fl, phi: Math.min(100, _phi(T_fl, x_fl)), x: x_fl, h: _h(T_fl, x_fl) };
  el.innerHTML = '<p style="color:var(--grn);font-size:13px">WRG berechnet</p>';
}

function calcMix() {
  const T1 = _n(document.getElementById('mix-ls1-t')?.value);
  const vol1 = _n(document.getElementById('mix-ls1-vol')?.value);
  const T2 = _n(document.getElementById('mix-ls2-t')?.value);
  const vol2 = _n(document.getElementById('mix-ls2-vol')?.value);
  const el = document.getElementById('mix-result');
  if (!el) return;
  if ([T1, vol1, T2, vol2].some(isNaN)) {
    el.innerHTML = '<p style="color:var(--t3);font-size:12px;text-align:center;padding:12px">Werte eingeben →</p>';
    return;
  }
  const volM = vol1 + vol2;
  el.innerHTML = `<p style="color:var(--grn);font-size:13px">Mischung: ${volM.toFixed(1)} m³/h</p>`;
}

document.addEventListener('DOMContentLoaded', () => {
  ['wrg-ab-t','wrg-ab-phi','wrg-au-t','wrg-au-phi','wrg-eta'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcWRG);
    document.getElementById(id)?.addEventListener('change', calcWRG);
  });
  ['mix-ls1-t','mix-ls1-vol','mix-ls2-t','mix-ls2-vol'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcMix);
    document.getElementById(id)?.addEventListener('change', calcMix);
  });
  setTimeout(() => { calcWRG(); calcMix(); }, 100);
});
