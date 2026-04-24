/* ═══════════════════════════════════════════════════════
   hx-engine.js  —  h,x-Diagramm nach Mollier  v4.1
   Fixes: Isothermen-Labels overlap behoben · ± Toggle · HiDPI
═══════════════════════════════════════════════════════ */
'use strict';

const P_ATM = 1013.25;

function pws(T) { return 6.112 * Math.exp(17.62 * T / (243.12 + T)); }

function calcX(T, phi) {
  if (isNaN(T) || isNaN(phi) || phi <= 0) return 0;
  const pw = (phi / 100) * pws(T);
  if (pw >= P_ATM) return 999;
  return +(1000 * 0.622 * pw / (P_ATM - pw)).toFixed(3);
}

function calcH(T, x) { return 1.006 * T + (x / 1000) * (2501 + 1.86 * T); }

function calcPhi(T, x) {
  if (isNaN(T) || isNaN(x) || x < 0) return NaN;
  const xk = x / 1000;
  const pw = xk * P_ATM / (0.622 + xk);
  return 100 * pw / pws(T);
}

function calcTdew(x) {
  if (isNaN(x) || x <= 0) return NaN;
  const xk = x / 1000;
  const pw = xk * P_ATM / (0.622 + xk);
  const lp = Math.log(pw / 6.112);
  return +(243.12 * lp / (17.62 - lp)).toFixed(2);
}

function calcTwet(T, x) {
  if (isNaN(T) || isNaN(x)) return NaN;
  let tw = T - (T - (calcTdew(x) || T)) * 0.4;
  for (let i = 0; i < 40; i++) {
    const xS = calcX(tw, 100);
    const tn = T - (xS - x) * (2501 + 1.86 * tw) / (1.006 + 1.805 * x / 1000);
    if (Math.abs(tn - tw) < 0.001) { tw = tn; break; }
    tw = tn;
  }
  return +tw.toFixed(2);
}

function numHx(v) {
  if (v == null || String(v).trim() === '') return NaN;
  return parseFloat(String(v).replace(/[−–—]/g, '-').replace(',', '.').trim());
}

