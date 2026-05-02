/* ENTWAESSERUNG — Entwässerung */
'use strict';

const EW_FIXTURES = [
  { key:'wc_6',       label:'WC 6 l',         du:2.0,  pipe:'DN 90 / DN 100' },
  { key:'wc_9',       label:'WC 9 l',         du:2.5,  pipe:'DN 100' },
  { key:'washbasin',  label:'Waschtisch',     du:0.5,  pipe:'DN 40 / DN 50' },
  { key:'shower',     label:'Dusche',         du:0.8,  pipe:'DN 50' },
  { key:'bath',       label:'Badewanne',      du:0.8,  pipe:'DN 50' },
  { key:'sink',       label:'Küchenspüle',    du:0.8,  pipe:'DN 50' },
  { key:'dishwasher', label:'Geschirrspüler', du:0.8,  pipe:'DN 50' },
  { key:'washer',     label:'Waschmaschine',  du:0.8,  pipe:'DN 50' },
  { key:'floor',      label:'Bodenablauf',    du:0.8,  pipe:'DN 50 / DN 70' },
];

const EW_K = {
  wohn:   { label:'Wohngebäude', k:0.5 },
  buero:  { label:'Büro',        k:0.5 },
  hotel:  { label:'Hotel',       k:0.7 },
  schule: { label:'Schule',      k:0.7 },
};

const EW_STATE = { result:null, straenge: [] };
window.EW_STATE = EW_STATE;

function ewNum(v) {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(',', '.').trim());
  return isNaN(n) ? 0 : n;
}

function calcEntwaesserung() {
  const use = document.getElementById('ew-use')?.value || 'wohn';
  const kData = EW_K[use] || EW_K.wohn;
  let duTotal = 0;

  EW_FIXTURES.forEach(f => {
    const n = Math.max(0, Math.round(ewNum(document.getElementById('ew-' + f.key)?.value)));
    duTotal += n * f.du;
  });

  const qww = duTotal > 0 ? kData.k * Math.sqrt(duTotal) : 0;
  const result = { use, k: kData.k, duTotal, qww };
  EW_STATE.result = result;

  const set = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  set('ew-du-total', duTotal.toFixed(1));
  set('ew-qww', qww.toFixed(2));
}

document.addEventListener('DOMContentLoaded', () => {
  EW_FIXTURES.forEach(f => {
    document.getElementById('ew-' + f.key)?.addEventListener('input', calcEntwaesserung);
  });
  calcEntwaesserung();
});
