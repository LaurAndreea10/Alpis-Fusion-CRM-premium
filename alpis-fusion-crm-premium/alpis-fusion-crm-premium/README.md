# ALPis Fusion CRM — Premium Edition

> De la client nou la factură plătită, fără tool-uri separate.

Dashboard operațional all-in-one care combină **CRM, programări, pipeline, inbox, facturare, content, campanii, oferte, analytics, echipă, automatizări și AI** într-un singur front-end React. Funcționează fără backend — date demo cu localStorage persistence.

## Demo live

```
https://laurandreea10.github.io/Alpis-Fusion-CRM/
```

## Captură de ecran

Aplicația pornește cu un **hero screen animat** cu orbs, gradient text și guided tour în 4 pași. După intrare, dashboardul arată KPI-uri cu sparkline, live ticker, AI suggestions, pipeline funnel, kanban board și revenue forecast.

## Stack

- **Vite** — build tool
- **React 18** — single-file component architecture (1900+ linii)
- **Plain CSS** — design system complet cu CSS variables, dark/light theme
- **localStorage** — persistență cu autosave la 30 secunde
- **GitHub Actions** — deploy automat pe GitHub Pages

## Features complete (v2.0 Premium)

### Core CRM
- 12 clienți demo cu scoring automat (0-100), segmentare pe tag-uri, timeline completă
- Sortare pe coloane (nume, scor), filtrare pe tag (VIP, new, inactive, premium, returning)
- Paginare (10/pagină), bulk select cu checkbox, bulk tag, bulk delete
- Pin/favorite clienți, duplicate email detection
- Hover preview card cu scoring, programări, venit total
- Detail panel lateral cu timeline, deals, mesaje, acțiuni rapide
- Adăugare notițe pe client, tag management per client
- Search highlighting, global search (clienți + bookings + facturi)

### Pipeline (Sales)
- Board Kanban cu 5 coloane: Lead → Contacted → Offer → Won → Lost
- Add/edit/delete deals cu formular modal
- Move deals între etape, generare ofertă din deal
- Pipeline total value pe dashboard

### Inbox unificat
- WhatsApp + Email într-o singură listă
- Răspuns AI cu un click
- Status tracking (new, sent, replied)
- Delete mesaje

### Programări & Servicii
- 5 servicii demo cu preț, durată, categorie
- 3 angajați cu roluri
- Sloturi libere pe 7 zile
- Booking conflict detection (⚠ badge animat)
- Toggle status cu click (confirmed ↔ completed ↔ pending)
- Facturare directă din orice booking (buton ⊡)
- Booking public — formular self-service cu auto lead capture

### Calendar
- Vizualizare 7 zile cu toate programările
- Slot-uri afișate per zi

### Content Studio
- Postări cu titlu, categorie, tag-uri, status (draft/scheduled/published)
- Add/edit/delete cu formular modal
- Empty state informativ

### Campanii
- Campaign builder cu segment, canal, reach, conversii
- Lansare/pauză campanie
- Campanie AI generată automat
- Metrici: reach total, conversii, campanii active, segment top

### Oferte (Quotes)
- Draft, trimise, acceptate
- Generare din pipeline sau AI
- Toggle status, delete

### Facturare
- Generare din orice booking
- Toggle paid/unpaid cu click
- Print Invoice PDF — deschide fereastră printabilă cu layout profesional
- Export CSV și JSON
- Detecție duplicat (nu se facturează același booking de 2 ori)

### Analytics
- Venit total, LTV mediu, retenție %, win rate %
- Grafice: venit/serviciu, tag-uri clienți, pipeline distribution

### Team Performance
- Per angajat: programări, finalizate, conversie %, venit

### AI Assistant
- Sugestii contextuale bazate pe starea datelor
- Smart scheduling — sloturi recomandate
- Follow-up AI, generare ofertă, campanie AI
- Acțiuni executabile cu un click

### Automatizări
- Flow builder vizual (Client → Email → Booking → Reminder → Factură → Follow-up)
- 4 reguli: reminder, follow-up, client nou → task, factură automată
- Toggle on/off, rulare manuală
- Flow stage list (IF → WAIT → SEND → CREATE)

