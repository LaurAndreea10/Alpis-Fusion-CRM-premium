💼 ALPIS FUSION CRM — PREMIUM EDITION

De la client nou la factură plătită, fără tool-uri separate. Un dashboard operațional all-in-one construit ca un front-end React, fără backend, fără dependințe plătite.

Show Image
Show Image
Show Image
Show Image

✨ Overview
ALPis Fusion CRM Premium este un dashboard operațional all-in-one care combină CRM, programări, pipeline de vânzări, inbox unificat, facturare, content studio, campanii, oferte, analytics, team performance, automatizări și asistent AI într-un singur front-end React.
Produsul rezolvă problema celor care folosesc 5-6 tool-uri separate pentru același flow: client nou → programare → ofertă → factură → follow-up. Totul într-o singură aplicație, fără backend, cu persistență locală prin localStorage și autosave la 30 de secunde.
Demo live: https://laurandreea10.github.io/Alpis-Fusion-CRM-premium/

🧩 Project Origin
Proiectul a plecat dintr-o nevoie concretă: dezvoltatori și freelanceri care gestionează clienți, programări, oferte și facturi folosesc în paralel Notion, Trello, Google Calendar, un tool de invoicing separat și un client de email. Contextul se pierde între ele.
Iterațiile timpurii au explorat:

un CRM de bază cu clienți, programări și facturare
adăugarea de charts și modals CRUD pe toate modulele
un pipeline de vânzări în stil kanban
un inbox unificat WhatsApp + email
un flow builder vizual pentru automatizări

🛠️ What happened next
În loc să rămână fragmente separate, aceste idei au fost:

unificate într-un singur front-end React single-file (1900+ linii)
extinse cu 18 module integrate și state centralizat
migrate de la prototype HTML la arhitectură Vite + React 18
pregătite pentru deploy automat pe GitHub Pages prin GitHub Actions
ridicate la nivel premium cu hero screen animat, guided tour, command palette, AI assistant și dark/light theme


🚀 Core Features
👥 CRM & Clienți

12 clienți demo cu scoring automat (0-100) pe baza activității
segmentare pe tag-uri: VIP, new, inactive, premium, returning
sortare pe coloane (nume, scor), filtrare multi-tag
paginare (10/pagină), bulk select, bulk tag, bulk delete
pin/favorite clienți, duplicate email detection
hover preview card cu scoring, programări, venit total
detail panel lateral cu timeline, deals, mesaje, acțiuni rapide
notițe per client, tag management per client
search highlighting + global search (clienți + bookings + facturi)

📈 Pipeline de vânzări

board kanban cu 5 coloane: Lead → Contacted → Offer → Won → Lost
add / edit / delete deals cu formular modal
move deals între etape cu drag
generare ofertă direct din deal
pipeline total value afișat pe dashboard

📬 Inbox unificat

WhatsApp + email într-o singură listă
răspuns AI cu un click
status tracking: new, sent, replied
delete mesaje

📅 Programări & Servicii

5 servicii demo cu preț, durată, categorie
3 angajați cu roluri
sloturi libere pe 7 zile
booking conflict detection cu badge animat ⚠
toggle status cu click: confirmed ↔ completed ↔ pending
facturare directă din orice booking (buton ⊡)
booking public — formular self-service cu lead capture automat

🗓️ Calendar

vizualizare 7 zile cu toate programările
sloturi afișate per zi, cu culori pe status

✍️ Content Studio

postări cu titlu, categorie, tag-uri, status: draft / scheduled / published
add / edit / delete cu formular modal
empty state informativ

📢 Campanii

campaign builder cu segment, canal, reach, conversii
lansare / pauză campanie
campanie AI generată automat
metrici: reach total, conversii, campanii active, segment top

📄 Oferte (Quotes)

draft, trimise, acceptate
generare din pipeline sau din AI
toggle status, delete

💰 Facturare

generare din orice booking cu un click
toggle paid / unpaid
Print Invoice PDF — fereastră printabilă cu layout profesional
export CSV și JSON
detecție duplicat — nu se facturează același booking de 2 ori

📊 Analytics

venit total, LTV mediu, retenție %, win rate %
grafice: venit / serviciu, tag-uri clienți, pipeline distribution

🧑‍💼 Team Performance

per angajat: programări, finalizate, conversie %, venit

🤖 AI Assistant

sugestii contextuale bazate pe starea datelor
smart scheduling cu sloturi recomandate
follow-up AI, generare ofertă, campanie AI
acțiuni executabile cu un click

⚙️ Automatizări

flow builder vizual — Client → Email → Booking → Reminder → Factură → Follow-up
4 reguli: reminder, follow-up, client nou → task, factură automată
toggle on / off, rulare manuală
flow stage list cu pași IF → WAIT → SEND → CREATE

🎨 UX Premium

