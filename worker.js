/* ─── Massenstrom PWA – Calculation Worker ───────────────────
   Nimmt Berechnungsaufgaben vom Hauptthread entgegen,
   führt sie im Hintergrund aus und sendet Ergebnisse zurück.
   Einsatz: aufwändige Iterationen (z. B. Colebrook-White über
   viele DN-Stufen oder Netzwerkberechnungen).
─────────────────────────────────────────────────────────── */

self.onmessage = (e) => {
  const { type, payload, id } = e.data;

  try {
    switch (type) {
      case 'colebrook': {
        const result = colebrook(payload.Re, payload.eps, payload.D);
        self.postMessage({ id, type, result });
        break;
      }
      case 'pipe_table': {
        const result = calcPipeTable(payload);
        self.postMessage({ id, type, result });
        break;
      }
      default:
        self.postMessage({ id, error: `Unknown type: ${type}` });
    }
  } catch (err) {
    self.postMessage({ id, error: err.message });
  }
};

/* ─── Colebrook-White ────────────────────────────────────── */
function colebrook(Re, eps, D) {
  if (Re <= 0)   return 64;
  if (Re < 2300) return 64 / Re;   // Laminar
  const r = eps / (3.7 * D);
  let lam = 0.02;
  for (let i = 0; i < 12; i++) {
    lam = Math.pow(-2 * Math.log10(r + 2.51 / (Re * Math.sqrt(lam))), -2);
  }
  return lam;
}

/* ─── Full pipe table calculation ───────────────────────── */
function calcPipeTable({ mKgs, rho, nu, eps, pipes, L }) {
  return pipes.map(([DN, di_mm]) => {
    const di  = di_mm / 1000;
    const A   = Math.PI * di * di / 4;
    const v   = mKgs / (rho * A);
    const Re  = v * di / nu;
    const lam = colebrook(Re, eps, di);
    const R   = lam * (1 / di) * (rho * v * v / 2);
    const dP  = R * L;
    const ok  = v >= 0.3 && v <= 1.5 && R >= 50 && R <= 300;
    return { DN, di_mm, v, Re, lam, R, dP, ok };
  });
}
