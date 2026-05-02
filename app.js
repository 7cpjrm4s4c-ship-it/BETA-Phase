/* ═══════════════════════════════════════════════════════════════════════════════
   APP.JS — Globale Funktionen & Router
   - Tab-Management
   - Helper-Funktionen
   KEINE UI-Definitionen oder CSS-Regeln
═══════════════════════════════════════════════════════════════════════════════ */
'use strict';

// ─── GLOBAL HELPER ───
const $ = (id) => document.getElementById(id);
const show = (el, visible) => { if (el) el.style.display = visible ? '' : 'none'; };
const loc = (value, digits) => Number(value || 0).toLocaleString('de-DE', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits
});
const num = (value) => {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (v, d=1, u='') => {
  if (v == null || isNaN(v)) return '–';
  return Number(v).toLocaleString('de-DE', {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  }) + (u ? ' ' + u : '');
};

// ─── TAB ROUTER ───
function initRouter() {
  const tabs = document.querySelectorAll('[data-tab]');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = 'tab-' + tab.dataset.tab;  // ← FIX: Füge tab- prefix hinzu
      
      // Deactivate all
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('is-active'));
      
      // Activate selected
      tab.classList.add('active');
      $(tabId)?.classList.add('is-active');
    });
  });

  // Activate first tab
  if (tabs.length > 0) {
    tabs[0].classList.add('active');
    const firstPanel = $('tab-' + tabs[0].dataset.tab);  // ← FIX: Füge tab- prefix hinzu
    if (firstPanel) firstPanel.classList.add('is-active');
  }
}

// ─── INITIALIZATION ───
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
});

// ─── GLOBAL UTILITIES FOR MODULES ───
window.TCP = {
  $,
  show,
  loc,
  num,
  fmt,
};
