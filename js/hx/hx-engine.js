// ===== SAFE NUMBER PARSER =====
function num(v) {
  if (v === null || v === undefined) return NaN;

  const n = parseFloat(
    String(v)
      .replace(/−|–|--/g, "-")
      .replace(",", ".")
      .trim()
  );

  return isNaN(n) ? NaN : n;
}

// ===== GLOBAL STATE =====
let currentState = null;

// ===== SET STATE =====
function setHxState() {
  const tInput = document.getElementById("hx-temp");
  const rhInput = document.getElementById("hx-rh");
  const xInput = document.getElementById("hx-x");

  const T = num(tInput?.value);
  const phi = num(rhInput?.value);
  const x = num(xInput?.value);

  // MODE: T + φ oder T + x
  let state = {};

  if (!isNaN(T) && !isNaN(phi)) {
    state = { T, phi, mode: "T_phi" };
  } else if (!isNaN(T) && !isNaN(x)) {
    state = { T, x, mode: "T_x" };
  } else {
    console.warn("Ungültiger Zustand");
    return;
  }

  currentState = state;

  console.log("STATE SET:", state);

  renderHxState(state);
}

// ===== BASIC RENDER =====
function renderHxState(state) {
  const out = document.getElementById("hx-debug");

  if (!out) return;

  out.innerText = `
T: ${state.T ?? "-"}
φ: ${state.phi ?? "-"}
x: ${state.x ?? "-"}
Mode: ${state.mode}
  `;
}

// ===== EVENT BINDING =====
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("hx-set");

  if (!btn) {
    console.warn("hx-set button not found");
    return;
  }

  btn.addEventListener("click", setHxState);
});