/* ── KONFIGURATION ── */
const CFG = {
  xMin: 0, xMax: 30,
  hMin: -20, hMax: 105,
  tMin: -20, tMax: 52,
  pad: { top: 20, right: 14, bottom: 42, left: 50 },
  phis:   [10, 20, 30, 40, 50, 60, 70, 80, 90],
  isoT:   [-20, -10, 0, 10, 20, 30, 40, 50],
  xTicks: [0, 5, 10, 15, 20, 25, 30],
  hTicks: [-20, -10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
};

function toCanvas(x, h, W, H) {
  const { pad: p, xMin, xMax, hMin, hMax } = CFG;
  const cw = W - p.left - p.right, ch = H - p.top - p.bottom;
  return {
    px: p.left + (x - xMin) / (xMax - xMin) * cw,
    py: p.top  + ch - (h - hMin) / (hMax - hMin) * ch,
  };
}

function fromCanvas(px, py, W, H) {
  const { pad: p, xMin, xMax, hMin, hMax } = CFG;
  const cw = W - p.left - p.right, ch = H - p.top - p.bottom;
  return {
    x: (px - p.left) / cw * (xMax - xMin) + xMin,
    h: hMax - (py - p.top) / ch * (hMax - hMin),
  };
}

let _state = null;
window._hxState = null;

/* ── HAUPT-DRAW ── */
function drawHxChart(state) {
  const canvas = document.getElementById('hxCanvas');
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = Math.round(rect.width)  || 340;
  const H = Math.round(rect.height) || 380;
  if (W < 10 || H < 10) return;
  canvas.width  = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#040810';
  ctx.fillRect(0, 0, W, H);
  _drawGrid(ctx, W, H);
  _drawPhiCurves(ctx, W, H);
  _drawSaturation(ctx, W, H);
  _drawIsotherms(ctx, W, H);
  _drawAxes(ctx, W, H);
  if (state) _drawStatePoint(ctx, W, H, state);
}

function _drawGrid(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  CFG.xTicks.forEach(x => {
    const { px, py: t } = toCanvas(x, CFG.hMax, W, H);
    const { py: b }     = toCanvas(x, CFG.hMin, W, H);
    ctx.beginPath(); ctx.moveTo(px, t); ctx.lineTo(px, b); ctx.stroke();
  });
  CFG.hTicks.forEach(h => {
    const { px: l, py } = toCanvas(CFG.xMin, h, W, H);
    const { px: r }     = toCanvas(CFG.xMax, h, W, H);
    ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(r, py); ctx.stroke();
  });
  ctx.restore();
}

function _drawPhiCurves(ctx, W, H) {
  CFG.phis.forEach(phi => {
    const acc = phi === 50;
    ctx.save();
    ctx.strokeStyle = acc ? 'rgba(90,160,255,0.30)' : 'rgba(80,130,255,0.13)';
    ctx.lineWidth = acc ? 1.2 : 0.7;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    let first = true;
    for (let T = CFG.tMin; T <= CFG.tMax; T += 0.5) {
      const x = calcX(T, phi), h = calcH(T, x);
      if (x < -0.5 || x > CFG.xMax + 0.5 || h < CFG.hMin - 5 || h > CFG.hMax + 5) { first = true; continue; }
      const { px, py } = toCanvas(x, h, W, H);
      first ? (ctx.moveTo(px, py), first = false) : ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.restore();
    // Label
    const xL = calcX(30, phi), hL = calcH(30, xL);
    if (xL >= 0 && xL <= CFG.xMax + 1 && hL >= CFG.hMin && hL <= CFG.hMax) {
      const { px, py } = toCanvas(xL, hL, W, H);
      ctx.save();
      ctx.fillStyle = acc ? 'rgba(90,160,255,0.75)' : 'rgba(90,140,255,0.45)';
      ctx.font = (acc ? 'bold ' : '') + '10px Arial,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(phi + ' %', px + 2, py - 3);
      ctx.restore();
    }
  });
}

function _drawSaturation(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = '#5ab0ff'; ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(90,176,255,0.40)'; ctx.shadowBlur = 5;
  ctx.beginPath();
  let first = true;
  for (let T = CFG.tMin; T <= CFG.tMax; T += 0.25) {
    const x = calcX(T, 100), h = calcH(T, x);
    if (x > CFG.xMax + 1) break;
    const { px, py } = toCanvas(x, h, W, H);
    first ? (ctx.moveTo(px, py), first = false) : ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.restore();
  const xL = calcX(18, 100), hL = calcH(18, xL);
  if (xL <= CFG.xMax) {
    const { px, py } = toCanvas(xL, hL, W, H);
    ctx.save();
    ctx.fillStyle = 'rgba(90,176,255,0.80)';
    ctx.font = 'bold 10px Arial,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('\u03c6 = 100 %', px + 5, py - 5);
    ctx.restore();
  }
}

/* ── ISOTHERME — LABEL FIX ──
   Labels werden bei x=0.8 g/kg INNEN im Plot gezeichnet.
   Damit kein Overlap mehr mit h-Achsen-Ticks am linken Rand.
   Hintergrunds-Clearing verhindert Überlap mit φ-Kurven. */
function _drawIsotherms(ctx, W, H) {
  CFG.isoT.forEach(T => {
    const h0   = calcH(T, 0);
    const xSat = calcX(T, 100);
    const xEnd = Math.min(xSat, CFG.xMax);
    const hEnd = calcH(T, xEnd);
    if (h0 > CFG.hMax + 8 || hEnd < CFG.hMin - 8) return;

    const p0 = toCanvas(0,    h0,   W, H);
    const p1 = toCanvas(xEnd, hEnd, W, H);
    const isZ = T === 0;

    ctx.save();
    ctx.strokeStyle = isZ ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.17)';
    ctx.lineWidth   = isZ ? 1.4 : 0.9;
    ctx.beginPath(); ctx.moveTo(p0.px, p0.py); ctx.lineTo(p1.px, p1.py); ctx.stroke();
    ctx.restore();

    // Label bei x=0.8 g/kg — NICHT am linken Rand (dort sind h-Achsen-Ticks)
    const hLabel = calcH(T, 0.8);
    if (hLabel < CFG.hMin || hLabel > CFG.hMax) return;
    const { px: lx, py: ly } = toCanvas(0.8, hLabel, W, H);
    const labelText = T + '\u00b0C';

    ctx.save();
    ctx.font = (isZ ? 'bold ' : '') + '10px Arial,sans-serif';
    ctx.textAlign = 'left';
    const tw = ctx.measureText(labelText).width;
    // Hintergrund-Clearing
    ctx.fillStyle = 'rgba(4,8,16,0.82)';
    ctx.fillRect(lx - 1, ly - 10, tw + 6, 13);
    // Text
    ctx.fillStyle = isZ ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.42)';
    ctx.fillText(labelText, lx + 2, ly);
    ctx.restore();
  });
}

function _drawAxes(ctx, W, H) {
  const { pad: p } = CFG;
  const cw = W - p.left - p.right, ch = H - p.top - p.bottom;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(p.left, p.top); ctx.lineTo(p.left, p.top + ch); ctx.lineTo(p.left + cw, p.top + ch);
  ctx.stroke(); ctx.restore();
  // x-Ticks
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.font = '10px Arial,sans-serif'; ctx.textAlign = 'center';
  CFG.xTicks.forEach(x => { const { px } = toCanvas(x, CFG.hMin, W, H); ctx.fillText(x, px, p.top + ch + 13); });
  ctx.fillStyle = 'rgba(255,255,255,0.60)'; ctx.font = 'bold 11px Arial,sans-serif';
  ctx.fillText('x  [g/kg]', p.left + cw / 2, p.top + ch + 30);
  ctx.restore();
  // h-Ticks
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.font = '10px Arial,sans-serif'; ctx.textAlign = 'right';
  CFG.hTicks.forEach(h => { const { py } = toCanvas(CFG.xMin, h, W, H); ctx.fillText(h, p.left - 5, py + 3); });
  ctx.save();
  ctx.translate(12, p.top + ch / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.60)'; ctx.font = 'bold 11px Arial,sans-serif';
  ctx.fillText('h  [kJ/kg]', 0, 0);
  ctx.restore(); ctx.restore();
}

function _drawStatePoint(ctx, W, H, state) {
  if (!state || isNaN(state.T) || isNaN(state.x)) return;
  const { pad: p } = CFG;
  const cw = W - p.left - p.right, ch = H - p.top - p.bottom;
  const h  = calcH(state.T, state.x);
  if (state.x < CFG.xMin || state.x > CFG.xMax || h < CFG.hMin || h > CFG.hMax) return;
  const { px, py } = toCanvas(state.x, h, W, H);
  // Fadenkreuz
  ctx.save();
  ctx.strokeStyle = 'rgba(109,99,255,0.30)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(p.left, py); ctx.lineTo(p.left + cw, py); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px, p.top); ctx.lineTo(px, p.top + ch); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
  // Punkt
  ctx.save();
  ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#6d63ff'; ctx.shadowColor = '#6d63ff'; ctx.shadowBlur = 18;
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(109,99,255,0.48)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  // Tooltip
  const lines = [
    'T   ' + state.T.toFixed(1) + ' \u00b0C',
    '\u03c6   ' + (isNaN(state.phi) ? '--' : state.phi.toFixed(1)) + ' %',
    'x   ' + state.x.toFixed(2) + ' g/kg',
    'h   ' + h.toFixed(1) + ' kJ/kg',
    'Td  ' + (state.tdew != null && !isNaN(state.tdew) ? state.tdew.toFixed(1) : '--') + ' \u00b0C',
  ];
  const bw = 132, bh = lines.length * 16 + 14;
  let bx = px + 13, by = py - bh - 8;
  if (bx + bw > W - p.right - 4) bx = px - bw - 13;
  if (by < p.top + 4) by = py + 14;
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,22,0.90)'; ctx.strokeStyle = 'rgba(109,99,255,0.52)'; ctx.lineWidth = 1;
  _roundRect(ctx, bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '12px "Courier New",Courier,monospace'; ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + 9, by + 17 + i * 16));
  ctx.restore();
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

