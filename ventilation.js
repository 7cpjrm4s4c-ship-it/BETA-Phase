/* ═══════════════════════════════════════════════════════════════════════════════
   VENTILATION.JS — Lüftungs-Rechner
   Volumenstrom, Leistung, Temperaturdifferenz
═══════════════════════════════════════════════════════════════════════════════ */
'use strict';

const CP_AIR = 1005;
const LST = { hk: 'h', mode: 'v', qUnit: 'W' };

function rhoAir(t) {
  if (t <= -273.15) return NaN;
  return 353.05 / (t + 273.15);
}

function setLuftQUnit(unit) {
  LST.qUnit = unit;
  ['luft-q-in-h', 'luft-q-in-k'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) {
      inp.step = unit === 'kW' ? '0.1' : '100';
      inp.placeholder = unit === 'kW' ? '0.00' : '0';
    }
  });
  const badge = document.getElementById('luft-q-unit-badge');
  if (badge) badge.textContent = unit;
  document.getElementById('luft-wu')?.classList.toggle('active', unit === 'W');
  document.getElementById('luft-kwu')?.classList.toggle('active', unit === 'kW');
  calcLuft();
}

function luftSwitch(hk) {
  LST.hk = hk;
  document.getElementById('luft-btn-h')?.classList.toggle('on-h', hk === 'h');
  document.getElementById('luft-btn-k')?.classList.toggle('on-k', hk === 'k');
  const card = document.getElementById('luft-in-card');
  if (card) card.className = 'gc ' + (hk === 'h' ? 'gc-h' : 'gc-c');
  calcLuft();
}

function luftMode(m) {
  LST.mode = m;
  document.querySelectorAll('.mbtn[data-lm]').forEach(b => 
    b.classList.toggle('active', b.dataset.lm === m)
  );
  calcLuft();
}

function calcLuft() {
  const hk = LST.hk;
  const m = LST.mode;
  const vv = parseFloat(document.getElementById('luft-v')?.value) || 0;
  const tzl = parseFloat(document.getElementById('luft-tzl-' + hk)?.value);
  const tr = parseFloat(document.getElementById('luft-tr-' + hk)?.value) || (hk === 'h' ? 20 : 26);
  const qRaw = parseFloat(document.getElementById('luft-q-in-' + hk)?.value) || 0;
  const qIn = LST.qUnit === 'kW' ? qRaw * 1000 : qRaw;

  let dtAuto = NaN;
  if (!isNaN(tzl)) dtAuto = hk === 'h' ? tzl - tr : tr - tzl;

  const dt = m !== 'dt' && dtAuto > 0 ? dtAuto : 0;
  const tRef = !isNaN(tzl) && tzl > -273 ? tzl : 20;
  const rho = rhoAir(tRef);
  const fac = rho * CP_AIR / 3600;

  let Q = 0, V = 0, dT = 0, ok = false;
  if (m === 'v' && qIn > 0 && dt > 0) { V = qIn / (fac * dt); Q = qIn; dT = dt; ok = true; }
  if (m === 'q' && vv > 0 && dt > 0) { Q = vv * fac * dt; V = vv; dT = dt; ok = true; }
  if (m === 'dt' && vv > 0 && qIn > 0) { dT = qIn / (vv * fac); Q = qIn; V = vv; ok = true; }

  const val = ok ? (m === 'v' ? V.toFixed(1) : m === 'q' ? Q.toFixed(0) : dT.toFixed(2)) : '–';
  const unit = { v: 'm³/h', q: 'W', dt: 'K' }[m];
  const mv = document.getElementById('luft-main-val');
  if (mv) {
    mv.style.color = ok ? 'var(--t1)' : 'var(--t4)';
    mv.innerHTML = val + `<span style="font-size:16px;color:var(--t3);margin-left:4px">${unit}</span>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mbtn[data-lm]').forEach(b => 
    b.addEventListener('click', () => luftMode(b.dataset.lm))
  );
  ['luft-v', 'luft-tzl-h', 'luft-tzl-k', 'luft-tr-h', 'luft-tr-k', 'luft-q-in-h', 'luft-q-in-k']
    .forEach(id => document.getElementById(id)?.addEventListener('input', calcLuft));
  luftSwitch('h');
  calcLuft();
});

window.luftSwitch = luftSwitch;
window.luftMode = luftMode;
window.setLuftQUnit = setLuftQUnit;