hero screen cu orbs animate, gradient text, guided tour 4 pași
command palette (⌘K) cu navigare și acțiuni
live activity ticker cu simulare în timp real
dark / light theme toggle animat
notification center cu dropdown, count badge, click-to-navigate
keyboard shortcuts complete pentru navigare rapidă
staggered animations pe KPI cards și grid cards
noise texture overlay (grain SVG subtil)
gradient mesh background pe content area
autosave la 30s + save on tab close + manual save
confirm dialog pe reset (protecție la pierderi accidentale)
toast system cu 3 tipuri (success, error, info) + undo
undo pe ștergere cu toast persistent
bottom nav mobile — 5 butoane fixe pe ecrane mici
RBAC cu 3 roluri: admin / staff / viewer
avatare cu inițiale colorate per client
scroll to top automat la navigare între views
click outside închide notificări și modals
aria labels pe modals și butoane
revenue forecast cu proiecție zilnică / lunară și goal tracking
activity log în settings
backup / restore JSON complet

🔐 Settings & Audit

selector rol (admin / staff / viewer) cu permisiuni granulare
exporturi: All JSON, CSV Clienți, CSV Programări, CSV Facturi
statistici sistem (clienți, programări, facturi, deals, mesaje, tasks)
autosave status cu timestamp
backup download + restore upload


🌟 Vision
ALPis Fusion CRM Premium nu este doar un CRM simplu. Este gândit ca un operational dashboard platform care poate crește în timp cu:

mai multe module operaționale (contabilitate, stoc, contracte)
integrări reale: Stripe, Google Calendar, WhatsApp Business, email providers
backend opțional pentru persistență cloud și multi-device
multi-tenant support pentru agenții sau echipe
AI mai profund: prioritization scoring, risk detection, forecasting
arhitectură modulară care să permită desprinderea de module ca produse separate


📁 Project Structure
Alpis-Fusion-CRM-premium/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions → GitHub Pages
├── alpis-fusion-crm-premium-flat/
├── App.jsx                     # Aplicația completă (1900+ linii)
├── main.jsx                    # Entry point React
├── index.html                  # HTML entry cu favicon SVG inline
├── package.json                # Vite + React 18
├── vite.config.js              # base path pentru GitHub Pages
├── deploy.yml
└── README.md
Structura exactă poate evolua în timp, dar direcția este clară: single-file component cu state centralizat, separare cleană a logicii pe concerns, modul orientat către migrarea pe o structură src/components/ în viitor.

🔥 Planned Improvements
🧩 1. Component splitting

desprinderea App.jsx pe concerns
foldere src/components/, src/hooks/, src/lib/
un file per modul (Clients, Pipeline, Invoices, etc.)
tests pe business logic (scoring, conflict detection, invoice dedup)

🔌 2. Real integrations

Stripe pentru plăți reale pe facturi
Google Calendar sync bidirecțional pentru programări
WhatsApp Business API pentru inbox real
email providers (SendGrid, Postmark) pentru trimitere reală
webhooks pentru evenimente externe

☁️ 3. Backend opțional

persistență în Supabase sau Firebase
autentificare multi-user
sync multi-device
role-based API
backup cloud

👥 4. Multi-tenant support

agenții cu mai mulți useri
roluri și permisiuni granulare per team
separare de date per organizație
invitare user prin link

🤖 5. AI mai adânc

prioritization scoring pe clienți (nu doar activity-based)
risk detection (clienți în pericol de churn)
revenue forecasting cu trending
auto-tagging de clienți pe baza comportamentului
sugestii proactive bazate pe patterns

🔍 6. Search & filtering avansat

full-text search pe tot (clienți, bookings, facturi, mesaje, notițe)
saved searches
filtre compuse (multi-criteria cu AND / OR)
export rezultate filtrate

📊 7. Dashboard customizabil

drag & drop pe KPI cards
save custom layouts
widget-uri adăugabile / removable
multiple dashboard views

📱 8. PWA & offline mode

service worker pentru offline
install prompt mobile
sync când revine conexiunea
push notifications

🎨 9. Template-uri de email / ofertă

library de template-uri reutilizabile
variabile dinamice ({client_name}, {service}, {date})
preview înainte de trimitere
branding per template

📈 10. Rapoarte exportabile

PDF reports pe perioade customizabile
scheduled reports (weekly / monthly)
comparații perioadă vs perioadă
share cu link public

🌐 11. Internationalizare

EN / RO toggle
format-uri regionale (date, currency, phone)
translation layer clean pentru mai multe limbi

♿ 12. Accessibility pass

keyboard navigation completă pe toate view-urile
screen reader testing
color contrast audit
focus trap în modals
reduced motion support


🛠️ Tech Direction
The project is evolving around:

Vite + React 18 ca baseline
Plain CSS cu design system (CSS variables, dark / light theme)
localStorage pentru persistență zero-backend
GitHub Actions pentru deploy automat
Outfit + JetBrains Mono ca font stack
migrare progresivă către structură modulară cu src/components/
suport opțional pentru backend (Supabase / Firebase) în etape viitoare


▶️ Running Locally
Install dependencies
npm install
Start dev server
npm run dev
Build producție
npm run build
Preview build
npm run preview
Apoi deschide:
http://localhost:5173

🚀 Deploy pe GitHub Pages
Repo-ul e configurat pentru deploy automat prin GitHub Actions.
Setup

push pe branch-ul main al repository-ului
deschide Settings → Pages
la Source, alege GitHub Actions
push orice commit pe main
așteaptă workflow-ul din Actions să termine

Site-ul va fi publicat la:
https://laurandreea10.github.io/Alpis-Fusion-CRM-premium/
Important

Vite config detectează automat GITHUB_REPOSITORY la build (sau BASE_PATH dacă este setat), ca să evite 404 la asset-uri după publicare
GitHub Pages publică output-ul dist, NU sursele raw
Workflow-ul din .github/workflows/deploy.yml se ocupă de tot


🧪 Current Status
ALPis Fusion CRM Premium este la versiunea 2.0 Premium, activă și complet funcțională ca demo.
Focus areas curente:

stabilizarea single-file build-ului
component splitting gradual pe concerns
îmbunătățirea AI Assistant-ului cu logici contextuale mai bune
polish pe mobile și tablet
documentație mai bună pentru adoptare ca template


📌 Roadmap

 CRM de bază cu clienți, programări, facturare
 charts SVG, modals CRUD, toast, edit / delete
 hero + guided tour, command palette
 pipeline de vânzări kanban
 inbox unificat cu AI reply
 campanii, oferte, analytics
 team performance, AI assistant
 booking public cu lead capture
 settings, bulk actions, pagination
 revenue forecast, activity log
 keyboard shortcuts, hover preview
 dark / light theme, autosave
 print PDF, drag kanban
 noise texture, stagger animations
 RBAC cu 3 roluri
 GitHub Actions deploy
 component splitting pe concerns
 integrări reale (Stripe, Google Calendar, WhatsApp, email providers)
 backend opțional (Supabase / Firebase)
 multi-tenant support
 AI avansat (risk detection, forecasting)
 dashboard customizabil
 PWA + offline mode
 internationalizare EN / RO
 accessibility audit complet


⌨️ Keyboard Shortcuts
ShortcutAcțiune⌘K / Ctrl+KCommand paletteDDashboardCCliențiBBookingsPPipelineFFacturareIInboxAAnalyticsSSetăriNAcțiune rapidă?Keyboard helpEscapeÎnchide modal / panel / overlay

🎯 Ce demonstrează acest proiect

Component Architecture — modul unic cu state centralizat, 1900+ linii organizate clar
State Management — React hooks (useState, useEffect, useMemo, useCallback, useRef), persistent state cu localStorage, autosave
UX Flows — guided tour, command palette, hover previews, toast + undo, confirm dialogs, keyboard shortcuts
Product Thinking — de la nevoie concretă (CRM fragmentat) la soluție completă cu 18 module integrate
RBAC — 3 roluri cu permisiuni granulare
Responsive — desktop sidebar → mobile bottom nav, pipeline și grids adaptate
Design System — CSS variables, dark / light theme, Outfit + JetBrains Mono, 40+ componente stilizate
Performance — useMemo pe computed data, pagination, lazy rendering
Accessibility — aria labels, keyboard navigation, focus management


🤝 Contribution
Acest proiect este dezvoltat momentan ca un produs personal și experimental, dar este structurat cu extensibilitate în minte.
Obiectivul pe termen lung este ca baza de cod să fie ușor de expandat, refactorizat și polish-uit într-un template solid pentru agenții și freelanceri care vor un operational dashboard fără backend.

📜 Credits & Inspiration
ALPis Fusion CRM Premium a fost construit iterativ, pornind de la un CRM minimal și crescând prin sesiuni intensive de feature work. Fiecare modul a fost gândit pornind de la cum arată produse bune de referință: Notion pentru structură, Linear pentru claritate UX, Zapier pentru flow builder, Intercom pentru inbox unificat.
Credit imens merge întregului proces iterativ în sine: fiecare test, fiecare rewire, fiecare flow nou care a împins produsul mai aproape de senzația de "produs matur într-un singur ecran". 💜

📜 Licență
MIT — vezi LICENSE

🏁 Long-Term Goal
Viziunea pe termen lung pentru ALPis Fusion CRM Premium este să devină un operational dashboard template care este:

complet utilizabil ca produs standalone
ușor de extins cu module noi
pregătit pentru integrări reale (Stripe, Calendar, WhatsApp)
compatibil cu backend opțional pentru persistență cloud
vizibil premium, polished și memorabil pentru recruiteri și potențiali utilizatori reali
