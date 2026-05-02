# TechCalc Pro — Design System v3.0

## 📋 Projektübersicht

**TechCalc Pro** ist ein professionelles HLK-Schnellwerkzeug als Progressive Web App mit modernem Design System.

- **Aktuelle Version:** v3.0 (Design System Refactor)
- **Build-Datum:** 2026-05-02
- **Live-URL:** https://7cpjrm4s4c-ship-it.github.io/BETA-Phase/

---

## 🎨 Design System v3.0

### CSS-Architektur (Cascade)

```
tokens.css   → Design Tokens (Variablen, 8px Scale)
layout.css   → Grid, Responsive, Header, Modals
styles.css   → Komponenten-Styling
app.css      → States, Animations
```

### Optimierungen

| Metrik | Vorher | Nachher | Reduktion |
|--------|--------|---------|-----------|
| Gesamtzeilenanzahl | 4799 | 1280 | -73% |
| Dateigrößen | 211 KB | 51 KB | -76% |
| !important Vorkommen | 2106 | 0 | -100% |
| Doppelte Selektoren | 120+ | 0 | -100% |

---

## 🚀 Deployment

### 1. Dateien entpacken

```bash
unzip techcalc-pro-DESIGN-SYSTEM-V3.zip
cd techcalc-pro
```

### 2. Zu GitHub Pages pushen

```bash
# Im Repository-Root:
cp -r techcalc-pro/* BETA-Phase/

git add -A
git commit -m "feat: Design System v3.0 - CSS Refactoring"
git push origin main
```

### 3. Cache leeren (WICHTIG!)

**Browser:** Strg+Shift+Entf → Cookies/Cache für 7cpjrm4s4c-ship-it.github.io löschen → F5

**PWA:** Deinstallieren → Neu installieren

### 4. Test

Öffne: https://7cpjrm4s4c-ship-it.github.io/BETA-Phase/

---

## 📁 Dateien (12 Dateien, 220 KB)

### CSS (51 KB)
- `tokens.css` (9.2 KB) — Design Tokens
- `layout.css` (13 KB) — Grid & Layout
- `styles.css` (18 KB) — Komponenten
- `app.css` (11 KB) — States & Animations

### HTML/Config (72 KB)
- `index.html` (69 KB) — Hauptdatei
- `manifest.json` (841 B) — PWA Config
- `sw.js` (2.4 KB) — Service Worker

### JavaScript (163 KB)
- `app.js` (37 KB)
- `heating-cooling.js` (18 KB)
- `hx-engine.js` (35 KB)
- `pdf-export.js` (54 KB)
- `trinkwasser.js` (19 KB)

---

## ✨ Features

✅ 12-Column Responsive Grid  
✅ Mobile-First Design  
✅ Dark/Light Mode Support  
✅ 8px Spacing Scale  
✅ Semantic Color System  
✅ Zero !important  
✅ Service Worker Caching  
✅ PWA Installierbar  
✅ iOS Notch Support  
✅ Zero CSS Duplication  

---

**Ready to deploy! 🚀**