/* ── HOVER TOOLTIP ── */
function _setupInteraction(canvas) {
  let _raf = false;
  function handle(cx, cy) {
    if (_raf) return; _raf = true;
    requestAnimationFrame(() => {
      _raf = false;
      const rect = canvas.getBoundingClientRect();
      const px = cx - rect.left, py = cy - rect.top;
      const W = rect.width, H = rect.height;
      const { pad: p2 } = CFG;
      if (px < p2.left || px > W - p2.right || py < p2.top || py > H - p2.bottom) {
        drawHxChart(_state); return;
      }
      const { x, h } = fromCanvas(px, py, W, H);
      if (x < CFG.xMin || x > CFG.xMax || h < CFG.hMin || h > CFG.hMax) {
        drawHxChart(_state); return;
      }
      const T   = (h - x / 1000 * 2501) / (1.006 + x / 1000 * 1.86);
      const phi = calcPhi(T, x);
      drawHxChart(_state);
      _drawHover(canvas.getContext('2d'), W, H, { T: +T.toFixed(2), phi: +phi.toFixed(1), x: +x.toFixed(2) });
    });
  }
  canvas.addEventListener('mousemove', e => handle(e.clientX, e.clientY), { passive: true });
  canvas.addEventListener('mouseleave', () => drawHxChart(_state));
  canvas.addEventListener('touchmove', e => { e.preventDefault(); handle(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
}

function _drawHover(ctx, W, H, state) {
  const x = state.x, h = calcH(state.T, x);
  const { px, py } = toCanvas(x, h, W, H);
  ctx.save();
  ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,210,80,0.70)'; ctx.shadowColor = 'rgba(255,200,60,0.55)'; ctx.shadowBlur = 10;
  ctx.fill(); ctx.restore();
  const lines = ['T ' + state.T.toFixed(1) + ' \u00b0C',
                 '\u03c6 ' + (isNaN(state.phi) ? '--' : state.phi.toFixed(0)) + ' %',
                 'x ' + x.toFixed(2) + ' g/kg'];
  const bw = 108, bh = lines.length * 15 + 10;
  let bx = px + 9, by = py - bh - 5;
  if (bx + bw > W - CFG.pad.right) bx = px - bw - 9;
  if (by < CFG.pad.top) by = py + 9;
  ctx.save();
  ctx.fillStyle = 'rgba(18,18,38,0.87)'; ctx.strokeStyle = 'rgba(255,200,60,0.38)'; ctx.lineWidth = 0.8;
  _roundRect(ctx, bx, by, bw, bh, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.font = '11px "Courier New",Courier,monospace'; ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + 7, by + 14 + i * 15));
  ctx.restore();
}

/* ── ± VORZEICHEN TOGGLE ── */
function toggleTempSign(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const v = parseFloat(String(inp.value).replace(',', '.').trim());
  if (isNaN(v) || v === 0) return;
  inp.value = String(-v).replace('.', ',');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ── ZUSTAND SETZEN ── */
function setHxState() {
  const T   = numHx(document.getElementById('hx-temp')?.value);
  const phi = numHx(document.getElementById('hx-rh')?.value);
  const xIn = numHx(document.getElementById('hx-x')?.value);
  const modeRH = document.getElementById('mode-rh')?.classList.contains('active');
  if (isNaN(T)) { _showHxError('Bitte Temperatur eingeben.'); return; }
  let state = null;
  if (modeRH) {
    if (isNaN(phi) || phi <= 0 || phi > 100) { _showHxError('Rel. Feuchte \u03c6: 1\u2013100 %'); return; }
    const x = calcX(T, phi);
    state = { T, phi, x, h: calcH(T, x), tdew: calcTdew(x), twet: calcTwet(T, x) };
  } else {
    if (isNaN(xIn) || xIn < 0) { _showHxError('Feuchtegehalt x \u2265 0 g/kg'); return; }
    state = { T, phi: calcPhi(T, xIn), x: xIn, h: calcH(T, xIn), tdew: calcTdew(xIn), twet: calcTwet(T, xIn) };
  }
  _state = state; window._hxState = state;
  _renderHxState(state);
}

function _renderHxState(state) {
  const fmt = (v, d) => (isNaN(v) || v == null) ? '--' : v.toFixed(d);
  const el  = id => document.getElementById(id);
  if (el('state-temp')) el('state-temp').textContent = fmt(state.T,   1) + ' \u00b0C';
  if (el('state-rh'))   el('state-rh').textContent   = fmt(state.phi, 1) + ' %';
  if (el('state-x'))    el('state-x').textContent    = fmt(state.x,   2) + ' g/kg';
  if (el('state-h'))    el('state-h').textContent    = fmt(state.h,   1) + ' kJ/kg';
  drawHxChart(state);
}

function _showHxError(msg) {
  const el = document.getElementById('hx-state');
  if (!el) return;
  const prev = el.innerHTML;
  el.innerHTML = `<span style="color:rgba(255,100,80,0.9);font-size:13px">\u26a0 ${msg}</span>`;
  setTimeout(() => { el.innerHTML = prev; }, 2200);
}

function _hxModeSwitch(mode) {
  const isRH = mode === 'rh';
  document.getElementById('mode-rh')?.classList.toggle('active',  isRH);
  document.getElementById('mode-x') ?.classList.toggle('active', !isRH);
  const wRH = document.getElementById('wrap-rh');
  const wX  = document.getElementById('wrap-x');
  if (wRH) wRH.style.display = isRH ? '' : 'none';
  if (wX)  wX.style.display  = isRH ? 'none' : '';
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mode-rh')?.addEventListener('click', () => _hxModeSwitch('rh'));
  document.getElementById('mode-x') ?.addEventListener('click', () => _hxModeSwitch('x'));
  document.getElementById('hx-set') ?.addEventListener('click', setHxState);
  ['hx-temp','hx-rh','hx-x'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') setHxState(); });
  });
  const canvas = document.getElementById('hxCanvas');
  if (canvas) _setupInteraction(canvas);
  _hxModeSwitch('rh');
  setTimeout(() => drawHxChart(null), 80);
  let _rt;
  window.addEventListener('resize', () => { clearTimeout(_rt); _rt = setTimeout(() => drawHxChart(_state), 120); });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'hx') setTimeout(() => drawHxChart(_state), 80);
    });
  });
});
