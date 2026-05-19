# FlowBuilderV2 — Integrare în Alpis Fusion CRM

## Ce primești

Un modul React auto-conținut (`FlowBuilderV2.jsx`) care adaugă:

- **Triggers compuse**: AND, OR, SEQUENCE
- **5 templates pre-built**:
  1. Lead inactiv 48h → reminder
  2. Status Won + booking confirmat → factură + follow-up
  3. Tag VIP + revenue > 1000€ → upgrade campaign
  4. Sequence Lead → Contact → Offer → ofertă personalizată
  5. Booking conflict → notificare admin + reasignare
- **Canvas SVG** cu drag-and-drop noduri
- **Conexiuni** prin click pe portul drept → portul stâng
- **Mini-map** pentru flow-uri complexe
- **Export/Import JSON** pentru sharing
- **Persistență** în `localStorage` la cheia `alpis-flows-v2`
- **Bilingv** RO/EN prin prop-ul `lang`
- **Theme-aware** prin variabilele CSS deja existente în Alpis

---

## Fișier adăugat

```txt
Alpis-Fusion-CRM-premium/
├── App.jsx
├── FlowBuilderV2.jsx    # nou
├── main.jsx
└── flow-builder/
    └── INTEGRATION.md
```

---

## Integrare în App.jsx

### 1. Import

În partea de sus din `App.jsx`, după importurile React:

```jsx
import FlowBuilderV2 from './FlowBuilderV2.jsx';
```

### 2. View nou

În zona unde se decide view-ul curent, adaugă:

```jsx
{view === 'flowbuilder-v2' && (
  <FlowBuilderV2 lang={lang} onClose={() => setView('dashboard')} />
)}
```

Dacă aplicația folosește `currentView`, `activeView`, `tab` sau alt nume, adaptează condiția:

```jsx
{activeView === 'flowbuilder-v2' && (
  <FlowBuilderV2 lang={lang} onClose={() => setActiveView('dashboard')} />
)}
```

### 3. Buton în sidebar/navigation

Adaugă un buton nou în zona de navigare:

```jsx
<button
  className={view === 'flowbuilder-v2' ? 'nav-btn active' : 'nav-btn'}
  onClick={() => setView('flowbuilder-v2')}
>
  <span className="nav-icon">🔀</span>
  Flow Builder v2
</button>
```

Variantă admin-only:

```jsx
{state.role === 'admin' && (
  <button
    className={view === 'flowbuilder-v2' ? 'nav-btn active' : 'nav-btn'}
    onClick={() => setView('flowbuilder-v2')}
  >
    <span className="nav-icon">🔀</span>
    Flow Builder v2
  </button>
)}
```

---

## Test local

```bash
npm install
npm run dev
```

Verifică:

- [ ] View-ul `Flow Builder v2` apare în sidebar
- [ ] Click pe view → se văd templates + saved flows
- [ ] Click pe un template → nodurile apar pe canvas
- [ ] Drag pe noduri funcționează
- [ ] Click port dreapta → port stânga creează conexiune
- [ ] Save persistă în localStorage
- [ ] Export JSON descarcă fișier
- [ ] Import JSON încarcă flow
- [ ] RO/EN se păstrează prin prop-ul `lang`

---

## Commit recomandat

```bash
git add FlowBuilderV2.jsx flow-builder/INTEGRATION.md App.jsx
git commit -m "feat: add Flow Builder v2 with compound triggers"
git push origin main
```

---

## Roadmap v2.1

- [ ] Time delays vizuale (`WAIT 24h` între triggers și actions)
- [ ] Test mode cu date mock
- [ ] Conditions pe edges
- [ ] Flow versioning
- [ ] Webhook trigger