### UX Premium
- **Hero screen** cu orbs animate, gradient text, guided tour 4 pași
- **Command palette** (⌘K) cu navigare + acțiuni
- **Live activity ticker** cu simulare în timp real
- **Dark/Light theme** toggle animat
- **Notification center** cu dropdown, count badge, click-to-navigate
- **Keyboard shortcuts**: D/C/B/P/F/I/A/S/N/? pentru navigare + acțiuni
- **Keyboard help modal** (tasta ?)
- **Staggered animations** pe KPI cards, grid cards
- **Noise texture overlay** (grain SVG subtil)
- **Gradient mesh background** pe content area
- **Autosave** la 30 secunde + save on tab close + manual save
- **Confirm dialog** la reset (nu se pierd date accidental)
- **Toast system** cu 3 tipuri (success, error, info) + undo
- **Undo pe ștergere** cu toast persistent
- **Bottom nav mobile** — 5 butoane fixe pe ecrane mici
- **RBAC** — 3 roluri (admin/staff/viewer) cu permisiuni
- **Avatare** cu inițiale colorate per client
- **Scroll to top** automat la navigare între views
- **Click outside** închide notificări
- **Aria labels** pe modals și butoane
- **Revenue forecast** cu proiecție zilnică/lunară și goal tracking
- **Activity log** în settings
- **Backup/Restore** JSON complet
- **Export** CSV (clienți, bookings, facturi) + JSON (all)

### Settings & Audit
- Selector rol (admin/staff/viewer)
- Exporturi: All JSON, CSV Clienți, CSV Programări, CSV Facturi
- Statistici sistem (clienți, programări, facturi, deals, mesaje, tasks)
- Autosave status cu timestamp
- Backup download + Restore upload

## Structura proiect

```
alpis-fusion-crm-premium/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions → GitHub Pages
├── public/
├── src/
│   ├── App.jsx                 # Aplicația completă (1900+ linii)
│   └── main.jsx                # Entry point React
├── .gitignore
├── index.html                  # HTML entry cu favicon SVG inline
├── LICENSE                     # MIT
├── package.json                # Vite + React 18
├── README.md
└── vite.config.js              # base path pentru GitHub Pages
```

## Getting started

Instalare dependințe:

```bash
npm install
```

Rulare locală:

```bash
npm run dev
```

Build producție:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

## Deploy pe GitHub Pages

Repo-ul e configurat pentru deploy automat.

### Setup

1. Push pe branch-ul `main` al repository-ului `Alpis-Fusion-CRM`.
2. Deschide **Settings → Pages**.
3. La **Source**, alege **GitHub Actions**.
4. Push orice commit pe `main`.
5. Așteaptă workflow-ul din **Actions** să termine.

Site-ul va fi publicat la:

```
https://laurandreea10.github.io/Alpis-Fusion-CRM/
```

### Important

- Vite config folosește `base: '/Alpis-Fusion-CRM/'` — trebuie să coincidă cu numele repo-ului
- GitHub Pages publică output-ul `dist`, NU sursele raw
- Workflow-ul din `.github/workflows/deploy.yml` se ocupă de tot

## Evoluția proiectului

| Versiune | Ce s-a adăugat |
|----------|----------------|
| v1.0 | CRM de bază, programări, servicii, facturare, content, automatizări |
| v1.5 | Charts SVG, modals CRUD, toast, edit/delete pe toate modulele |
| v2.0 Premium | Hero + guided tour, command palette, pipeline, inbox, campanii, oferte, analytics, team, AI, booking public, settings, bulk actions, pagination, revenue forecast, activity log, keyboard shortcuts, hover preview, dark/light theme, autosave, print PDF, drag kanban, noise texture, stagger animations |

## Ce demonstrează acest proiect

- **Component Architecture** — modul unic cu state centralizat, 1900+ linii organizate
- **State Management** — React hooks (useState, useEffect, useMemo, useCallback, useRef), persistent state cu localStorage, autosave
- **UX Flows** — guided tour, command palette, hover previews, toast + undo, confirm dialogs, keyboard shortcuts
- **Product Thinking** — de la nevoie (CRM) la soluție completă cu 18 module integrate
- **RBAC** — 3 roluri cu permisiuni granulare
- **Responsive** — desktop sidebar → mobile bottom nav, pipeline/grids adaptate
- **Design System** — CSS variables, dark/light theme, Outfit + JetBrains Mono, 40+ componente stilizate
- **Performance** — useMemo pe computed data, pagination, lazy rendering
- **Accessibility** — aria labels, keyboard navigation, focus management

## Keyboard shortcuts

| Shortcut | Acțiune |
|----------|---------|
| `⌘K` / `Ctrl+K` | Command palette |
| `D` | Dashboard |
| `C` | Clienți |
| `B` | Bookings |
| `P` | Pipeline |
| `F` | Facturare |
| `I` | Inbox |
| `A` | Analytics |
| `S` | Setări |
| `N` | Acțiune rapidă |
| `?` | Keyboard help |
| `Escape` | Închide modal/panel/overlay |

## Licență

MIT — vezi [LICENSE](./LICENSE)
