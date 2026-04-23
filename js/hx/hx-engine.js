// hx-engine-complete.js
// Vollständige Basisversion für h,x-Diagramm + Zustandsberechnung + Zielzustand
// + Luftbehandlung + PDF Export (A4 Hochformat)
// UI ist auf bestehendes Layout abgestimmt.

// =====================================================
// SAFE NUMBER PARSER
// =====================================================

function num(v) {
  if (v === undefined || v === null) return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

// =====================================================
// THERMODYNAMIK
// =====================================================

function calcHumidityRatio(T, phi) {
  const pws = 610.94 * Math.exp((17.625 * T) / (T + 243.04));
  const pw = (phi / 100) * pws;
  const p = 101325;
  const x = 0.622 * pw / (p - pw);
  return +(x * 1000).toFixed(2); // g/kg
}

function calcRelativeHumidity(T, x) {
  const xkg = x / 1000;
  const p = 101325;
  const pw = (xkg * p) / (0.622 + xkg);
  const pws = 610.94 * Math.exp((17.625 * T) / (T + 243.04));
  return +((pw / pws) * 100).toFixed(1);
}

function calcEnthalpy(T, x) {
  const xkg = x / 1000;
  return +(1.006 * T + xkg * (2501 + 1.86 * T)).toFixed(1);
}

// =====================================================
// GLOBAL STATE
// =====================================================

let startState = null;
let targetState = null;

// =====================================================
// SET START STATE
// =====================================================

function setHxState() {
  const modePhi = document.getElementById('mode-phi');

  const T = num(document.getElementById('hx-temp').value);
  const rh = num(document.getElementById('hx-rh').value);
  const xInput = num(document.getElementById('hx-x').value);

  if (isNaN(T)) return;

  let phi;
  let x;

  if (modePhi && modePhi.classList.contains('active')) {
    if (isNaN(rh)) return;
    phi = rh;
    x = calcHumidityRatio(T, phi);
  } else {
    if (isNaN(xInput)) return;
    x = xInput;
    phi = calcRelativeHumidity(T, x);
  }

  startState = {
    T,
    phi,
    x,
    h: calcEnthalpy(T, x)
  };

  renderStartState();
  drawHxChart();
}

// =====================================================
// SET TARGET STATE
// =====================================================

function setTargetState() {
  const T = num(document.getElementById('target-temp').value);
  const phi = num(document.getElementById('target-rh').value);

  if (isNaN(T) || isNaN(phi)) return;

  const x = calcHumidityRatio(T, phi);

  targetState = {
    T,
    phi,
    x,
    h: calcEnthalpy(T, x)
  };

  renderProcessSteps();
  drawHxChart();
}

// =====================================================
// RENDER STATE
// =====================================================

function renderStartState() {
  if (!startState) return;

  setText('state-temp', `${startState.T} °C`);
  setText('state-rh', `${startState.phi} %`);
  setText('state-x', `${startState.x} g/kg`);
  setText('state-h', `${startState.h} kJ/kg`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// =====================================================
// LUFTBEHANDLUNG
// =====================================================

function renderProcessSteps() {
  const box = document.getElementById('process-result');
  if (!box || !startState || !targetState) return;

  const deltaT = +(targetState.T - startState.T).toFixed(1);
  const deltaX = +(targetState.x - startState.x).toFixed(2);

  let action = 'Keine Änderung';

  if (deltaT > 0) action = 'Heizen';
  if (deltaT < 0) action = 'Kühlen';
  if (deltaX > 0) action += ' + Befeuchten';
  if (deltaX < 0) action += ' + Entfeuchten';

  box.innerHTML = `
    <div><strong>Start:</strong> ${startState.T} °C / ${startState.phi} %</div>
    <div><strong>Ziel:</strong> ${targetState.T} °C / ${targetState.phi} %</div>
    <div><strong>Prozess:</strong> ${action}</div>
    <div><strong>ΔT:</strong> ${deltaT} K</div>
    <div><strong>Δx:</strong> ${deltaX} g/kg</div>
  `;
}

// =====================================================
// CHART MASTER
// =====================================================

function drawHxChart() {
  const canvas = document.getElementById('hxCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width;
  canvas.height = height;

  drawBackground(ctx, width, height);
  drawGrid(ctx, width, height);
  drawSaturationCurve(ctx, width, height);
  drawTemperatureLines(ctx, width, height);
  drawAxes(ctx, width, height);

  if (startState) drawStatePoint(ctx, width, height, startState, '#6d63ff');
  if (targetState) drawStatePoint(ctx, width, height, targetState, '#32d296');
}

function drawBackground(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#050814';
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawSaturationCurve(ctx, width, height) {
  ctx.beginPath();
  ctx.strokeStyle = '#7aa2ff';
  ctx.lineWidth = 3;

  let first = true;

  for (let T = -10; T <= 50; T += 1) {
    const x = calcHumidityRatio(T, 100);
    const h = calcEnthalpy(T, x);

    const px = (x / 30) * width;
    const py = height - (h / 100) * height;

    if (first) {
      ctx.moveTo(px, py);
      first = false;
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.stroke();
}

function drawTemperatureLines(ctx, width, height) {
  const temperatures = [-10, 0, 10, 20, 30, 40, 50];

  temperatures.forEach(T => {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;

    let first = true;

    for (let phi = 5; phi <= 100; phi += 2) {
      const x = calcHumidityRatio(T, phi);
      const h = calcEnthalpy(T, x);

      const px = (x / 30) * width;
      const py = height - (h / 100) * height;

      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  });
}

function drawAxes(ctx, width, height) {
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText('x [g/kg]', width - 70, height - 10);
  ctx.fillText('h [kJ/kg]', 10, 20);
}

function drawStatePoint(ctx, width, height, state, color) {
  const px = (state.x / 30) * width;
  const py = height - (state.h / 100) * height;

  ctx.beginPath();
  ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// =====================================================
// PDF EXPORT
// =====================================================

function exportHxPdf() {
  if (!window.jspdf) return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  pdf.setFontSize(16);
  pdf.text('Massenstromrechner – h,x-Auswertung', 20, 20);

  if (startState) {
    pdf.setFontSize(12);
    pdf.text(`Startzustand: ${startState.T} °C | ${startState.phi} % | ${startState.x} g/kg`, 20, 35);
  }

  if (targetState) {
    pdf.text(`Zielzustand: ${targetState.T} °C | ${targetState.phi} % | ${targetState.x} g/kg`, 20, 45);
  }

  pdf.save('hx-auswertung.pdf');
}

// =====================================================
// INIT
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
  const setBtn = document.getElementById('hx-set');
  const targetBtn = document.getElementById('target-set');
  const pdfBtn = document.getElementById('pdf-export');

  if (setBtn) setBtn.addEventListener('click', setHxState);
  if (targetBtn) targetBtn.addEventListener('click', setTargetState);
  if (pdfBtn) pdfBtn.addEventListener('click', exportHxPdf);

  drawHxChart();
});
