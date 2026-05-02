/* ═══════════════════════════════════════════════════════════════════════════════
   PIPE.JS — Rohrdimensionierung & Hydraulik
   Berechnung von Rohrtypen, Druckabbau, Geschwindigkeit
   KEINE UI-Definitionen — nutzt globale style.css Klassen
═══════════════════════════════════════════════════════════════════════════════ */
'use strict';

const PIPES = [
  [ 15,  16.1, 21.3, 2.60, 'DIN EN 10255',  16.0,  18.0, 1.0],
  [ 20,  21.6, 26.9, 2.65, 'DIN EN 10255',  19.6,  22.0, 1.2],
  [ 25,  27.2, 33.7, 3.25, 'DIN EN 10255',  25.6,  28.0, 1.2],
  [ 32,  35.9, 42.4, 3.25, 'DIN EN 10255',  32.0,  35.0, 1.5],
  [ 40,  41.8, 48.3, 3.25, 'DIN EN 10255',  39.0,  42.0, 1.5],
  [ 50,  53.0, 60.3, 3.65, 'DIN EN 10255',  51.0,  54.0, 1.5],
  [ 65,  69.6, 76.1, 3.25, 'DIN EN 10220',  72.1,  76.1, 2.0],
  [ 80,  82.5, 88.9, 3.20, 'DIN EN 10220',  84.9,  88.9, 2.0],
  [100, 107.1,114.3, 3.60, 'DIN EN 10220', 104.0, 108.0, 2.0],
  [125, 131.7,139.7, 4.00, 'DIN EN 10220',  null,  null, null],
  [150, 155.8,168.3, 4.50, 'DIN EN 10220',  null,  null, null],
];

const RHO = 983.2;
const NU = 0.474e-6;
const ES = 0.046e-3;
const EM = 0.015e-3;
const DP0 = 100;
const MAPRESS_MAX_DN = 100;

let PIPE_MATERIAL = 'all';

function lambdaCW(Re, eps, D) {
  if (Re < 1e-9) return 0;
  if (Re < 2300) return 64 / Re;
  let l = 0.25 / Math.pow(Math.log10(eps / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)), 2);
  for (let i = 0; i < 60; i++) {
    const n = Math.pow(-2 * Math.log10(eps / (3.71 * D) + 2.51 / (Re * Math.sqrt(l))), -2);
    if (Math.abs(n - l) < 1e-11) { l = n; break; }
    l = n;
  }
  return l;
}

function pdrop(vol, diMm, eps) {
  if (!vol || !diMm) return { dp: 0, v: 0, Re: 0 };
  const D = diMm / 1e3;
  const A = Math.PI * D * D / 4;
  const v = (vol / 3600) / A;
  const Re = v * D / NU;
  return { dp: lambdaCW(Re, eps, D) * RHO * v * v / (2 * D), v, Re };
}

function findBestPipe(vol, mx, material) {
  const candidates = [];
  for (let i = 0; i < PIPES.length; i++) {
    const p = PIPES[i];
    if (material === 'all' || material === 'steel') {
      const { dp } = pdrop(vol, p[1], ES);
      if (dp <= mx) candidates.push({ type: 'steel', index: i, dp, pipe: p });
    }
    if (material === 'all' || material === 'mapress') {
      if (p[5] !== null && p[0] <= MAPRESS_MAX_DN) {
        const { dp } = pdrop(vol, p[5], EM);
        if (dp <= mx) candidates.push({ type: 'mapress', index: i, dp, pipe: p });
      }
    }
  }
  return candidates;
}

function dpState(dp, mx) {
  return dp <= mx * 0.75 ? 'ok' : dp <= mx ? 'warn' : 'bad';
}

function initPipe() {
  const volEl = document.getElementById('p-vol');
  const dpEl = document.getElementById('p-dp');
  const matEl = document.getElementById('pipe-material');

  if (volEl) volEl.addEventListener('input', calcPipeTab);
  if (dpEl) dpEl.addEventListener('input', calcPipeTab);
  if (matEl) matEl.addEventListener('change', (e) => {
    PIPE_MATERIAL = e.target.value || 'all';
    calcPipeTab();
  });
}

function calcPipeTab() {
  const vol = parseFloat(document.getElementById('p-vol')?.value) || 0;
  const mx = parseFloat(document.getElementById('p-dp')?.value) || 100;
  const el = document.getElementById('pipe-results');
  
  if (!vol || !el) return;

  const candidates = findBestPipe(vol, mx, PIPE_MATERIAL);
  
  if (!candidates.length) {
    el.innerHTML = '<p style="color:var(--t3);padding:18px 0;text-align:center;font-size:12px">Keine passende Größe gefunden</p>';
    return;
  }

  let html = '';
  candidates.forEach(c => {
    const p = c.pipe;
    const { dp, v } = c.type === 'steel' ? pdrop(vol, p[1], ES) : pdrop(vol, p[5], EM);
    const state = dpState(dp, mx);
    const pct = Math.min(100, dp / mx * 100);
    const dpTxt = dp < 10 ? dp.toFixed(1) : Math.round(dp);
    
    html += `<div class="pm pipe-card pipe-card--${state}">
      <div class="pm-std">${c.type === 'steel' ? p[4] : 'Mapress Edelstahl'}</div>
      <div class="pm-dn">DN ${p[0]}</div>
      <div class="pm-r"><span>${dpTxt} Pa/m</span><span>${v.toFixed(2)} m/s</span></div>
    </div>`;
  });
  
  el.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', initPipe);
