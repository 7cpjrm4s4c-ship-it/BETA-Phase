/* ═══════════════════════════════════════════════════════
   hx-engine.js  v5.0  —  Massenstromrechner PWA
   Echtes Mollier h,x-Diagramm

   KOORDINATENSYSTEM (wie Original):
   · Y-Achse vertikal:   T [°C] — Trockenkugeltemperatur
   · X-Achse horizontal: x [g/kg] — Feuchtegehalt
   · Isotherme:          horizontale Linien (T = const)
   · φ-Kurven:           Kurven von unten-links nach oben-rechts
   · Isenthalpen:        Diagonalen von oben-links nach unten-rechts
   · Sättigungskurve:    rechte/obere Grenze (φ=100%)
═══════════════════════════════════════════════════════ */
'use strict';

/* ─── PHYSIK ─── */
const P_ATM = 1013.25; // hPa

function pws(T) { return 6.112 * Math.exp(17.62 * T / (243.12 + T)); }

function calcX(T, phi) {
  if (isNaN(T) || isNaN(phi) || phi <= 0) return 0;
  const pw = phi / 100 * pws(T);
  if (pw >= P_ATM) return 999;
  return +(1000 * 0.622 * pw / (P_ATM - pw)).toFixed(3);
}

function calcH(T, x) { return 1.006 * T + (x / 1000) * (2501 + 1.86 * T); }

function calcPhi(T, x) {
  if (isNaN(T) || isNaN(x) || x < 0) return NaN;
  const pw = (x / 1000) * P_ATM / (0.622 + x / 1000);
  return +(100 * pw / pws(T)).toFixed(1);
}

function calcTdew(x) {
  if (isNaN(x) || x <= 0) return NaN;
  const pw = (x / 1000) * P_ATM / (0.622 + x / 1000);
  const lp = Math.log(pw / 6.112);
  return +(243.12 * lp / (17.62 - lp)).toFixed(1);
}

function calcTwet(T, x) {
  if (isNaN(T) || isNaN(x)) return NaN;
  let tw = T - Math.max(0, T - (calcTdew(x) || T)) * 0.4;
  for (let i = 0; i < 40; i++) {
    const tn = T - (calcX(tw, 100) - x) * (2501 + 1.86 * tw) / (1.006 + 1.805 * x / 1000);
    if (Math.abs(tn - tw) < 0.001) { tw = tn; break; }
    tw = tn;
  }
  return +tw.toFixed(1);
}

function numHx(v) {
  if (v == null || String(v).trim() === '') return NaN;
  return parseFloat(String(v).replace(/[−–—]/g, '-').replace(',', '.').trim());
}

/* ─── KONFIGURATION ─── */
const CFG = {
  // Achsenbereiche
  xMin: 0,  xMax: 30,    // g/kg — Feuchtegehalt (X-Achse)
  tMin: -20, tMax: 50,   // °C   — Temperatur     (Y-Achse)
  // Paddings
  pad: { top: 18, right: 58, bottom: 40, left: 46 },
  // Kurven
  phis:   [10, 20, 30, 40, 50, 60, 70, 80, 90],
  isoT:   [-20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  isoH:   [-20, -10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  // Achsen-Ticks
  xTicks: [0, 5, 10, 15, 20, 25, 30],
  tTicks: [-20, -10, 0, 10, 20, 30, 40, 50],
};

/* ─── KOORDINATEN-TRANSFORMATION ─── */
// Physikalisch (x [g/kg], T [°C]) → Canvas-Pixel
function toCanvas(x, T, W, H) {
  const { pad: p, xMin, xMax, tMin, tMax } = CFG;
  const cw = W - p.left - p.right;
  const ch = H - p.top  - p.bottom;
  return {
    px: p.left + (x - xMin) / (xMax - xMin) * cw,
    py: p.top  + ch - (T - tMin) / (tMax - tMin) * ch,
  };
}

// Canvas-Pixel → physikalisch (x, T)
function fromCanvas(px, py, W, H) {
  const { pad: p, xMin, xMax, tMin, tMax } = CFG;
  const cw = W - p.left - p.right;
  const ch = H - p.top  - p.bottom;
  return {
    x: Math.max(0, (px - p.left) / cw * (xMax - xMin) + xMin),
    T: tMax - (py - p.top) / ch * (tMax - tMin),
  };
}

/* ─── GLOBALER ZUSTAND ─── */
let _state = null;
window._hxState = null;

/* ─── HAUPT-DRAW ─── */
function drawHxChart(state) {
  const canvas = document.getElementById('hxCanvas');
  if (!canvas) return;

  const dpr  = window.devicePixelRatio || 1;
  const rect  = canvas.getBoundingClientRect();
  const W = Math.round(rect.width)  || 340;
  const H = Math.round(rect.height) || 400;
  if (W < 10 || H < 10) return;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Hintergrund
  ctx.fillStyle = '#040810';
  ctx.fillRect(0, 0, W, H);

  // Zeichenreihenfolge (wie im Original Mollier)
  _drawHContours(ctx, W, H);  // Isenthalpen (hinterste Ebene)
  _drawPhiCurves(ctx, W, H);  // φ-Kurven
  _drawSaturation(ctx, W, H); // Sättigungskurve φ=100%
  _drawIsotherms(ctx, W, H);  // Isotherme (horizontale Linien)
  _drawAxes(ctx, W, H);       // Achsen + Labels
  if (state) _drawStatePoint(ctx, W, H, state);
}

/* ─── ISENTHALPEN (h = const) — diagonale Linien oben-links → unten-rechts ─── */
function _drawHContours(ctx, W, H) {
  CFG.isoH.forEach(h => {
    ctx.save();
    ctx.strokeStyle = h === 0
      ? 'rgba(255,255,255,0.18)'
      : 'rgba(255,255,255,0.07)';
    ctx.lineWidth = h === 0 ? 1.0 : 0.6;
    ctx.beginPath();
    let first = true;
    for (let T = CFG.tMin - 2; T <= CFG.tMax + 2; T += 0.5) {
      // x aus h = 1.006*T + x/1000*(2501+1.86*T)
      const xVal = (h - 1.006 * T) * 1000 / (2501 + 1.86 * T);
      if (xVal < -0.5 || xVal > CFG.xMax + 0.5) { first = true; continue; }
      // Nur im ungesättigten Bereich
      const xSat = calcX(T, 100);
      if (xVal > xSat + 0.3) { first = true; continue; }
      const x  = Math.max(0, Math.min(xVal, CFG.xMax));
      const Tc = Math.max(CFG.tMin, Math.min(T, CFG.tMax));
      const { px, py } = toCanvas(x, Tc, W, H);
      first ? (ctx.moveTo(px, py), first = false) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Label: wo h-Linie die rechte Plot-Kante (x=xMax) schneidet
    const T_right = (h - CFG.xMax * (2501 + 1.86 * 0) / 1000) / 1.006;
    // Exakter: T aus h = 1.0618*T + 75.03 → T = (h-75.03)/1.0618 für x=30
    const T_r = (h - CFG.xMax / 1000 * 2501) / (1.006 + CFG.xMax / 1000 * 1.86);
    if (T_r >= CFG.tMin && T_r <= CFG.tMax) {
      const { px, py } = toCanvas(CFG.xMax, T_r, W, H);
      ctx.save();
      ctx.fillStyle = h === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.28)';
      ctx.font = '9px Arial,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(h + ' kJ', px + 3, py + 3);
      ctx.restore();
    }
  });
}

/* ─── φ-KURVEN (von unten-links nach oben-rechts) ─── */
function _drawPhiCurves(ctx, W, H) {
  CFG.phis.forEach(phi => {
    const acc = phi === 50;
    ctx.save();
    ctx.strokeStyle = acc ? 'rgba(90,160,255,0.42)' : 'rgba(80,130,255,0.18)';
    ctx.lineWidth = acc ? 1.4 : 0.8;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    let first = true;
    for (let T = CFG.tMin; T <= CFG.tMax; T += 0.5) {
      const x = calcX(T, phi);
      if (x < -0.5 || x > CFG.xMax + 0.3) { first = true; continue; }
      const { px, py } = toCanvas(Math.min(x, CFG.xMax), T, W, H);
      first ? (ctx.moveTo(px, py), first = false) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Label: in der Mitte der Kurve (bei T ≈ 25°C) oder rechts
    const Tlbl = Math.min(30, CFG.tMax - 8);
    const xlbl = calcX(Tlbl, phi);
    if (xlbl >= 0.5 && xlbl <= CFG.xMax - 0.5) {
      const { px, py } = toCanvas(xlbl, Tlbl, W, H);
      ctx.save();
      ctx.fillStyle = acc ? 'rgba(90,160,255,0.85)' : 'rgba(80,130,255,0.55)';
      ctx.font = (acc ? 'bold ' : '') + '9px Arial,sans-serif';
      ctx.textAlign = 'left';
      // Hintergrund
      ctx.fillStyle = 'rgba(4,8,16,0.70)';
      ctx.fillRect(px - 1, py - 9, 24, 12);
      ctx.fillStyle = acc ? 'rgba(90,160,255,0.85)' : 'rgba(80,130,255,0.55)';
      ctx.fillText(phi + ' %', px + 1, py);
      ctx.restore();
    }
  });
}

/* ─── SÄTTIGUNGSKURVE φ = 100% ─── */
function _drawSaturation(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = '#5ab0ff';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = 'rgba(90,176,255,0.40)';
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  let first = true;
  for (let T = CFG.tMin; T <= CFG.tMax; T += 0.3) {
    const x = calcX(T, 100);
    if (x > CFG.xMax + 0.3) break;
    const { px, py } = toCanvas(Math.min(x, CFG.xMax), T, W, H);
    first ? (ctx.moveTo(px, py), first = false) : ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // Label an der Kurve
  const Tl = 12, xl = calcX(Tl, 100);
  if (xl <= CFG.xMax - 2) {
    const { px, py } = toCanvas(xl, Tl, W, H);
    ctx.save();
    ctx.fillStyle = 'rgba(90,176,255,0.85)';
    ctx.font = 'bold 10px Arial,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('\u03c6\u202f=\u202f100\u202f%', px + 5, py - 5);
    ctx.restore();
  }
}

/* ─── ISOTHERME (horizontal, T = const) ─── */
function _drawIsotherms(ctx, W, H) {
  CFG.isoT.forEach(T => {
    const xSat = calcX(T, 100);
    const xEnd = Math.min(xSat, CFG.xMax);
    if (xEnd < 0) return;

    const p0 = toCanvas(0,    T, W, H);
    const p1 = toCanvas(xEnd, T, W, H);

    const isKey = T % 10 === 0;
    ctx.save();
    ctx.strokeStyle = isKey
      ? 'rgba(255,255,255,0.38)'
      : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = isKey ? 1.1 : 0.7;
    ctx.beginPath();
    ctx.moveTo(p0.px, p0.py);
    ctx.lineTo(p1.px, p1.py);
    ctx.stroke();
    ctx.restore();

    // Label links am Rand (NUR für 10er-Schritte oder T=0)
    if (isKey || T === 0) {
      ctx.save();
      ctx.font = (isKey ? 'bold ' : '') + '10px Arial,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = isKey
        ? 'rgba(255,255,255,0.70)'
        : 'rgba(255,255,255,0.45)';
      ctx.fillText(T + '\u00b0', p0.px - 3, p0.py + 3);
      ctx.restore();
    }
  });
}

/* ─── ACHSEN + BESCHRIFTUNG ─── */
function _drawAxes(ctx, W, H) {
  const { pad: p, xMin, xMax, tMin, tMax } = CFG;
  const cw = W - p.left - p.right;
  const ch = H - p.top  - p.bottom;

  // Achsenlinien
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(p.left, p.top);
  ctx.lineTo(p.left, p.top + ch);
  ctx.lineTo(p.left + cw, p.top + ch);
  ctx.stroke();
  ctx.restore();

  // Y-Achse: Temperatur-Ticks
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = '10px Arial,sans-serif';
  ctx.textAlign = 'right';
  CFG.tTicks.forEach(T => {
    const { py } = toCanvas(0, T, W, H);
    ctx.fillText(T, p.left - 4, py + 3);
    // Tick-Strich
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p.left, py);
    ctx.lineTo(p.left + cw, py);
    ctx.stroke();
    ctx.restore();
  });
  // Y-Achsen-Titel
  ctx.save();
  ctx.translate(12, p.top + ch / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = 'bold 11px Arial,sans-serif';
  ctx.fillText('T  [\u00b0C]', 0, 0);
  ctx.restore();
  ctx.restore();

  // X-Achse: Feuchtegehalt-Ticks
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = '10px Arial,sans-serif';
  ctx.textAlign = 'center';
  CFG.xTicks.forEach(x => {
    const { px } = toCanvas(x, tMin, W, H);
    ctx.fillText(x, px, p.top + ch + 13);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = 'bold 11px Arial,sans-serif';
  ctx.fillText('x  [g/kg]', p.left + cw / 2, p.top + ch + 30);
  ctx.restore();
}

/* ─── ZUSTANDSPUNKT ─── */
function _drawStatePoint(ctx, W, H, state) {
  if (!state || isNaN(state.T) || isNaN(state.x)) return;
  if (state.T < CFG.tMin || state.T > CFG.tMax) return;
  if (state.x < 0 || state.x > CFG.xMax) return;

  // Sättigungscheck
  const xSat = calcX(state.T, 100);
  if (state.x > xSat + 0.1) return;

  const { pad: p } = CFG;
  const cw = W - p.left - p.right;
  const ch = H - p.top  - p.bottom;
  const { px, py } = toCanvas(state.x, state.T, W, H);

  // Fadenkreuz
  ctx.save();
  ctx.strokeStyle = 'rgba(109,99,255,0.30)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(p.left, py); ctx.lineTo(p.left + cw, py); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px, p.top);  ctx.lineTo(px, p.top + ch); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Punkt + Glühen
  ctx.save();
  ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#6d63ff'; ctx.shadowColor = '#6d63ff'; ctx.shadowBlur = 18;
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(109,99,255,0.48)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  // Tooltip-Box
  const h = calcH(state.T, state.x);
  const lines = [
    'T  ' + state.T.toFixed(1) + ' \u00b0C',
    '\u03c6  ' + (isNaN(state.phi) ? '--' : state.phi.toFixed(1)) + ' %',
    'x  ' + state.x.toFixed(2) + ' g/kg',
    'h  ' + h.toFixed(1) + ' kJ/kg',
    'Td ' + (state.tdew != null && !isNaN(state.tdew) ? state.tdew.toFixed(1) : '--') + ' \u00b0C',
  ];
  const bw = 132, bh = lines.length * 16 + 14;
  let bx = px + 13, by = py - bh - 8;
  if (bx + bw > W - p.right - 4) bx = px - bw - 13;
  if (by < p.top + 4)             by = py + 14;

  ctx.save();
  ctx.fillStyle = 'rgba(8,10,22,0.92)'; ctx.strokeStyle = 'rgba(109,99,255,0.52)'; ctx.lineWidth = 1;
  _rr(ctx, bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '12px "Courier New",Courier,monospace'; ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + 9, by + 17 + i * 16));
  ctx.restore();
}

/* ─── HOVER-TOOLTIP ─── */
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
      const { x, T } = fromCanvas(px, py, W, H);
      if (x < CFG.xMin || x > CFG.xMax || T < CFG.tMin || T > CFG.tMax) {
        drawHxChart(_state); return;
      }
      const xSat = calcX(T, 100);
      drawHxChart(_state);
      _drawHover(canvas.getContext('2d'), W, H, {
        T: +T.toFixed(1),
        x: +Math.min(x, xSat).toFixed(2),
        phi: +calcPhi(T, Math.min(x, xSat)).toFixed(0),
        inFog: x > xSat + 0.1,
      });
    });
  }
  canvas.addEventListener('mousemove', e => handle(e.clientX, e.clientY), { passive: true });
  canvas.addEventListener('mouseleave', () => drawHxChart(_state));
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    handle(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
}

function _drawHover(ctx, W, H, s) {
  const { px, py } = toCanvas(s.x, s.T, W, H);
  ctx.save();
  ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fillStyle = s.inFog ? 'rgba(255,150,50,0.70)' : 'rgba(255,210,80,0.70)';
  ctx.shadowColor = 'rgba(255,200,60,0.55)'; ctx.shadowBlur = 10;
  ctx.fill(); ctx.restore();
  const lines = [
    'T ' + s.T.toFixed(1) + ' \u00b0C',
    '\u03c6 ' + (s.inFog ? 'Nebel' : s.phi + ' %'),
    'x ' + s.x.toFixed(2) + ' g/kg',
  ];
  const bw = 100, bh = lines.length * 15 + 10;
  let bx = px + 9, by = py - bh - 5;
  if (bx + bw > W - CFG.pad.right) bx = px - bw - 9;
  if (by < CFG.pad.top) by = py + 9;
  ctx.save();
  ctx.fillStyle = 'rgba(18,18,38,0.88)'; ctx.strokeStyle = 'rgba(255,200,60,0.38)'; ctx.lineWidth = 0.8;
  _rr(ctx, bx, by, bw, bh, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.80)'; ctx.font = '11px "Courier New",Courier,monospace'; ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + 7, by + 14 + i * 15));
  ctx.restore();
}

/* ─── HILFSFUNKTIONEN ─── */
function _rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

/* ─── ± VORZEICHEN TOGGLE ─── */
function toggleTempSign(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const v = parseFloat(String(inp.value).replace(',', '.').trim());
  if (isNaN(v) || v === 0) return;
  inp.value = String(-v).replace('.', ',');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ─── ZUSTAND SETZEN ─── */
function setHxState() {
  const T   = numHx(document.getElementById('hx-temp')?.value);
  const phi = numHx(document.getElementById('hx-rh')?.value);
  const xIn = numHx(document.getElementById('hx-x')?.value);
  const modeRH = document.getElementById('mode-rh')?.classList.contains('active');

  if (isNaN(T)) { _showHxError('Bitte Temperatur eingeben.'); return; }
  if (T < -30 || T > 60) { _showHxError('T: -30 bis +60 \u00b0C'); return; }

  let state;
  if (modeRH) {
    if (isNaN(phi) || phi <= 0 || phi > 100) { _showHxError('φ: 1\u2013100 %'); return; }
    const x = calcX(T, phi);
    state = { T, phi, x, h: calcH(T, x), tdew: calcTdew(x), twet: calcTwet(T, x) };
  } else {
    if (isNaN(xIn) || xIn < 0) { _showHxError('x \u2265 0 g/kg'); return; }
    const ph = calcPhi(T, xIn);
    state = { T, phi: ph, x: xIn, h: calcH(T, xIn), tdew: calcTdew(xIn), twet: calcTwet(T, xIn) };
  }

  _state = state; window._hxState = state;
  _renderState(state);
}

function _renderState(state) {
  const fmt = (v, d) => (isNaN(v) || v == null) ? '--' : (+v).toFixed(d);
  const se  = id => document.getElementById(id);

  // Hauptwert: Temperatur
  const mv = se('state-temp');
  if (mv) {
    mv.textContent = fmt(state.T, 1);
    mv.style.color = state.T < 0 ? 'var(--cold-t)' : 'var(--heat-t)';
  }
  // Sekundärwerte
  const vals = [
    ['state-phi',  fmt(state.phi,  1)],
    ['state-x',    fmt(state.x,    2)],
    ['state-h',    fmt(state.h,    1)],
    ['state-tdew', fmt(state.tdew, 1)],
  ];
  vals.forEach(([id, val]) => { const e = se(id); if (e) e.textContent = val; });

  drawHxChart(state);
}

function _showHxError(msg) {
  const el = document.getElementById('hx-state-result');
  if (!el) return;
  const prev = el.innerHTML;
  el.innerHTML = `<span style="color:rgba(255,100,80,.9);font-size:13px">\u26a0 ${msg}</span>`;
  setTimeout(() => { el.innerHTML = prev; }, 2200);
}

/* ─── BERECHNUNG PROZESS ─── */
function calcHxProcess() {
  if (!_state) { _showHxError('Zuerst Ausgangszustand setzen'); return; }
  const T2   = numHx(document.getElementById('hx-target-temp')?.value);
  const phi2 = numHx(document.getElementById('hx-target-rh')?.value);
  const proc = document.getElementById('hx-process')?.value;
  const res  = document.getElementById('hx-result');
  if (!res) return;

  if (isNaN(T2) && isNaN(phi2) && !proc) {
    res.innerHTML = '<span style="color:var(--t3)">Zielzustand oder Prozess eingeben.</span>';
    return;
  }

  const s1 = _state;
  let s2 = null, procName = proc || 'Zustandsänderung';

  // Zielzustand berechnen
  if (!isNaN(T2) && !isNaN(phi2)) {
    const x2 = calcX(T2, phi2);
    s2 = { T: T2, phi: phi2, x: x2, h: calcH(T2, x2), tdew: calcTdew(x2) };
  } else if (!isNaN(T2) && isNaN(phi2)) {
    // Gleicher x-Wert (Erwärmen/Kühlen sensibel)
    const x2 = s1.x;
    const ph2 = calcPhi(T2, x2);
    s2 = { T: T2, phi: ph2, x: x2, h: calcH(T2, x2), tdew: calcTdew(x2) };
    procName = T2 > s1.T ? 'Erwärmen' : 'Kühlen';
  }

  if (!s2) {
    res.innerHTML = '<span style="color:var(--t3)">Bitte Zieltemperatur eingeben.</span>';
    return;
  }

  const deltaT = s2.T - s1.T;
  const deltaX = s2.x - s1.x;
  const deltaH = s2.h - s1.h;

  const sign = v => v > 0 ? '+' : '';
  const fmt  = (v, d) => sign(v) + v.toFixed(d);

  res.innerHTML = `
    <div style="font-family:var(--fm);font-size:12px;line-height:1.8">
      <div style="color:var(--t2);margin-bottom:8px;font-size:13px;font-weight:700">${procName}</div>
      <div>Δt =&nbsp;<span style="color:var(--blue)">${fmt(deltaT,1)} K</span></div>
      <div>Δx =&nbsp;<span style="color:var(--blue)">${fmt(deltaX,2)} g/kg</span></div>
      <div>Δh =&nbsp;<span style="color:var(--blue)">${fmt(deltaH,1)} kJ/kg</span></div>
      <div style="margin-top:6px;color:var(--t3);font-size:11px">
        Z1: ${s1.T.toFixed(1)}\u00b0C / ${s1.phi.toFixed(0)}% → Z2: ${s2.T.toFixed(1)}\u00b0C / ${s2.phi.toFixed(0)}%
      </div>
    </div>`;

  // Zielzustand im Diagramm einzeichnen
  _drawTargetOnChart(s2);
}

function _drawTargetOnChart(s2) {
  const canvas = document.getElementById('hxCanvas');
  if (!canvas || !_state) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W   = parseInt(canvas.style.width)  || canvas.width / dpr;
  const H   = parseInt(canvas.style.height) || canvas.height / dpr;
  // Verbindungslinie
  const p1 = toCanvas(_state.x, _state.T, W, H);
  const p2 = toCanvas(s2.x, s2.T, W, H);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,140,60,0.65)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(p2.px, p2.py, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ff9c3a'; ctx.shadowColor = '#ff9c3a'; ctx.shadowBlur = 14;
  ctx.fill(); ctx.restore();
}

/* ─── MODUS φ ↔ x ─── */
function _hxModeSwitch(mode) {
  const isRH = mode === 'rh';
  document.getElementById('mode-rh')?.classList.toggle('active',  isRH);
  document.getElementById('mode-x') ?.classList.toggle('active', !isRH);
  const wr = document.getElementById('wrap-rh');
  const wx = document.getElementById('wrap-x');
  if (wr) wr.style.display = isRH ? '' : 'none';
  if (wx) wx.style.display = isRH ? 'none' : '';
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mode-rh') ?.addEventListener('click', () => _hxModeSwitch('rh'));
  document.getElementById('mode-x')  ?.addEventListener('click', () => _hxModeSwitch('x'));
  document.getElementById('hx-set')  ?.addEventListener('click', setHxState);
  document.getElementById('hx-calc') ?.addEventListener('click', calcHxProcess);

  ['hx-temp','hx-rh','hx-x'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') setHxState();
    });
  });

  const canvas = document.getElementById('hxCanvas');
  if (canvas) _setupInteraction(canvas);

  _hxModeSwitch('rh');
  setTimeout(() => drawHxChart(null), 80);

  let _rt;
  window.addEventListener('resize', () => {
    clearTimeout(_rt);
    _rt = setTimeout(() => drawHxChart(_state), 120);
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'hx') setTimeout(() => drawHxChart(_state), 80);
    });
  });
});
