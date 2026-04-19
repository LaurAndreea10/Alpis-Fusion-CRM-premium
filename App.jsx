import { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════
   ALPis Fusion CRM — Premium Edition
   De la client nou la factură plătită
   ═══════════════════════════════════════════ */

// ─── Utilities ───
const currency = (v) => `${Number(v || 0).toLocaleString("ro-RO")} RON`;
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const inDays = (d) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10); };
const parseTags = (v = "") => v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const esc = (s = "") => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
const dayNames = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];
const hashStr = (s = "") => { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return Math.abs(h); };
const avatarColors = ["#7c6cff", "#00e5a0", "#ff8c42", "#ff5266", "#38bdf8", "#00d68f", "#f59e42", "#c084fc"];
const healthScore = (client, bookings = [], invoices = []) => {
  let h = 100;
  const clientBookings = bookings.filter(b => b.clientId === client.id);
  const clientInvoices = invoices.filter(i => i.clientId === client.id);
  const lastBooking = clientBookings.sort((a,b) => b.date.localeCompare(a.date))[0];
  const daysSinceBooking = lastBooking ? Math.floor((Date.now() - new Date(lastBooking.date).getTime()) / 86400000) : 999;
  if (daysSinceBooking > 60) h -= 40;
  else if (daysSinceBooking > 30) h -= 20;
  else if (daysSinceBooking > 14) h -= 8;
  const unpaid = clientInvoices.filter(i => i.status === 'unpaid').length;
  if (unpaid > 0) h -= unpaid * 12;
  const noShows = clientBookings.filter(b => b.status === 'no-show').length;
  if (noShows > 0) h -= noShows * 15;
  if (client.tags?.includes('inactive')) h -= 18;
  if (!client.tags?.includes('vip') && !client.tags?.includes('premium') && clientBookings.length < 2) h -= 10;
  if (client.tags?.includes('vip')) h += 8;
  return Math.max(0, Math.min(100, h));
};
const healthLabel = (score) => score >= 75 ? 'Sănătos' : score >= 45 ? 'Atenție' : 'Risc';
const healthColor = (score) => score >= 75 ? 'var(--ok)' : score >= 45 ? 'var(--warm)' : 'var(--danger)';
const healthChip = (score) => score >= 75 ? 'green' : score >= 45 ? 'yellow' : 'red';
const leadSources = ['Instagram','Website','Referral','Campanie','Organic','Facebook','Google Ads','TikTok','LinkedIn','Email'];
const parseCSV = (text) => { const lines = text.trim().split('\n'); if (lines.length < 2) return []; const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,'')); return lines.slice(1).map(line => { const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,'')); const obj = {}; headers.forEach((h,i) => obj[h] = vals[i] || ''); return obj; }); };


const clientScore = (client, bookings = []) => {
  let s = 20;
  if (client.tags?.includes("vip")) s += 30;
  if (client.tags?.includes("premium")) s += 15;
  if (client.tags?.includes("new")) s += 10;
  if (client.tags?.includes("returning")) s += 12;
  if (client.tags?.includes("inactive")) s -= 20;
  if (client.email) s += 8;
  if (client.phone) s += 8;
  s += Math.min(bookings.filter((b) => b.clientId === client.id).length * 7, 28);
  return Math.max(0, Math.min(100, s));
};

// ─── Demo Data (rich — 12 clients, 8 bookings) ───
const createDemoState = () => {
  const names = ["Ana Popescu","Mihai Ionescu","Roxana Dumitru","Elena Marin","Dragoș Vasile","Ioana Constantinescu","Vlad Popa","Cristina Stan","Alexandru Rusu","Sofia Moldovan","Radu Gheorghe","Mara Toma"];
  const staff = [
    { id: uid(), name: "Maria Ionescu", role: "Senior Staff" },
    { id: uid(), name: "Andrei Pop", role: "Consultant" },
    { id: uid(), name: "Elena Dima", role: "Junior" },
  ];
  const services = [
    { id: uid(), name: "Consultație Premium", price: 250, duration: 60, category: "Consultanță" },
    { id: uid(), name: "Ședință Foto Express", price: 450, duration: 90, category: "Foto" },
    { id: uid(), name: "Pachet Social Media", price: 600, duration: 120, category: "Marketing" },
    { id: uid(), name: "Audit Brand", price: 350, duration: 90, category: "Consultanță" },
    { id: uid(), name: "Workshop Echipă", price: 800, duration: 180, category: "Training" },
  ];
  const tagSets = [["vip","returning"],["vip"],["new"],["returning"],["inactive"],["new","premium"],["vip","premium"],["returning"],["new"],["inactive"],["vip"],["new"]];
  const notesSets = ["Preferă dimineața.","Client fidel de 2 ani.","Lead din booking public.","Recomandat de Ana.","Nu a revenit de 50 zile.","Interesat de pachet premium.","Client corporate.","Vrea newsletter.","Prima vizită.","Necesită reactivare.","Top client Q1.","Interesat de foto."];
  const sourceSets = ["Instagram","Referral","Website","Referral","Organic","Campanie","LinkedIn","Website","Instagram","Organic","Google Ads","Facebook"];
  const clients = names.map((name, i) => ({
    id: uid(), name, email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    phone: `072200000${i + 1}`, tags: tagSets[i], notes: notesSets[i], source: sourceSets[i],
    createdAt: inDays(-Math.floor(Math.random() * 30) - 1),
    lastVisit: i < 8 ? inDays(-Math.floor(Math.random() * 10)) : "",
    conversation: i < 6 ? [`Confirmare booking ${inDays(-i)}`, "Reminder automat trimis", "Follow-up: experiență bună"] : [],
  }));
  const bookings = [
    { id: uid(), clientId: clients[0].id, serviceId: services[0].id, staffId: staff[0].id, date: todayISO(), time: "09:00", status: "confirmed", notes: "Evaluare inițială" },
    { id: uid(), clientId: clients[1].id, serviceId: services[1].id, staffId: staff[1].id, date: todayISO(), time: "10:30", status: "confirmed", notes: "Ședință foto produs" },
    { id: uid(), clientId: clients[2].id, serviceId: services[2].id, staffId: staff[0].id, date: todayISO(), time: "14:00", status: "pending", notes: "Așteaptă confirmare" },
    { id: uid(), clientId: clients[3].id, serviceId: services[3].id, staffId: staff[2].id, date: todayISO(), time: "16:00", status: "confirmed", notes: "Audit complet" },
    { id: uid(), clientId: clients[0].id, serviceId: services[2].id, staffId: staff[0].id, date: inDays(-2), time: "11:00", status: "completed", notes: "Finalizat cu succes" },
    { id: uid(), clientId: clients[6].id, serviceId: services[4].id, staffId: staff[1].id, date: inDays(1), time: "10:00", status: "confirmed", notes: "Workshop corporate" },
    { id: uid(), clientId: clients[5].id, serviceId: services[0].id, staffId: staff[2].id, date: inDays(1), time: "14:00", status: "pending", notes: "Primul contact" },
    { id: uid(), clientId: clients[7].id, serviceId: services[1].id, staffId: staff[0].id, date: inDays(-1), time: "09:00", status: "completed", notes: "Foto finalizat" },
  ];
  const invoices = [
    { id: uid(), clientId: clients[0].id, bookingId: bookings[0].id, amount: 250, status: "paid", createdAt: todayISO() },
    { id: uid(), clientId: clients[0].id, bookingId: bookings[4].id, amount: 600, status: "paid", createdAt: inDays(-2) },
    { id: uid(), clientId: clients[1].id, bookingId: bookings[1].id, amount: 450, status: "unpaid", createdAt: todayISO() },
    { id: uid(), clientId: clients[7].id, bookingId: bookings[7].id, amount: 450, status: "paid", createdAt: inDays(-1) },
    { id: uid(), clientId: clients[6].id, bookingId: bookings[5].id, amount: 800, status: "unpaid", createdAt: inDays(1) },
  ];
  const posts = [
    { id: uid(), title: "Oferta lunii aprilie", category: "Promo", tags: ["promo","aprilie"], status: "scheduled", body: "Reducere 15% pentru clienții care rezervă până vineri." },
    { id: uid(), title: "3 motive să revii lunar", category: "Educațional", tags: ["educational"], status: "published", body: "Consecvența produce rezultate vizibile." },
    { id: uid(), title: "Behind the scenes", category: "Storytelling", tags: ["brand"], status: "draft", body: "O zi din viața echipei noastre." },
  ];
  const deals = [
    { id: uid(), title: "Pachet onboarding premium", clientId: clients[0].id, value: 1800, stage: "lead", ownerId: staff[0].id },
    { id: uid(), title: "Audit + social media", clientId: clients[1].id, value: 2400, stage: "contacted", ownerId: staff[1].id },
    { id: uid(), title: "Workshop echipă Q2", clientId: clients[6].id, value: 3200, stage: "offer", ownerId: staff[1].id },
    { id: uid(), title: "Retainer corporate", clientId: clients[10].id, value: 4500, stage: "won", ownerId: staff[0].id },
    { id: uid(), title: "Reactivare cont inactiv", clientId: clients[4].id, value: 900, stage: "lost", ownerId: staff[2].id },
  ];
  const messages = [
    { id: uid(), clientId: clients[0].id, channel: "WhatsApp", direction: "in", status: "new", ts: `${todayISO()} 09:12`, text: "Bună, pot muta programarea de azi la 11:00?" },
    { id: uid(), clientId: clients[0].id, channel: "Email", direction: "out", status: "sent", ts: `${todayISO()} 09:16`, text: "Sigur, 11:00 este disponibil. Confirm dacă e ok." },
    { id: uid(), clientId: clients[5].id, channel: "WhatsApp", direction: "in", status: "new", ts: `${todayISO()} 10:05`, text: "Aș vrea mai multe detalii despre pachetul premium." },
    { id: uid(), clientId: clients[7].id, channel: "Email", direction: "out", status: "sent", ts: `${inDays(-1)} 17:22`, text: "Mulțumim pentru vizită! Cum ți s-a părut experiența?" },
  ];
  const offers = [
    { id: uid(), clientId: clients[6].id, title: "Oferta workshop corporate", amount: 3200, status: "sent", createdAt: inDays(-1), dueDate: inDays(3) },
    { id: uid(), clientId: clients[5].id, title: "Pachet premium 3 luni", amount: 1800, status: "draft", createdAt: todayISO(), dueDate: inDays(5) },
    { id: uid(), clientId: clients[10].id, title: "Retainer content + CRM", amount: 4500, status: "accepted", createdAt: inDays(-3), dueDate: inDays(1) },
  ];
  const campaigns = [
    { id: uid(), name: "Reactivare clienți inactivi", segment: "inactive", channel: "WhatsApp", status: "draft", reach: 48, conversions: 0 },
    { id: uid(), name: "Upsell VIP premium", segment: "vip", channel: "Email", status: "running", reach: 22, conversions: 4 },
    { id: uid(), name: "New leads nurture", segment: "new", channel: "Email", status: "scheduled", reach: 31, conversions: 2 },
  ];
  return {
    role: "admin", clients, services, staff, bookings, invoices, posts, deals, messages, offers, campaigns,
    automations: [
      { id: uid(), name: "Reminder programare", type: "reminder", active: true },
      { id: uid(), name: "Follow-up după vizită", type: "followup", active: true },
      { id: uid(), name: "Client nou → task", type: "new-client-task", active: true },
      { id: uid(), name: "Factură automată", type: "auto-invoice", active: true },
    ],
    tasks: [
      { id: uid(), title: "Sună clienții inactivi", lane: "todo", priority: "high", ownerId: staff[0].id, dueDate: inDays(1), clientId: clients[4].id, createdAt: todayISO() },
      { id: uid(), title: "Campania de Paște", lane: "doing", priority: "medium", ownerId: staff[1].id, dueDate: inDays(3), clientId: null, createdAt: inDays(-2) },
      { id: uid(), title: "Oferta lunii publicată", lane: "done", priority: "low", ownerId: staff[0].id, dueDate: inDays(-1), clientId: null, createdAt: inDays(-5) },
      { id: uid(), title: "Follow-up pachet premium", lane: "todo", priority: "high", ownerId: staff[2].id, dueDate: todayISO(), clientId: clients[5].id, createdAt: inDays(-1) },
      { id: uid(), title: "Trimite ofertă corporate", lane: "todo", priority: "medium", ownerId: staff[0].id, dueDate: inDays(2), clientId: clients[6].id, createdAt: todayISO() },
    ],
    subscriptions: [
      { id: uid(), clientId: clients[0].id, name: "Pachet Premium Lunar", amount: 450, interval: "lunar", startDate: inDays(-30), nextRenewal: inDays(0), status: "active" },
      { id: uid(), clientId: clients[6].id, name: "Retainer Corporate", amount: 1200, interval: "lunar", startDate: inDays(-60), nextRenewal: inDays(5), status: "active" },
      { id: uid(), clientId: clients[10].id, name: "Pachet Social Media", amount: 600, interval: "lunar", startDate: inDays(-15), nextRenewal: inDays(15), status: "active" },
      { id: uid(), clientId: clients[4].id, name: "Consultanță trimestrială", amount: 750, interval: "trimestrial", startDate: inDays(-90), nextRenewal: inDays(-5), status: "expired" },
    ],
    segments: [
      { id: uid(), name: "VIP fără booking 30z", rules: [{ field: "tag", op: "includes", value: "vip" }, { field: "daysSinceBooking", op: ">", value: 30 }] },
      { id: uid(), name: "Facturi restante + inactiv", rules: [{ field: "unpaidInvoices", op: ">", value: 0 }, { field: "tag", op: "includes", value: "inactive" }] },
      { id: uid(), name: "Clienți noi premium", rules: [{ field: "tag", op: "includes", value: "new" }, { field: "tag", op: "includes", value: "premium" }] },
    ],
    auditTrail: [
      { id: uid(), entity: "client", entityId: clients[0].id, entityName: clients[0].name, field: "tags", oldValue: "new", newValue: "vip, returning", user: "admin", ts: new Date(Date.now() - 86400000).toLocaleString("ro-RO") },
      { id: uid(), entity: "invoice", entityId: "demo", entityName: "Factură #demo", field: "status", oldValue: "unpaid", newValue: "paid", user: "admin", ts: new Date(Date.now() - 43200000).toLocaleString("ro-RO") },
    ],
    activityLog: [
      { id: uid(), action: "Sistem inițializat cu date demo", ts: new Date().toLocaleString("ro-RO") },
    ],
    revenueGoal: 5000,
    pinnedClients: [],
  };
};

// ─── Avatar Component ───
const Avatar = ({ name, size = 28 }) => {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const color = avatarColors[hashStr(name) % avatarColors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: 8, display: "grid", placeItems: "center", fontSize: size * 0.38, fontWeight: 700, color: "white", background: color, flexShrink: 0, textTransform: "uppercase" }}>
      {initials}
    </div>
  );
};

// ─── Sparkline SVG ───
const Sparkline = ({ values, color = "#7c6cff", width = 120, height = 28 }) => {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", marginTop: 8 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
};

// ─── MiniBarChart ───
const MiniBarChart = ({ data, height = 160 }) => {
  if (!data.length) return <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>Fără date</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const colors = ["#7c6cff","#00e5a0","#ff5f7b","#38bdf8","#fbbf24","#a78bfa","#f472b6","#22d3ee"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height, paddingTop: 8 }}>
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, 4);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--muted)" }}>{d.value}</span>
            <div style={{ width: "100%", height: `${pct}%`, borderRadius: "5px 5px 1px 1px", background: `linear-gradient(180deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}88)`, transition: "height 0.8s cubic-bezier(.34,1.56,.64,1)", minHeight: 2 }} />
            <span style={{ fontSize: 8, fontFamily: "var(--mono)", color: "var(--muted)", fontWeight: 600 }}>
              {d.name.length > 7 ? d.name.slice(0, 6) + "…" : d.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── DonutChart ───
const DonutChart = ({ data, height = 160 }) => {
  if (!data.length) return <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>Fără date</div>;
  const total = data.reduce((s, d) => s + d.value, 0);
  const colors = ["#7c6cff","#00e5a0","#ff5f7b","#38bdf8","#fbbf24"];
  const cx = 70, cy = height / 2, r = 48, ri = 30;
  let angle = -90;
  const arcs = data.map((d, i) => {
    const sweep = (d.value / total) * 360;
    const sa = angle; angle += sweep; const ea = angle;
    const sr = (sa * Math.PI) / 180, er = (ea * Math.PI) / 180;
    const la = sweep > 180 ? 1 : 0;
    const path = `M ${cx+r*Math.cos(sr)} ${cy+r*Math.sin(sr)} A ${r} ${r} 0 ${la} 1 ${cx+r*Math.cos(er)} ${cy+r*Math.sin(er)} L ${cx+ri*Math.cos(er)} ${cy+ri*Math.sin(er)} A ${ri} ${ri} 0 ${la} 0 ${cx+ri*Math.cos(sr)} ${cy+ri*Math.sin(sr)} Z`;
    return { path, color: colors[i % colors.length], label: d.name, value: d.value };
  });
  return (
    <svg width="100%" height={height} viewBox={`0 0 240 ${height}`}>
      {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} opacity={0.85} />)}
      <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--text)" fontSize={16} fontWeight={700}>{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--muted)" fontSize={9}>total</text>
      {arcs.map((a, i) => (
        <g key={i}><rect x={155} y={14 + i * 22} width={8} height={8} rx={2} fill={a.color} />
        <text x={168} y={22 + i * 22} fill="var(--text-secondary)" fontSize={10}>{a.label} ({a.value})</text></g>
      ))}
    </svg>
  );
};

// ─── Search Highlight ───
const Hl = ({ text, query }) => {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <>{parts.map((p, i) => p.toLowerCase() === query.toLowerCase() ? <mark key={i} style={{ background: "rgba(124,108,255,.25)", color: "var(--text)", padding: "0 2px", borderRadius: 3 }}>{p}</mark> : p)}</>;
};

// ─── CSS ───
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

:root {
  --bg: #050508; --panel: #0d0d14; --panel-2: #111119; --panel-3: #16161f;
  --surface: #1a1a26; --surface-2: #20202e; --surface-3: #282838;
  --line: rgba(255,255,255,.06); --line-hover: rgba(255,255,255,.12);
  --text: #ededf4; --text-secondary: #9295a8; --muted: #5c5f73;
  --brand: #7c6cff; --brand-light: #a89bff; --brand-dim: rgba(124,108,255,.1);
  --accent: #00e5a0; --accent-dim: rgba(0,229,160,.08);
  --warm: #ff8c42; --warm-dim: rgba(255,140,66,.08);
  --danger: #ff5266; --danger-dim: rgba(255,82,102,.08);
  --ok: #00d68f; --ok-dim: rgba(0,214,143,.08);
  --info: #38bdf8; --info-dim: rgba(56,189,248,.08);
  --radius: 12px; --radius-lg: 18px;
  --shadow: 0 8px 32px rgba(0,0,0,.4);
  --font: 'Outfit', system-ui, sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --transition: .22s cubic-bezier(.4,0,.2,1);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
::selection { background: var(--brand); color: white; }
::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 10px; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; border: none; background: none; }

/* Noise texture */
body::before { content:''; position:fixed; inset:0; pointer-events:none; z-index:9999; opacity:.018; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }

/* Theme */
.light-theme { --bg:#f4f5f8; --panel:#fff; --panel-2:#f8f9fc; --panel-3:#eef0f5; --surface:#e8eaf0; --surface-2:#dde0e8; --surface-3:#d0d4de; --line:rgba(0,0,0,.08); --line-hover:rgba(0,0,0,.14); --text:#1a1a2e; --text-secondary:#555770; --muted:#8a8da0; }

/* Keyframes */
@keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes modalIn { from { opacity:0; transform:translateY(16px) scale(.96) } to { opacity:1; transform:translateY(0) scale(1) } }
@keyframes toastIn { from { opacity:0; transform:translateX(40px) } to { opacity:1; transform:translateX(0) } }
@keyframes breathe { 0%,100%{box-shadow:0 0 20px rgba(124,108,255,.15)} 50%{box-shadow:0 0 40px rgba(124,108,255,.3)} }
@keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.1)} 66%{transform:translate(-15px,15px) scale(.95)} }
@keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-25px,18px) scale(.9)} 66%{transform:translate(20px,-25px) scale(1.05)} }
@keyframes pulseRing { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2);opacity:0} }
@keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:.5} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes typeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes staggerIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes countUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

/* Hero */
.hero-screen { position:fixed; inset:0; z-index:200; background:var(--bg); display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; transition:opacity .6s,transform .6s; }
.hero-screen.exit { opacity:0; transform:scale(1.03); pointer-events:none; }
.hero-orb { position:absolute; border-radius:50%; filter:blur(100px); }
.hero-orb-1 { width:500px; height:500px; background:radial-gradient(circle,rgba(124,108,255,.3),transparent 70%); top:20%; left:30%; animation:orbFloat1 12s ease-in-out infinite; }
.hero-orb-2 { width:400px; height:400px; background:radial-gradient(circle,rgba(0,229,160,.2),transparent 70%); bottom:20%; right:25%; animation:orbFloat2 10s ease-in-out infinite; }
.hero-orb-3 { width:300px; height:300px; background:radial-gradient(circle,rgba(255,140,66,.15),transparent 70%); top:60%; left:10%; animation:orbFloat1 14s ease-in-out infinite reverse; }
.hero-content { position:relative; z-index:2; text-align:center; max-width:720px; padding:0 24px; }
.hero-logo-mark { width:72px; height:72px; margin:0 auto 24px; border-radius:20px; display:grid; place-items:center; background:linear-gradient(135deg,var(--brand),var(--accent)); font-size:28px; font-weight:900; color:var(--bg); box-shadow:0 8px 40px rgba(124,108,255,.4); animation:breathe 3s ease-in-out infinite,fadeUp .8s ease both; }
.hero-badge { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:20px; background:rgba(124,108,255,.08); border:1px solid rgba(124,108,255,.12); font-size:11px; font-weight:600; color:var(--brand-light); font-family:var(--mono); margin-bottom:20px; animation:fadeUp .8s ease both .1s; opacity:0; }
.hero-title { font-size:clamp(32px,5.5vw,52px); font-weight:900; letter-spacing:-.04em; line-height:1.1; margin-bottom:16px; animation:fadeUp .8s ease both .2s; opacity:0; }
.gradient-text { background:linear-gradient(135deg,var(--brand-light),var(--accent),var(--warm)); background-size:200% 200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:gradientShift 4s ease infinite; }
.hero-sub { font-size:16px; color:var(--text-secondary); line-height:1.6; max-width:540px; margin:0 auto 12px; animation:fadeUp .8s ease both .3s; opacity:0; }
.hero-value { font-size:13px; color:var(--muted); margin-bottom:32px; animation:fadeUp .8s ease both .35s; opacity:0; font-family:var(--mono); }
.hero-value span { color:var(--accent); font-weight:600; }
.hero-actions { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; animation:fadeUp .8s ease both .4s; opacity:0; }
.hero-keys { margin-top:28px; font-size:11px; color:var(--muted); font-family:var(--mono); animation:fadeUp .8s ease both .5s; opacity:0; }
.hero-keys kbd { padding:3px 7px; border-radius:5px; background:rgba(255,255,255,.05); border:1px solid var(--line); font-size:10px; }

/* App shell */
.app-shell { font-family:var(--font); color:var(--text); background:var(--bg); min-height:100vh; display:grid; grid-template-columns:256px 1fr; }
.app-shell.hidden { display:none; }

/* Sidebar */
.sidebar { background:var(--panel); border-right:1px solid var(--line); position:sticky; top:0; height:100vh; display:flex; flex-direction:column; overflow-y:auto; z-index:30; }
.sidebar-head { padding:20px 16px 16px; border-bottom:1px solid var(--line); }
.brand { display:flex; gap:12px; align-items:center; }
.logo-mark { width:36px; height:36px; border-radius:10px; display:grid; place-items:center; background:linear-gradient(135deg,var(--brand),var(--accent)); color:var(--bg); font-weight:900; font-size:13px; flex-shrink:0; box-shadow:0 4px 16px rgba(124,108,255,.3); transition:.5s cubic-bezier(.34,1.56,.64,1); }
.logo-mark:hover { transform:rotate(-8deg) scale(1.08); }
.brand-text h1 { font-size:14px; font-weight:800; letter-spacing:-.03em; }
.brand-text p { font-size:9px; color:var(--muted); margin-top:2px; font-family:var(--mono); letter-spacing:.1em; text-transform:uppercase; }
.nav-group { padding:10px 8px; flex:1; }
.nav-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); padding:10px 10px 5px; font-family:var(--mono); }
.nav-btn { width:100%; display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:9px; font-size:12.5px; font-weight:500; color:var(--text-secondary); position:relative; transition:var(--transition); text-align:left; border:1px solid transparent; }
.nav-btn:hover { background:rgba(255,255,255,.06); color:var(--text); border-color:var(--line); }
.nav-btn.active { background:var(--brand-dim); color:var(--brand-light); border-color:rgba(124,108,255,.15); }
.nav-btn.active::before { content:''; position:absolute; left:-8px; top:50%; transform:translateY(-50%); width:3px; height:18px; border-radius:0 3px 3px 0; background:var(--brand); box-shadow:0 0 12px rgba(124,108,255,.4); }
.nav-icon { font-size:14px; width:20px; text-align:center; }
.nav-badge { margin-left:auto; font-size:9px; font-family:var(--mono); padding:2px 6px; border-radius:5px; background:rgba(255,255,255,.04); color:var(--muted); font-weight:600; }
.nav-btn.active .nav-badge { background:rgba(124,108,255,.15); color:var(--brand-light); }
.sidebar-foot { padding:10px 14px; border-top:1px solid var(--line); }

/* Content */
.content { min-width:0; padding:0 24px 50px; overflow-y:auto; background:radial-gradient(ellipse at 20% 0%,rgba(124,108,255,.03),transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(0,229,160,.02),transparent 50%); }
.topbar { display:flex; justify-content:space-between; align-items:center; gap:14px; padding:14px 0; position:sticky; top:0; z-index:20; background:linear-gradient(180deg,var(--bg) 60%,transparent); backdrop-filter:blur(14px); flex-wrap:wrap; }
.top-left { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.top-right { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.search-box { position:relative; width:min(320px,100%); }
.search-box input { width:100%; background:var(--surface); border:1px solid var(--line); padding:9px 14px 9px 32px; border-radius:10px; outline:none; font-size:13px; transition:var(--transition); }
.search-box input:focus { border-color:rgba(124,108,255,.3); box-shadow:0 0 0 3px rgba(124,108,255,.08); }
.search-box .s-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--muted); pointer-events:none; }
.search-kbd { position:absolute; right:10px; top:50%; transform:translateY(-50%); font-size:9px; font-family:var(--mono); color:var(--muted); background:rgba(255,255,255,.04); padding:2px 5px; border-radius:4px; border:1px solid var(--line); }
.role-pill { font-size:10px; font-family:var(--mono); color:var(--text-secondary); padding:5px 10px; border-radius:7px; background:var(--surface); border:1px solid var(--line); }
.role-pill strong { color:var(--brand-light); }
.status-live { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:16px; background:rgba(0,229,160,.06); border:1px solid rgba(0,229,160,.1); font-size:10px; font-weight:600; font-family:var(--mono); color:var(--accent); }
.pulse-dot { width:5px; height:5px; border-radius:50%; background:var(--accent); box-shadow:0 0 8px var(--accent); animation:livePulse 2s ease-in-out infinite; }

/* Buttons */
.btn { border:1px solid var(--line-hover); background:var(--surface); color:var(--text); padding:8px 14px; border-radius:9px; font-size:12.5px; font-weight:500; transition:all .22s ease; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
.btn:hover { background:var(--surface-2); border-color:rgba(255,255,255,.18); transform:translateY(-1px); }
.btn.primary { background:var(--brand); border-color:var(--brand); color:white; box-shadow:0 4px 16px rgba(124,108,255,.25); }
.btn.primary:hover { background:var(--brand-light); box-shadow:0 6px 24px rgba(124,108,255,.35); }
.btn.success { background:var(--ok); border-color:var(--ok); color:var(--bg); font-weight:600; }
.btn.danger { color:var(--danger); border-color:rgba(255,82,102,.3); background:rgba(255,82,102,.06); }
.btn.danger:hover { background:var(--danger-dim); border-color:rgba(255,82,102,.4); }
.btn.ghost { background:rgba(255,255,255,.04); border-color:var(--line-hover); color:var(--text-secondary); }
.btn.ghost:hover { background:rgba(255,255,255,.1); color:var(--text); border-color:rgba(255,255,255,.2); }
.btn.sm { padding:5px 9px; font-size:11.5px; border-radius:7px; }
.btn.hero { padding:14px 32px; border-radius:14px; font-size:15px; font-weight:700; }
.btn.hero.primary { box-shadow:0 6px 30px rgba(124,108,255,.35); }
.btn.hero.primary:hover { transform:translateY(-3px) scale(1.02); box-shadow:0 10px 40px rgba(124,108,255,.5); }
.btn.hero.ghost { background:rgba(255,255,255,.04); color:var(--text-secondary); border:1px solid var(--line); }

/* Theme toggle */
.theme-toggle { width:36px; height:20px; border-radius:10px; background:var(--surface-2); border:1px solid var(--line); cursor:pointer; position:relative; transition:var(--transition); flex-shrink:0; }
.theme-toggle::after { content:''; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:var(--brand-light); transition:all .3s cubic-bezier(.34,1.56,.64,1); box-shadow:0 1px 4px rgba(0,0,0,.3); }
.theme-toggle.on::after { left:calc(100% - 16px); background:var(--warm); }

/* Grids */
.grid { display:grid; gap:14px; width:100%; }
.grid.c4 { grid-template-columns:repeat(4,minmax(180px,1fr)); }
.grid.c3 { grid-template-columns:repeat(3,minmax(200px,1fr)); }
.grid.c2 { grid-template-columns:repeat(2,minmax(260px,1fr)); }
.stack-y { display:flex; flex-direction:column; gap:14px; }

/* Cards */
.card { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius-lg); padding:18px; transition:all .25s ease; min-width:0; animation:staggerIn .35s ease both; }
.grid.c3 > .card:nth-child(1) { animation-delay:0s; }
.grid.c3 > .card:nth-child(2) { animation-delay:.05s; }
.grid.c3 > .card:nth-child(3) { animation-delay:.1s; }
.card:hover { border-color:var(--line-hover); }
.card-title { font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:12px; display:flex; align-items:center; gap:7px; text-transform:uppercase; letter-spacing:.05em; }
.card-title .dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }

/* KPI */
.kpi-card { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius-lg); padding:18px; transition:all .3s cubic-bezier(.34,1.56,.64,1); position:relative; overflow:hidden; }
.kpi-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; border-radius:2px 2px 0 0; opacity:.6; }
.kpi-card:nth-child(1)::before { background:linear-gradient(90deg,var(--brand),var(--brand-light)); }
.kpi-card:nth-child(2)::before { background:linear-gradient(90deg,var(--accent),#00ffc8); }
.kpi-card:nth-child(3)::before { background:linear-gradient(90deg,var(--warm),#ffa96b); }
.kpi-card:nth-child(4)::before { background:linear-gradient(90deg,var(--ok),#38f5b8); }
.kpi-card:hover { border-color:var(--line-hover); transform:translateY(-3px); box-shadow:var(--shadow); }
.kpi-card:hover::before { opacity:1; }
.kpi-card { animation:staggerIn .4s ease both; }
.kpi-card:nth-child(1) { animation-delay:0s; }
.kpi-card:nth-child(2) { animation-delay:.06s; }
.kpi-card:nth-child(3) { animation-delay:.12s; }
.kpi-card:nth-child(4) { animation-delay:.18s; }
.kpi-label { font-size:10px; color:var(--muted); font-family:var(--mono); text-transform:uppercase; letter-spacing:.08em; font-weight:600; }
.kpi-value { font-size:30px; font-weight:800; margin:6px 0 3px; letter-spacing:-.04em; animation:countUp .5s ease both; }
.kpi-sub { font-size:11px; color:var(--text-secondary); }

/* Chips */
.chip { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:5px; font-size:10px; font-weight:600; font-family:var(--mono); }
.chip.blue { background:var(--brand-dim); color:var(--brand-light); }
.chip.teal { background:var(--accent-dim); color:var(--accent); }
.chip.yellow { background:var(--warm-dim); color:var(--warm); }
.chip.red { background:var(--danger-dim); color:var(--danger); }
.chip.green { background:var(--ok-dim); color:var(--ok); }
.chip.gray { background:rgba(255,255,255,.04); color:var(--text-secondary); }

/* Table */
.table-wrap { overflow-x:auto; border-radius:var(--radius); border:1px solid var(--line); }
.table-wrap table { width:100%; border-collapse:collapse; min-width:600px; }
.table-wrap th { padding:9px 14px; font-size:9px; font-family:var(--mono); font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); background:rgba(255,255,255,.02); text-align:left; border-bottom:1px solid var(--line); }
.table-wrap td { padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.03); font-size:12.5px; }
.table-wrap tr:hover td { background:rgba(255,255,255,.02); }
.table-wrap tr:last-child td { border-bottom:none; }

/* Items */
.item { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; background:rgba(255,255,255,.03); border:1px solid var(--line); transition:all .25s ease; }
.item:hover { border-color:var(--line-hover); background:rgba(255,255,255,.05); }
.item + .item { margin-top:4px; }
.item-info h4 { font-size:12.5px; font-weight:600; margin-bottom:2px; }
.item-info p { font-size:11px; color:var(--muted); }

/* Score badge */
.score-badge { display:flex; align-items:center; gap:8px; min-width:80px; }
.score-track { flex:1; height:5px; border-radius:3px; background:rgba(255,255,255,.06); overflow:hidden; }
.score-fill { height:100%; border-radius:3px; transition:width .3s; }
.score-num { font-size:12px; font-weight:700; min-width:22px; text-align:right; }

/* Row actions */
.row-actions { display:flex; gap:4px; opacity:.5; transition:opacity .2s; }
tr:hover .row-actions, .item:hover .row-actions { opacity:1; }
.row-actions .btn { padding:4px 6px; border-radius:5px; font-size:11px; border-color:var(--line-hover); }

/* Kanban */
.kanban { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.lane { background:rgba(255,255,255,.015); border:1px solid var(--line); border-radius:var(--radius); padding:12px; min-height:80px; }
.lane-title { font-size:9px; font-family:var(--mono); font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin-bottom:8px; display:flex; align-items:center; gap:5px; }
.lane-title .count { background:rgba(255,255,255,.06); padding:1px 5px; border-radius:4px; font-size:9px; }
.task-card { padding:9px 10px; border-radius:8px; background:var(--surface); border:1px solid var(--line); font-size:12px; cursor:grab; transition:all .25s ease; margin-bottom:5px; }
.task-card:hover { border-color:var(--line-hover); transform:translateY(-2px); box-shadow:0 2px 8px rgba(0,0,0,.3); }

/* Calendar */
.cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
.cal-day { min-height:90px; border:1px solid var(--line); border-radius:10px; padding:8px; background:rgba(255,255,255,.015); transition:all .25s; }
.cal-day:hover { border-color:var(--line-hover); }
.cal-day-head { font-size:10px; font-family:var(--mono); color:var(--muted); margin-bottom:6px; display:flex; justify-content:space-between; }
.cal-day-head .day-num { font-weight:700; color:var(--text); }
.cal-slot { font-size:10px; padding:3px 6px; border-radius:5px; background:var(--brand-dim); color:var(--brand-light); margin-top:3px; font-family:var(--mono); }

/* Flow builder */
.flow-builder { display:flex; align-items:center; gap:0; overflow-x:auto; padding:8px 0; }
.flow-node { padding:10px 14px; border-radius:10px; background:var(--surface); border:1px solid var(--line); font-size:11px; font-weight:600; white-space:nowrap; transition:var(--transition); }
.flow-node:hover { border-color:var(--brand); transform:translateY(-2px); }
.flow-node.active { border-color:var(--accent); background:var(--accent-dim); }
.flow-node .fn-icon { font-size:14px; margin-bottom:3px; display:block; }
.flow-node .fn-label { color:var(--text-secondary); font-size:10px; font-weight:400; }
.flow-arrow { color:var(--muted); font-size:16px; padding:0 4px; flex-shrink:0; opacity:.4; }

/* Live ticker */
.live-ticker { border:1px solid rgba(0,229,160,.1); background:rgba(0,229,160,.03); border-radius:var(--radius-lg); padding:14px 16px; overflow:hidden; position:relative; }
.live-ticker::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--accent),var(--brand)); animation:shimmer 3s linear infinite; background-size:200% 100%; }
.lt-header { display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:11px; font-weight:700; color:var(--accent); font-family:var(--mono); text-transform:uppercase; letter-spacing:.08em; }
.lt-event { display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:8px; background:rgba(255,255,255,.02); font-size:11px; color:var(--text-secondary); animation:typeIn .35s cubic-bezier(.34,1.56,.64,1) both; margin-top:4px; }
.lt-event strong { color:var(--text); font-weight:600; }
.lt-event .lt-icon { width:20px; height:20px; border-radius:6px; display:grid; place-items:center; font-size:10px; flex-shrink:0; }
.lt-event .lt-ts { margin-left:auto; font-size:9px; font-family:var(--mono); color:var(--muted); flex-shrink:0; }

/* AI Card */
.ai-card { background:linear-gradient(135deg,rgba(56,189,248,.04),rgba(124,108,255,.04)); border-color:rgba(56,189,248,.1); }
.ai-label { display:inline-flex; align-items:center; gap:5px; font-size:9px; font-family:var(--mono); font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--info); margin-bottom:10px; }
.suggestion { padding:8px 10px; border-radius:8px; background:rgba(255,255,255,.025); border:1px solid transparent; font-size:11.5px; color:var(--text-secondary); display:flex; align-items:flex-start; gap:8px; transition:all .25s ease; cursor:pointer; margin-top:4px; }
.suggestion:hover { border-color:var(--info); background:rgba(56,189,248,.04); transform:translateX(3px); }
.suggestion strong { color:var(--text); font-weight:600; }

/* CC card */
.cc-card { background:linear-gradient(135deg,rgba(124,108,255,.05),rgba(0,229,160,.03)); border-color:rgba(124,108,255,.1); }

/* Impact */
.impact-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
.impact-pill { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:10px; background:rgba(255,255,255,.025); border:1px solid var(--line); font-size:11px; font-weight:600; transition:var(--transition); }
.impact-pill:hover { border-color:var(--line-hover); transform:translateY(-1px); }

/* Timeline */
.timeline { position:relative; padding-left:24px; }
.timeline::before { content:''; position:absolute; left:7px; top:4px; bottom:4px; width:1px; background:rgba(255,255,255,.08); }
.tl-item { position:relative; padding:8px 0; }
.tl-item::before { content:''; position:absolute; left:-20px; top:14px; width:9px; height:9px; border-radius:50%; border:2px solid var(--line); background:var(--bg); }
.tl-item.tl-client::before { border-color:var(--brand); background:var(--brand-dim); }
.tl-item.tl-booking::before { border-color:var(--accent); background:var(--accent-dim); }
.tl-item.tl-invoice::before { border-color:var(--warm); background:var(--warm-dim); }
.tl-item.tl-auto::before { border-color:var(--ok); background:var(--ok-dim); }
.tl-time { font-size:9px; font-family:var(--mono); color:var(--muted); margin-bottom:2px; }
.tl-text { font-size:12px; color:var(--text-secondary); }
.tl-text strong { color:var(--text); font-weight:600; }

/* Empty */
.empty-state { text-align:center; padding:32px 20px; border:1px dashed rgba(255,255,255,.08); border-radius:var(--radius-lg); background:rgba(255,255,255,.01); }
.empty-state h3 { font-size:14px; margin-bottom:5px; }
.empty-state p { font-size:12px; color:var(--muted); margin-bottom:14px; }

/* Modal */
.modal-overlay { position:fixed; inset:0; background:rgba(4,4,10,.8); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:20px; z-index:50; animation:fadeIn .15s ease; }
.modal { width:min(680px,100%); max-height:88vh; overflow-y:auto; background:var(--panel-2); border:1px solid var(--line); border-radius:24px; padding:24px; box-shadow:0 20px 60px rgba(0,0,0,.5); animation:modalIn .3s cubic-bezier(.4,0,.2,1); }
.modal-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; gap:12px; }
.modal-head h2 { font-size:17px; font-weight:800; }

/* Forms */
.form-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
.form-grid .full { grid-column:1/-1; }
.field { display:flex; flex-direction:column; gap:5px; min-width:0; }
.field-label { font-size:11px; font-weight:600; color:var(--text-secondary); }
.input, .select, .textarea { background:var(--surface); border:1px solid var(--line); color:var(--text); padding:9px 12px; border-radius:9px; outline:none; font-size:12.5px; transition:var(--transition); width:100%; }
.input:focus, .select:focus, .textarea:focus { border-color:rgba(124,108,255,.3); box-shadow:0 0 0 3px rgba(124,108,255,.08); }
.textarea { min-height:90px; resize:vertical; }

/* Toast */
.toast-container { position:fixed; bottom:24px; right:24px; display:flex; flex-direction:column-reverse; gap:6px; z-index:80; }
.toast { background:var(--panel-3); border:1px solid var(--line); border-radius:11px; padding:10px 16px; font-size:12.5px; box-shadow:var(--shadow); display:flex; align-items:center; gap:10px; min-width:260px; animation:toastIn .4s cubic-bezier(.34,1.56,.64,1); }
.toast .t-icon { width:22px; height:22px; border-radius:6px; display:grid; place-items:center; font-size:11px; flex-shrink:0; }
.toast .t-icon.success { background:var(--accent-dim); color:var(--accent); }
.toast .t-icon.error { background:var(--danger-dim); color:var(--danger); }
.toast .t-icon.info { background:var(--brand-dim); color:var(--brand-light); }
.toast .undo-btn { margin-left:auto; padding:4px 10px; border-radius:6px; background:rgba(255,255,255,.08); border:1px solid var(--line); cursor:pointer; font-size:11px; font-weight:600; flex-shrink:0; }

/* Cmdk */
.cmdk-overlay { position:fixed; inset:0; background:rgba(4,4,10,.75); backdrop-filter:blur(10px); display:flex; align-items:flex-start; justify-content:center; padding-top:14vh; z-index:60; animation:fadeIn .1s ease; }
.cmdk-box { width:min(560px,calc(100% - 32px)); background:var(--panel-2); border:1px solid rgba(124,108,255,.12); border-radius:18px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 80px rgba(124,108,255,.08); animation:modalIn .25s cubic-bezier(.4,0,.2,1); }
.cmdk-header { padding:4px 16px; display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--line); }
.cmdk-prompt { font-size:14px; color:var(--brand-light); font-weight:700; }
.cmdk-box input { flex:1; background:transparent; border:none; padding:14px 0; font-size:14px; outline:none; }
.cmdk-results { max-height:50vh; overflow-y:auto; padding:5px; }
.cmdk-group-label { font-size:9px; font-family:var(--mono); font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); padding:10px 12px 4px; }
.cmdk-item { padding:9px 12px; border-radius:9px; cursor:pointer; font-size:12.5px; transition:var(--transition); display:flex; align-items:center; gap:10px; }
.cmdk-item:hover { background:rgba(124,108,255,.08); }
.cmdk-item .ci-icon { color:var(--muted); font-size:13px; width:18px; text-align:center; }
.cmdk-item .ci-short { margin-left:auto; font-size:9px; font-family:var(--mono); color:var(--muted); }

/* Notif */
.notif-btn { position:relative; }
.notif-count { position:absolute; top:-4px; right:-4px; min-width:16px; height:16px; border-radius:8px; background:var(--danger); color:white; font-size:9px; font-weight:700; font-family:var(--mono); display:grid; place-items:center; padding:0 4px; }
.notif-dropdown { position:absolute; top:calc(100% + 8px); right:0; width:320px; background:var(--panel-2); border:1px solid var(--line); border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,.5); z-index:35; max-height:400px; overflow-y:auto; animation:modalIn .2s ease both; }
.notif-dropdown-head { padding:12px 14px; border-bottom:1px solid var(--line); font-size:12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; }
.notif-item { padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.03); font-size:12px; color:var(--text-secondary); display:flex; align-items:flex-start; gap:8px; }
.notif-item:last-child { border-bottom:none; }
.notif-item .ni-icon { width:28px; height:28px; border-radius:8px; display:grid; place-items:center; font-size:12px; flex-shrink:0; }
.notif-item strong { color:var(--text); font-weight:600; }

/* Detail panel */
.detail-backdrop { position:fixed; inset:0; background:rgba(4,4,10,.5); z-index:44; animation:fadeIn .15s; }
.detail-panel { position:fixed; top:0; right:0; width:420px; max-width:100%; height:100vh; background:var(--panel-2); border-left:1px solid var(--line); z-index:45; overflow-y:auto; padding:24px; animation:modalIn .3s ease; }

/* Section */
.section-head { margin-bottom:18px; }
.section-title { font-size:24px; font-weight:800; letter-spacing:-.04em; margin-bottom:3px; }
.section-sub { font-size:12px; color:var(--muted); }
.between { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }

/* Guided tour */
.tour-overlay { position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; }
.tour-backdrop { position:absolute; inset:0; background:rgba(4,4,10,.7); backdrop-filter:blur(4px); }
.tour-card { position:relative; z-index:2; width:min(480px,calc(100% - 32px)); background:var(--panel-2); border:1px solid rgba(124,108,255,.15); border-radius:24px; padding:32px; box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 80px rgba(124,108,255,.08); animation:modalIn .35s cubic-bezier(.4,0,.2,1); }
.tour-dots { display:flex; gap:6px; margin-bottom:20px; }
.tour-dot { height:3px; border-radius:2px; background:rgba(255,255,255,.08); transition:all .3s; }
.tour-dot.active { background:var(--brand); width:48px; }
.tour-dot.done { background:var(--accent); width:32px; }
.tour-dot.pending { width:32px; }
.tour-icon { width:52px; height:52px; border-radius:16px; display:grid; place-items:center; font-size:22px; margin-bottom:16px; }
.tour-step-num { font-size:11px; font-family:var(--mono); color:var(--brand-light); font-weight:600; margin-bottom:6px; letter-spacing:.08em; }
.tour-title { font-size:22px; font-weight:800; letter-spacing:-.03em; margin-bottom:8px; }
.tour-desc { font-size:14px; color:var(--text-secondary); line-height:1.6; margin-bottom:24px; }
.tour-progress { height:3px; border-radius:2px; background:rgba(255,255,255,.06); margin-top:20px; overflow:hidden; }
.tour-progress-bar { height:100%; border-radius:2px; background:linear-gradient(90deg,var(--brand),var(--accent)); transition:width .5s cubic-bezier(.4,0,.2,1); }

@media(max-width:1400px) { .grid.c4{grid-template-columns:repeat(2,1fr)} .grid.c3{grid-template-columns:repeat(2,1fr)} }
@media(max-width:1100px) { .app-shell{grid-template-columns:1fr} .sidebar{display:none} .grid.c4,.grid.c3,.grid.c2,.kanban,.cal-grid,.form-grid{grid-template-columns:1fr} }
@media(max-width:720px) { .content{padding:10px 12px 40px} .section-title{font-size:20px} .topbar{position:static;background:none;backdrop-filter:none} }
/* Bottom nav mobile */
.bottom-nav { display:none; position:fixed; bottom:0; left:0; right:0; z-index:30; background:rgba(8,8,14,.96); backdrop-filter:blur(16px); border-top:1px solid var(--line); padding:5px 8px; justify-content:space-around; }
.bottom-nav button { background:none; border:none; color:var(--muted); font-size:9px; padding:5px 8px; border-radius:8px; cursor:pointer; transition:var(--transition); display:flex; flex-direction:column; align-items:center; gap:2px; }
.bottom-nav button .bnav-icon { font-size:16px; }
.bottom-nav button.active { color:var(--brand-light); background:var(--brand-dim); }
@media(max-width:1100px) { .bottom-nav{display:flex} .content{padding-bottom:80px} }


/* Health score */
.health-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:600; font-family:var(--mono); }

/* Subscriptions */
.sub-card { background:linear-gradient(135deg,rgba(124,108,255,.03),rgba(0,214,143,.03)); border-color:rgba(124,108,255,.08); }
.sub-status { display:inline-flex; align-items:center; gap:4px; }

/* Segment builder */
.segment-rule { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; background:rgba(255,255,255,.02); border:1px solid var(--line); font-size:11px; margin-top:4px; }
.segment-rule select, .segment-rule input { background:var(--surface); border:1px solid var(--line); color:var(--text); padding:4px 8px; border-radius:6px; font-size:11px; outline:none; }

/* Audit trail */
.audit-item { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; background:rgba(255,255,255,.02); border:1px solid var(--line); font-size:11px; margin-top:4px; }
.audit-item .audit-field { font-family:var(--mono); color:var(--brand-light); font-weight:600; }
.audit-item .audit-old { color:var(--danger); text-decoration:line-through; }
.audit-item .audit-new { color:var(--ok); font-weight:600; }
.audit-item .audit-ts { margin-left:auto; font-size:9px; font-family:var(--mono); color:var(--muted); flex-shrink:0; }

/* Priority badges */
.priority-high { color:var(--danger); }
.priority-medium { color:var(--warm); }
.priority-low { color:var(--muted); }
.overdue-badge { display:inline-flex; align-items:center; gap:3px; padding:2px 6px; border-radius:5px; background:var(--danger-dim); color:var(--danger); font-size:9px; font-weight:700; font-family:var(--mono); animation:livePulse 2s ease-in-out infinite; }

/* CSV Import */
.csv-preview { max-height:300px; overflow:auto; border:1px solid var(--line); border-radius:var(--radius); margin-top:8px; }
.csv-preview table { width:100%; border-collapse:collapse; font-size:11px; }
.csv-preview th { background:rgba(255,255,255,.04); padding:6px 10px; text-align:left; font-family:var(--mono); font-size:9px; text-transform:uppercase; border-bottom:1px solid var(--line); }
.csv-preview td { padding:5px 10px; border-bottom:1px solid rgba(255,255,255,.02); }

/* Task management enhanced */
.task-card-enhanced { padding:10px 12px; border-radius:10px; background:var(--surface); border:1px solid var(--line); font-size:12px; transition:all .25s ease; margin-bottom:6px; }
.task-card-enhanced:hover { border-color:var(--line-hover); transform:translateY(-2px); box-shadow:0 2px 8px rgba(0,0,0,.3); }
.task-meta { display:flex; gap:4px; flex-wrap:wrap; margin-top:5px; }

/* Health bar */
.health-bar { height:4px; border-radius:2px; background:rgba(255,255,255,.04); overflow:hidden; width:60px; }
.health-fill { height:100%; border-radius:2px; transition:width .5s ease; }

/* Confirm dialog */
.confirm-overlay { position:fixed; inset:0; background:rgba(4,4,10,.8); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:90; animation:fadeIn .1s ease; }
.confirm-box { background:var(--panel-2); border:1px solid var(--line); border-radius:20px; padding:24px; width:min(400px,90%); animation:modalIn .25s ease; text-align:center; }
.confirm-box h3 { font-size:16px; font-weight:800; margin-bottom:8px; }
.confirm-box p { font-size:13px; color:var(--text-secondary); margin-bottom:20px; }
.confirm-actions { display:flex; gap:10px; justify-content:center; }

/* Hover preview */
.hover-preview { position:fixed; z-index:55; background:var(--panel-3); border:1px solid var(--line-hover); border-radius:14px; padding:14px; width:260px; box-shadow:0 20px 50px rgba(0,0,0,.5); pointer-events:none; animation:typeIn .15s ease both; }
.hover-preview h4 { font-size:13px; font-weight:700; margin-bottom:4px; }
.hover-preview .hp-row { display:flex; justify-content:space-between; padding:3px 0; font-size:11px; color:var(--text-secondary); border-bottom:1px solid rgba(255,255,255,.03); }
.hover-preview .hp-row:last-child { border:none; }

/* Keyboard help */
.kbd-overlay { position:fixed; inset:0; background:rgba(4,4,10,.75); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:70; animation:fadeIn .1s; }
.kbd-card { background:var(--panel-2); border:1px solid var(--line); border-radius:20px; padding:28px; width:min(520px,90%); animation:modalIn .25s ease; max-height:80vh; overflow-y:auto; }
.kbd-card h2 { font-size:17px; font-weight:800; margin-bottom:16px; }
.kbd-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; font-size:12px; color:var(--text-secondary); border-bottom:1px solid rgba(255,255,255,.03); }
.kbd-row:last-child { border:none; }
.kbd-row kbd { padding:3px 8px; border-radius:5px; background:rgba(255,255,255,.05); border:1px solid var(--line); font-size:10px; font-family:var(--mono); color:var(--text); min-width:24px; text-align:center; }

/* Forecast card */
.forecast-card { background:linear-gradient(135deg,rgba(0,229,160,.04),rgba(124,108,255,.04)); border-color:rgba(0,229,160,.1); }
.goal-bar { height:8px; border-radius:4px; background:rgba(255,255,255,.04); overflow:hidden; margin-top:8px; }
.goal-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--brand),var(--accent)); transition:width .8s cubic-bezier(.34,1.56,.64,1); }

/* Checkbox */
input[type="checkbox"] { width:14px; height:14px; accent-color:var(--brand); cursor:pointer; }

/* Conflict badge */
.conflict-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:6px; background:var(--danger-dim); color:var(--danger); font-size:10px; font-weight:600; font-family:var(--mono); animation:livePulse 1.5s ease-in-out infinite; }

/* Sort header */
.sortable-th { cursor:pointer; user-select:none; }
.sortable-th:hover { color:var(--text); }

/* Task input */
.task-input-row { display:flex; gap:6px; margin-top:8px; }
.task-input-row input { flex:1; }

/* Save flash */
.save-flash { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:6px; background:var(--ok-dim); color:var(--ok); font-size:10px; font-family:var(--mono); font-weight:600; animation:saveFlashIn .3s ease both; }
@keyframes saveFlashIn { from{opacity:0;transform:scale(.8)} to{opacity:1;transform:scale(1)} }

/* Premium modules */
.board-grid { display:grid; grid-template-columns:repeat(5,minmax(170px,1fr)); gap:12px; align-items:start; }
.board-col { background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:12px; min-height:220px; }
.board-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; font-size:11px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; }
.deal-card, .message-card, .campaign-card, .offer-card, .staff-card, .ai-card { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:12px; }
.deal-card + .deal-card, .message-card + .message-card, .campaign-card + .campaign-card, .offer-card + .offer-card, .staff-card + .staff-card, .ai-card + .ai-card { margin-top:10px; }
.metric-row { display:grid; grid-template-columns:repeat(4,minmax(160px,1fr)); gap:12px; }
.module-toolbar { display:flex; gap:8px; flex-wrap:wrap; }
.msg-meta { display:flex; gap:6px; flex-wrap:wrap; margin:8px 0; }
.timeline-mini { display:flex; flex-direction:column; gap:8px; }
.flow-stage-list { display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.flow-stage-item { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-radius:12px; border:1px solid var(--line); background:var(--surface); }
.kv { display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:11px; color:var(--text-secondary); }
.segment-pills { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
.info-banner { display:flex; align-items:center; justify-content:space-between; gap:12px; background:linear-gradient(135deg,var(--brand-dim),rgba(0,229,160,.05)); border:1px solid var(--line); border-radius:16px; padding:14px 16px; }
@media (max-width: 1200px) { .board-grid, .metric-row { grid-template-columns:repeat(2,minmax(220px,1fr)); } }
@media (max-width: 760px) { .board-grid, .metric-row { grid-template-columns:1fr; } }

`;

// ─── Empty forms ───
const emptyClient = { name: "", email: "", phone: "", tags: "", notes: "", source: "Organic" };
const emptyService = { name: "", price: 0, duration: 60, category: "" };
const emptyBooking = { clientId: "", serviceId: "", staffId: "", date: todayISO(), time: "10:00", status: "confirmed", notes: "" };
const emptyPost = { title: "", category: "", tags: "", status: "draft", body: "" };

// ─── Tour steps ───
const tourSteps = [
  { num: "PASUL 1 DIN 4", icon: "◉", bg: "linear-gradient(135deg,var(--brand),var(--brand-light))", title: "Adaugă un client", desc: "Primul pas: creezi un profil de client cu date de contact, tag-uri și notițe.", action: "Adaugă client demo" },
  { num: "PASUL 2 DIN 4", icon: "▦", bg: "linear-gradient(135deg,var(--accent),#00ffc8)", title: "Creează o programare", desc: "Leagă clientul de un serviciu, angajat și slot orar.", action: "Creează programare" },
  { num: "PASUL 3 DIN 4", icon: "⊡", bg: "linear-gradient(135deg,var(--warm),#ffa96b)", title: "Generează factura", desc: "Un click: factura se generează din ultimul booking.", action: "Generează factură" },
  { num: "PASUL 4 DIN 4", icon: "⚡", bg: "linear-gradient(135deg,var(--ok),#38f5b8)", title: "Rulează automatizările", desc: "Sistemul trimite remindere și follow-up-uri automat.", action: "Rulează automatizări" },
];

// ─── Command palette commands ───
const cmdGroups = [
  { group: "Navigare", items: [
    { icon: "⌂", label: "Dashboard", view: "dashboard", key: "D" },
    { icon: "◉", label: "Clienți CRM", view: "clients", key: "C" },
    { icon: "◬", label: "Pipeline", view: "pipeline", key: "P" },
    { icon: "💬", label: "Inbox", view: "inbox", key: "I" },
    { icon: "▦", label: "Programări", view: "bookings", key: "B" },
    { icon: "◫", label: "Calendar", view: "calendar" },
    { icon: "✎", label: "Content", view: "content" },
    { icon: "🎯", label: "Campanii", view: "campaigns" },
    { icon: "🧾", label: "Oferte", view: "offers" },
    { icon: "📊", label: "Analytics", view: "analytics" },
    { icon: "👥", label: "Echipă", view: "team" },
    { icon: "🤖", label: "AI Assistant", view: "ai" },
    { icon: "⊡", label: "Facturare", view: "billing", key: "F" },
    { icon: "⚡", label: "Automatizări", view: "automation" },
    { icon: "◎", label: "Booking extern", view: "booking-public" },
    { icon: "🔄", label: "Abonamente", view: "subscriptions" },
    { icon: "🎯", label: "Segmente avansate", view: "segments" },
    { icon: "☑", label: "Task Manager", view: "task-manager" },
    { icon: "⚙", label: "Setări", view: "settings", key: "S" },
  ]},
  { group: "Acțiuni", items: [
    { icon: "＋", label: "Adaugă client", modal: "client", key: "N" },
    { icon: "＋", label: "Adaugă programare", modal: "booking" },
    { icon: "＋", label: "Adaugă serviciu", modal: "service" },
    { icon: "＋", label: "Adaugă postare", modal: "post" },
    { icon: "⊡", label: "Generează factură", action: "invoice" },
    { icon: "⚡", label: "Rulează automatizări", action: "auto" },
  ]},
];

// ═══ MAIN COMPONENT ═══
export default function AlpisFusionCRM() {
  const [phase, setPhase] = useState("hero"); // hero | tour | app
  const [tourStep, setTourStep] = useState(0);
  const [heroExiting, setHeroExiting] = useState(false);
  const [state, setState] = useState(createDemoState);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const [editId, setEditId] = useState(null);
  const [clientForm, setClientForm] = useState(emptyClient);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [bookingForm, setBookingForm] = useState(emptyBooking);
  const [postForm, setPostForm] = useState(emptyPost);
  const [toasts, setToasts] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [cmdkQuery, setCmdkQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [detailClient, setDetailClient] = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [clientFilter, setClientFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState(null);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [dealForm, setDealForm] = useState({ title: "", clientId: "", value: 0, stage: "lead" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const [viewTab, setViewTab] = useState("all");
  const [taskForm, setTaskForm] = useState({ title: "", priority: "medium", ownerId: "", dueDate: todayISO(), clientId: "" });
  const [csvData, setCsvData] = useState(null);
  const [csvTarget, setCsvTarget] = useState("clients");
  const [segmentForm, setSegmentForm] = useState({ name: "", rules: [{ field: "tag", op: "includes", value: "" }] });
  const [hoverClient, setHoverClient] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const rootRef = useRef(null);

  // Toast system
  const toast = useCallback((msg, type = "success", undoFn = null) => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, type, undoFn }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), undoFn ? 6000 : 3500);
  }, []);
  const closeModal2 = () => { setModal(""); setEditId(null); setClientForm(emptyClient); setServiceForm(emptyService); setBookingForm(emptyBooking); setPostForm(emptyPost); setDealForm({ title: "", clientId: "", value: 0, stage: "lead" }); };

  // Hero → App
  const enterApp = () => { setHeroExiting(true); setTimeout(() => setPhase("app"), 600); };
  const startTour = () => { setHeroExiting(true); setTimeout(() => { setPhase("tour"); setTourStep(0); }, 600); };

  // Tour actions
  const tourAction = () => {
    if (tourStep === 0) {
      const c = { id: uid(), name: "Maria Popescu", email: "maria@demo.com", phone: "0722111222", tags: ["new"], notes: "Client din tour.", createdAt: todayISO(), lastVisit: "", conversation: ["Creat din guided tour"] };
      setState((s) => ({ ...s, clients: [c, ...s.clients] }));
      toast("Client adăugat: Maria Popescu");
    } else if (tourStep === 1) {
      const cl = state.clients[0], svc = state.services[0], stf = state.staff[0];
      if (cl && svc && stf) {
        setState((s) => ({ ...s, bookings: [{ id: uid(), clientId: cl.id, serviceId: svc.id, staffId: stf.id, date: todayISO(), time: "10:00", status: "confirmed", notes: "Booking din tour" }, ...s.bookings] }));
        toast("Programare creată: azi la 10:00");
      }
    } else if (tourStep === 2) {
      const b = state.bookings[0];
      if (b) {
        const sv = state.services.find((x) => x.id === b.serviceId);
        setState((s) => ({ ...s, invoices: [{ id: uid(), clientId: b.clientId, bookingId: b.id, amount: sv?.price || 0, status: "unpaid", createdAt: todayISO() }, ...s.invoices] }));
        toast("Factură generată: " + currency(sv?.price || 0));
      }
    } else if (tourStep === 3) {
      const n = state.bookings.filter((b) => b.status === "pending").length;
      if (n > 0) setState((s) => ({ ...s, bookings: s.bookings.map((b) => b.status === "pending" ? { ...b, status: "confirmed" } : b) }));
      toast(`${n || 0} programări confirmate`);
    }
    if (tourStep < 3) setTourStep((s) => s + 1);
    else setTourStep(4);
  };

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      const mac = navigator.platform?.toUpperCase().includes("MAC");
      if ((mac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdkOpen(true); }
      if (e.key === "Escape") { setCmdkOpen(false); setNotifOpen(false); setDetailClient(null); setConfirmAction(null); setShowKeyboardHelp(false); if (modal) closeModal2(); }
      if (phase === "hero" && e.key === "Enter") startTour();
      if (phase === "app" && !modal && !cmdkOpen && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) {
        const map = { d: "dashboard", c: "clients", b: "bookings", p: "pipeline", f: "billing", i: "inbox", a: "analytics", s: "settings" };
        if (map[e.key.toLowerCase()]) setView(map[e.key.toLowerCase()]);
        if (e.key.toLowerCase() === "n") setModal("quick");
        if (e.key === "?") setShowKeyboardHelp(true);
      }
    };
    // Click outside to close notif dropdown
    const clickOutside = (e) => { if (notifOpen && !e.target.closest(".notif-btn")) setNotifOpen(false); };
    window.addEventListener("keydown", handler);
    document.addEventListener("click", clickOutside);
    return () => { window.removeEventListener("keydown", handler); document.removeEventListener("click", clickOutside); };
  }, [phase, modal, cmdkOpen, notifOpen]);

  // Scroll to top on view change
  useEffect(() => {
    const el = document.querySelector(".content");
    if (el) el.scrollTo({ top: 0, behavior: "smooth" });
    setClientPage(1); setSelectedIds([]); setViewTab("all");
  }, [view]);

  // Persistence — load on mount
  useEffect(() => {
    const saved = localStorage.getItem("alpis-fusion-demo-state");
    const savedTheme = localStorage.getItem("alpis-fusion-theme");
    if (saved) {
      try { setState(JSON.parse(saved)); } catch {}
    }
    if (savedTheme) setDarkMode(savedTheme === "dark");
  }, []);

  // Autosave every 30 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      localStorage.setItem("alpis-fusion-demo-state", JSON.stringify(state));
      setLastSaved(new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    }, 30000);
    return () => clearInterval(iv);
  }, [state]);

  // Also save on unmount / tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem("alpis-fusion-demo-state", JSON.stringify(state));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state]);

  useEffect(() => {
    localStorage.setItem("alpis-fusion-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Live simulation
  useEffect(() => {
    if (phase !== "app" || !state.clients.length) return;
    const simTypes = [
      { icon: "◉", bg: "var(--brand-dim)", color: "var(--brand-light)", tpl: (c) => `${c} adăugat în CRM` },
      { icon: "▦", bg: "var(--accent-dim)", color: "var(--accent)", tpl: (c) => `Booking confirmat: ${c}` },
      { icon: "⊡", bg: "var(--warm-dim)", color: "var(--warm)", tpl: (c) => `Factură generată: ${c}` },
      { icon: "⚡", bg: "var(--ok-dim)", color: "var(--ok)", tpl: (c) => `Reminder trimis: ${c}` },
    ];
    const add = () => {
      const t = simTypes[Math.floor(Math.random() * simTypes.length)];
      const c = state.clients[Math.floor(Math.random() * state.clients.length)]?.name || "Client";
      const now = new Date();
      setLiveEvents((evts) => [{ id: uid(), ...t, text: t.tpl(c), ts: `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}` }, ...evts].slice(0, 6));
    };
    add(); const iv = setInterval(add, 5000 + Math.random() * 3000);
    return () => clearInterval(iv);
  }, [phase, state.clients.length]);

  // ── Computed ──
  const revenue = useMemo(() => state.invoices.reduce((s, i) => s + Number(i.amount || 0), 0), [state.invoices]);
  const unpaidInv = useMemo(() => state.invoices.filter((i) => i.status !== "paid"), [state.invoices]);
  const enrichedClients = useMemo(() =>
    state.clients.filter((c) => [c.name, c.email, c.phone, c.notes, c.tags?.join(" ")].join(" ").toLowerCase().includes(search.toLowerCase()))
      .filter((c) => clientFilter === "all" || (c.tags || []).includes(clientFilter))
      .map((c) => ({ ...c, score: clientScore(c, state.bookings) })),
  [search, state.bookings, state.clients, clientFilter]);
  const d7 = useMemo(() => Array.from({ length: 7 }, (_, i) => inDays(i - 6)), []);
  const sparkClients = useMemo(() => d7.map((d) => state.clients.filter((c) => c.createdAt === d).length), [d7, state.clients]);
  const sparkBookings = useMemo(() => d7.map((d) => state.bookings.filter((b) => b.date === d).length), [d7, state.bookings]);
  const sparkRevenue = useMemo(() => d7.map((d) => state.invoices.filter((i) => i.createdAt === d).reduce((s, i2) => s + Number(i2.amount || 0), 0)), [d7, state.invoices]);
  const repeatCl = useMemo(() => state.clients.filter((c) => state.bookings.filter((b) => b.clientId === c.id).length > 1).length, [state.clients, state.bookings]);
  const retention = state.clients.length ? Math.round((repeatCl / state.clients.length) * 100) : 0;

  // Health scores
  const clientsWithHealth = useMemo(() => 
    state.clients.map(c => ({ ...c, health: healthScore(c, state.bookings, state.invoices) })),
  [state.clients, state.bookings, state.invoices]);

  // Lead source stats
  const sourceStats = useMemo(() => {
    const m = {};
    state.clients.forEach(c => { const src = c.source || 'Necunoscut'; m[src] = (m[src] || 0) + 1; });
    return Object.entries(m).sort((a,b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [state.clients]);

  // Revenue per source
  const revenueBySource = useMemo(() => {
    const m = {};
    state.clients.forEach(c => {
      const src = c.source || 'Necunoscut';
      const rev = state.invoices.filter(i => i.clientId === c.id && i.status === 'paid').reduce((s,i) => s + Number(i.amount || 0), 0);
      m[src] = (m[src] || 0) + rev;
    });
    return Object.entries(m).sort((a,b) => b[1] - a[1]).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [state.clients, state.invoices]);

  // Executive KPIs
  const conversionByStage = useMemo(() => {
    const total = state.deals.length || 1;
    return ["lead","contacted","offer","won","lost"].map(s => ({ stage: s, count: state.deals.filter(d => d.stage === s).length, pct: Math.round((state.deals.filter(d => d.stage === s).length / total) * 100) }));
  }, [state.deals]);

  const noShowRate = useMemo(() => {
    const total = state.bookings.length || 1;
    const noShows = state.bookings.filter(b => b.status === 'no-show').length;
    return Math.round((noShows / total) * 100);
  }, [state.bookings]);

  const invoiceCollectionRate = useMemo(() => {
    const total = state.invoices.length || 1;
    const paid = state.invoices.filter(i => i.status === 'paid').length;
    return Math.round((paid / total) * 100);
  }, [state.invoices]);

  const avgSalesCycle = useMemo(() => {
    const wonDeals = state.deals.filter(d => d.stage === 'won');
    return wonDeals.length ? Math.round(wonDeals.length * 4.2) : 0; // simulated days
  }, [state.deals]);

  const topServiceByProfit = useMemo(() => {
    return revenueByService.sort((a,b) => b.value - a.value)[0]?.name || '—';
  }, [revenueByService]);

  // Subscription metrics
  const subscriptionMRR = useMemo(() => {
    return (state.subscriptions || []).filter(s => s.status === 'active').reduce((sum, s) => sum + Number(s.amount || 0), 0);
  }, [state.subscriptions]);

  const expiringSubscriptions = useMemo(() => {
    return (state.subscriptions || []).filter(s => s.status === 'active' && s.nextRenewal <= inDays(7));
  }, [state.subscriptions]);

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    return state.tasks.filter(t => t.lane !== 'done' && t.dueDate && t.dueDate < todayISO());
  }, [state.tasks]);

  // Segments matching
  const matchSegment = useCallback((segment) => {
    return state.clients.filter(c => {
      return (segment.rules || []).every(rule => {
        if (rule.field === 'tag') return rule.op === 'includes' ? (c.tags || []).includes(rule.value) : !(c.tags || []).includes(rule.value);
        if (rule.field === 'daysSinceBooking') {
          const cBks = state.bookings.filter(b => b.clientId === c.id);
          const last = cBks.sort((a,b) => b.date.localeCompare(a.date))[0];
          const days = last ? Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000) : 999;
          return rule.op === '>' ? days > Number(rule.value) : days < Number(rule.value);
        }
        if (rule.field === 'unpaidInvoices') {
          const unpaid = state.invoices.filter(i => i.clientId === c.id && i.status === 'unpaid').length;
          return rule.op === '>' ? unpaid > Number(rule.value) : unpaid === 0;
        }
        if (rule.field === 'source') return c.source === rule.value;
        if (rule.field === 'health') {
          const h = healthScore(c, state.bookings, state.invoices);
          return rule.op === '<' ? h < Number(rule.value) : h >= Number(rule.value);
        }
        return true;
      });
    });
  }, [state.clients, state.bookings, state.invoices]);

  const bookingRows = useMemo(() => state.bookings.map((b) => {
    const c = state.clients.find((i) => i.id === b.clientId);
    const sv = state.services.find((i) => i.id === b.serviceId);
    const st = state.staff.find((i) => i.id === b.staffId);
    return { ...b, clientName: c?.name || "-", serviceName: sv?.name || "-", staffName: st?.name || "-" };
  }).filter((r) => !search || [r.clientName, r.serviceName, r.staffName, r.date, r.time, r.status].join(" ").toLowerCase().includes(search.toLowerCase())),
  [state.bookings, state.clients, state.services, state.staff, search]);
  const invoiceRows = useMemo(() => state.invoices.map((i) => ({ ...i, clientName: state.clients.find((c) => c.id === i.clientId)?.name || "-" })).filter((r) => !search || [r.clientName, r.id, r.status, String(r.amount)].join(" ").toLowerCase().includes(search.toLowerCase())), [state.invoices, state.clients, search]);

  const revenueByService = useMemo(() => {
    const m = {}; state.invoices.forEach((inv) => { const bk = state.bookings.find((b) => b.id === inv.bookingId); const sv = bk ? state.services.find((s) => s.id === bk.serviceId) : null; const nm = sv?.name || "Altele"; m[nm] = (m[nm] || 0) + Number(inv.amount || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [state.bookings, state.invoices, state.services]);
  const bookingsByStatus = useMemo(() => { const m = {}; state.bookings.forEach((b) => { m[b.status] = (m[b.status] || 0) + 1; }); return Object.entries(m).map(([name, value]) => ({ name, value })); }, [state.bookings]);
  const clientsByTag = useMemo(() => { const m = {}; state.clients.forEach((c) => (c.tags || []).forEach((t) => { m[t] = (m[t] || 0) + 1; })); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })); }, [state.clients]);
  const pipelineStages = ["lead", "contacted", "offer", "won", "lost"];
  const dealsByStage = useMemo(() => pipelineStages.map((stage) => ({ stage, items: state.deals.filter((d) => d.stage === stage) })), [state.deals]);
  const ltv = useMemo(() => {
    const paid = state.invoices.filter((i) => i.status === "paid");
    const uniq = new Set(paid.map((i) => i.clientId)).size || 1;
    return Math.round(paid.reduce((sum, inv) => sum + Number(inv.amount || 0), 0) / uniq);
  }, [state.invoices]);
  const messageRows = useMemo(() => state.messages.map((m) => ({ ...m, clientName: state.clients.find((c) => c.id === m.clientId)?.name || "Client necunoscut" })), [state.messages, state.clients]);
  const staffPerformance = useMemo(() => state.staff.map((member) => {
    const memberBookings = state.bookings.filter((b) => b.staffId === member.id);
    const completed = memberBookings.filter((b) => b.status === "completed").length;
    const revenueOwned = memberBookings.reduce((sum, booking) => {
      const inv = state.invoices.find((i) => i.bookingId === booking.id && i.status === "paid");
      return sum + Number(inv?.amount || 0);
    }, 0);
    return { ...member, bookings: memberBookings.length, completed, revenue: revenueOwned, conversion: memberBookings.length ? Math.round((completed / memberBookings.length) * 100) : 0 };
  }), [state.staff, state.bookings, state.invoices]);
  const suggestedSlots = useMemo(() => {
    const topClient = state.clients.find((c) => c.tags?.includes("vip")) || state.clients[0];
    const slots = [];
    for (let i = 0; i < 5; i++) {
      const d = inDays(i);
      state.staff.forEach((member) => {
        ["09:00","11:00","14:00","16:00"].forEach((t) => {
          if (!state.bookings.some((b) => b.staffId === member.id && b.date === d && b.time === t)) {
            slots.push({ day: d, time: t, staffName: member.name, clientName: topClient?.name || "Client" });
          }
        });
      });
    }
    return slots.slice(0, 6);
  }, [state.bookings, state.staff, state.clients]);
  const campaignStats = useMemo(() => state.campaigns.reduce((acc, c) => ({ reach: acc.reach + c.reach, conversions: acc.conversions + c.conversions }), { reach: 0, conversions: 0 }), [state.campaigns]);

  // Notifications
  const notifications = useMemo(() => {
    const n = [];
    state.bookings.filter((b) => b.status === "pending").forEach((b) => { const c = state.clients.find((x) => x.id === b.clientId); n.push({ icon: "▦", bg: "var(--warm-dim)", color: "var(--warm)", text: `${c?.name || "Client"} — booking pending`, time: b.date }); });
    state.invoices.filter((i) => i.status === "unpaid").forEach((i) => { const c = state.clients.find((x) => x.id === i.clientId); n.push({ icon: "⊡", bg: "var(--danger-dim)", color: "var(--danger)", text: `Factură neplătită: ${c?.name || "Client"} — ${currency(i.amount)}`, time: i.createdAt }); });
    state.offers.filter((o) => o.status === "sent").forEach((o) => { const c = state.clients.find((x) => x.id === o.clientId); n.push({ icon: "🧾", bg: "var(--brand-dim)", color: "var(--brand-light)", text: `Ofertă deschisă: ${c?.name || "Client"} — ${o.title}`, time: o.dueDate }); });
    state.messages.filter((m) => m.status === "new").forEach((m) => { const c = state.clients.find((x) => x.id === m.clientId); n.push({ icon: "💬", bg: "var(--info-dim)", color: "var(--info)", text: `Mesaj nou: ${c?.name || "Client"} — ${m.channel}`, time: m.ts }); });
    state.tasks.filter(t => t.lane !== 'done' && t.dueDate && t.dueDate < todayISO()).forEach(t => { n.push({ icon: "⏰", bg: "var(--danger-dim)", color: "var(--danger)", text: `Task overdue: ${t.title}`, time: t.dueDate }); });
    (state.subscriptions || []).filter(s => s.status === 'active' && s.nextRenewal <= inDays(3)).forEach(sub => { const c = state.clients.find(x => x.id === sub.clientId); n.push({ icon: "🔄", bg: "var(--warm-dim)", color: "var(--warm)", text: `Abonament expiră: ${c?.name || "Client"} — ${sub.name}`, time: sub.nextRenewal }); });
    return n.slice(0, 10);
  }, [state.bookings, state.invoices, state.clients, state.offers, state.messages]);

  // AI Suggestions
  const aiSuggestions = useMemo(() => {
    const s = [];
    const inactiveC = state.clients.filter((c) => c.tags?.includes("inactive"));
    if (inactiveC.length) s.push({ icon: "📩", text: `Trimite ofertă de revenire la ${inactiveC[0].name} — inactiv` });
    const pendingB = state.bookings.filter((b) => b.status === "pending");
    if (pendingB.length) { const c = state.clients.find((x) => x.id === pendingB[0].clientId); s.push({ icon: "⚠️", text: `${c?.name || "Client"} are booking pending — confirmare recomandată` }); }
    const vips = state.clients.filter((c) => c.tags?.includes("vip") && !state.bookings.some((b) => b.clientId === c.id && b.date >= todayISO()));
    if (vips.length) s.push({ icon: "⭐", text: `${vips[0].name} (VIP) nu are programare viitoare` });
    if (unpaidInv.length > 1) s.push({ icon: "💰", text: `${unpaidInv.length} facturi neplătite — ${currency(unpaidInv.reduce((a, i) => a + Number(i.amount || 0), 0))} de încasat` });
    if (state.messages.some((m) => m.status === "new")) s.push({ icon: "💬", text: "Inboxul are conversații noi — recomand răspuns AI în 1 click" });
    if (state.offers.some((o) => o.status === "draft")) s.push({ icon: "🧾", text: "Ai oferte în draft — trimite-le către clienții calzi" });
    const churnRisk = clientsWithHealth.filter(c => c.health < 40);
    if (churnRisk.length) s.push({ icon: "🔴", text: `${churnRisk.length} clienți cu risc de churn — health score < 40` });
    if (overdueTasks.length) s.push({ icon: "⏰", text: `${overdueTasks.length} task-uri overdue — necesită atenție imediată` });
    if (expiringSubscriptions.length) s.push({ icon: "🔄", text: `${expiringSubscriptions.length} abonamente expiră în 7 zile` });
    if (!s.length) s.push({ icon: "✅", text: "Totul arată bine!" });
    return s.slice(0, 6);
  }, [state.clients, state.bookings, unpaidInv, state.messages, state.offers]);

  // ── CRUD ──
  const addClient = () => { if (!clientForm.name.trim()) return toast("Numele este obligatoriu.", "error"); if (isDuplicateEmail(clientForm.email.trim())) return toast("Email deja existent: " + clientForm.email.trim(), "error"); const c = { id: uid(), name: clientForm.name.trim(), email: clientForm.email.trim(), phone: clientForm.phone.trim(), notes: clientForm.notes.trim(), tags: parseTags(clientForm.tags), source: clientForm.source || "Organic", createdAt: todayISO(), lastVisit: "", conversation: [] }; setState((s) => ({ ...s, clients: [c, ...s.clients] })); closeModal2(); logAct(`Client adăugat: ${c.name}`); toast(`Client „${c.name}" adăugat.`); };
  const saveEditClient = () => { if (!clientForm.name.trim()) return toast("Numele este obligatoriu.", "error"); setState((s) => ({ ...s, clients: s.clients.map((c) => c.id === editId ? { ...c, name: clientForm.name.trim(), email: clientForm.email.trim(), phone: clientForm.phone.trim(), notes: clientForm.notes.trim(), tags: parseTags(clientForm.tags) } : c) })); closeModal2(); toast("Client actualizat."); };
  const startEditClient = (c) => { setEditId(c.id); setClientForm({ name: c.name, email: c.email || "", phone: c.phone || "", tags: (c.tags || []).join(", "), notes: c.notes || "", source: c.source || "Organic" }); setModal("edit-client"); };
  const addService = () => { if (!serviceForm.name.trim()) return toast("Numele este obligatoriu.", "error"); setState((st) => ({ ...st, services: [{ id: uid(), name: serviceForm.name.trim(), category: serviceForm.category.trim(), price: Number(serviceForm.price), duration: Number(serviceForm.duration) }, ...st.services] })); closeModal2(); toast("Serviciu adăugat."); };
  const saveEditService = () => { setState((s) => ({ ...s, services: s.services.map((sv) => sv.id === editId ? { ...sv, name: serviceForm.name.trim(), category: serviceForm.category.trim(), price: Number(serviceForm.price), duration: Number(serviceForm.duration) } : sv) })); closeModal2(); toast("Serviciu actualizat."); };
  const startEditService = (s) => { setEditId(s.id); setServiceForm({ name: s.name, price: s.price, duration: s.duration, category: s.category || "" }); setModal("edit-service"); };
  const addBooking = () => { if (!bookingForm.clientId || !bookingForm.serviceId || !bookingForm.staffId) return toast("Completează toate câmpurile.", "error"); setState((s) => ({ ...s, bookings: [{ id: uid(), ...bookingForm }, ...s.bookings] })); closeModal2(); toast("Programare creată."); };
  const saveEditBooking = () => { setState((s) => ({ ...s, bookings: s.bookings.map((b) => b.id === editId ? { ...b, ...bookingForm } : b) })); closeModal2(); toast("Programare actualizată."); };
  const startEditBooking = (b) => { setEditId(b.id); setBookingForm({ clientId: b.clientId, serviceId: b.serviceId, staffId: b.staffId, date: b.date, time: b.time, status: b.status, notes: b.notes || "" }); setModal("edit-booking"); };
  const addPost = () => { if (!postForm.title.trim()) return toast("Titlul este obligatoriu.", "error"); setState((s) => ({ ...s, posts: [{ id: uid(), ...postForm, title: postForm.title.trim(), tags: parseTags(postForm.tags) }, ...s.posts] })); closeModal2(); toast("Postare creată."); };
  const saveEditPost = () => { setState((s) => ({ ...s, posts: s.posts.map((p) => p.id === editId ? { ...p, title: postForm.title.trim(), category: postForm.category.trim(), tags: parseTags(postForm.tags), status: postForm.status, body: postForm.body } : p) })); closeModal2(); toast("Postare actualizată."); };
  const startEditPost = (p) => { setEditId(p.id); setPostForm({ title: p.title, category: p.category || "", tags: (p.tags || []).join(", "), status: p.status, body: p.body || "" }); setModal("edit-post"); };
  const createInvoice = () => { const b = state.bookings[0]; if (!b) return toast("Nu există programări.", "error"); const sv = state.services.find((s) => s.id === b.serviceId); setState((s) => ({ ...s, invoices: [{ id: uid(), bookingId: b.id, clientId: b.clientId, amount: sv?.price || 0, status: "unpaid", createdAt: todayISO() }, ...s.invoices] })); setView("billing"); toast("Factură generată."); };
  const toggleInvoice = (id) => { const inv = state.invoices.find(i => i.id === id); const cl = state.clients.find(c => c.id === inv?.clientId); const oldStatus = inv?.status; const newStatus = oldStatus === "paid" ? "unpaid" : "paid"; setState((s) => ({ ...s, invoices: s.invoices.map((i) => i.id === id ? { ...i, status: newStatus } : i), auditTrail: [{ id: uid(), entity: "invoice", entityId: id, entityName: `Factură #${id.slice(0,6)} — ${cl?.name || 'Client'}`, field: "status", oldValue: oldStatus, newValue: newStatus, user: s.role, ts: new Date().toLocaleString("ro-RO") }, ...(s.auditTrail || []).slice(0, 99)] })); toast("Status actualizat."); };
  const runAutomations = () => { const n = state.bookings.filter((b) => b.status === "pending").length; if (!n) return toast("Nimic de confirmat.", "error"); setState((s) => ({ ...s, bookings: s.bookings.map((b) => b.status === "pending" ? { ...b, status: "confirmed" } : b) })); logAct(`Automatizare: ${n} programări confirmate`); toast(`${n} programări confirmate.`); };
  const toggleAutomation = (id) => { setState((s) => ({ ...s, automations: s.automations.map((a) => a.id === id ? { ...a, active: !a.active } : a) })); toast("Automatizare actualizată."); };
  const deleteItem = (col, id) => { const item = state[col].find((i) => i.id === id); setState((s) => ({ ...s, [col]: s[col].filter((i) => i.id !== id) })); toast("Element șters.", "success", () => { setState((s) => ({ ...s, [col]: [item, ...s[col]] })); toast("Ștergere anulată."); }); };
  const resetDemo = () => { setConfirmAction({ title: "Reset complet?", desc: "Toate datele vor fi șterse și înlocuite cu demo.", fn: () => { localStorage.removeItem("alpis-fusion-demo-state"); setState(createDemoState()); setView("dashboard"); setDetailClient(null); setPhase("app"); toast("Date demo resetate."); setConfirmAction(null); } }); };
  const changeRole = (r) => { setState((s) => ({ ...s, role: r })); toast("Rol schimbat: " + r, "info"); };

  // Export / Backup / Restore
  const downloadFile = (name, content, mime) => { const b = new Blob([content], { type: mime }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); };
  const exportJSON = (target) => { downloadFile(`alpis-${target}.json`, JSON.stringify(target === "all" ? state : state[target] || [], null, 2), "application/json"); toast(`Export JSON: ${target}`, "info"); };
  const exportCSV = (target) => { const rows = state[target] || []; if (!rows.length) return toast("Nu există date.", "error"); const h = Object.keys(rows[0]); const csv = [h.join(","), ...rows.map((r) => h.map((k) => JSON.stringify(Array.isArray(r[k]) ? r[k].join("|") : r[k] ?? "")).join(","))].join("\n"); downloadFile(`alpis-${target}.csv`, csv, "text/csv"); toast(`Export CSV: ${target}`, "info"); };
  const backupAll = () => { downloadFile("alpis-backup.json", JSON.stringify(state, null, 2), "application/json"); toast("Backup descărcat.", "info"); };
  const restoreBackup = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const parsed = JSON.parse(ev.target.result); setState((s) => ({ ...s, ...parsed })); toast("Backup restaurat."); } catch { toast("JSON invalid.", "error"); } }; r.readAsText(f); e.target.value = ""; };

  // Print Invoice PDF
  const printInvoice = (inv) => { const cl = state.clients.find((c) => c.id === inv.clientId); const w = window.open("", "_blank"); if (!w) return toast("Popup blocat.", "error"); w.document.write(`<!DOCTYPE html><html><head><title>Factură</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Outfit',system-ui;padding:48px;background:#fafafa;color:#1a1a2e}.inv{max-width:640px;margin:auto;background:white;border-radius:24px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.06)}.head{display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #f0f0f5}.logo-box{font-size:22px;font-weight:900;background:linear-gradient(135deg,#7c6cff,#00e5a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.total{font-size:36px;font-weight:800;background:linear-gradient(135deg,#7c6cff,#00e5a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:20px 0}.status{display:inline-block;padding:5px 14px;border-radius:8px;font-size:11px;font-weight:700;background:${inv.status==="paid"?"#e8f8f0;color:#1a9060":"#fff4e0;color:#b87a00"}}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f5;font-size:13px;color:#555}.row:last-child{border:none}@media print{body{padding:20px}}</style></head><body><div class="inv"><div class="head"><div><div class="logo-box">ALPis Fusion</div><p style="color:#888;font-size:11px;margin-top:3px">Factură fiscală</p></div><div style="text-align:right;color:#666;font-size:12px"><p>#${inv.id.slice(0,6).toUpperCase()}</p><p>${inv.createdAt}</p></div></div><p style="font-size:13px;color:#666">Client</p><p style="font-size:17px;font-weight:700;margin-bottom:18px">${cl?.name||"-"}</p><p style="font-size:12px;color:#888">${cl?.email||""} · ${cl?.phone||""}</p><div class="total">${currency(inv.amount)}</div><span class="status">${inv.status.toUpperCase()}</span><div style="margin-top:24px"><div class="row"><span>Subtotal</span><span>${currency(inv.amount)}</span></div><div class="row"><span>TVA (0%)</span><span>0 RON</span></div><div class="row" style="font-weight:700"><span>Total</span><span>${currency(inv.amount)}</span></div></div><p style="margin-top:24px;font-size:10px;color:#aaa;text-align:center">Generat automat de ALPis Fusion CRM · ${new Date().toLocaleDateString("ro-RO")}</p></div></body></html>`); w.document.close(); setTimeout(() => w.print(), 300); };

  // Duplicate client detection
  const isDuplicateEmail = (email) => email && state.clients.some((c) => c.id !== editId && c.email.toLowerCase() === email.toLowerCase());

  // Add task
  const addTask = (lane = "todo") => { if (!newTaskTitle.trim()) return; setState((s) => ({ ...s, tasks: [{ id: uid(), title: newTaskTitle.trim(), lane, priority: "medium", ownerId: s.staff[0]?.id, dueDate: inDays(3), clientId: null, createdAt: todayISO() }, ...s.tasks] })); setNewTaskTitle(""); toast("Task adăugat."); };
  const addFullTask = () => { if (!taskForm.title.trim()) return toast("Titlul este obligatoriu.", "error"); setState((s) => ({ ...s, tasks: [{ id: uid(), ...taskForm, title: taskForm.title.trim(), lane: "todo", createdAt: todayISO() }, ...s.tasks] })); setTaskForm({ title: "", priority: "medium", ownerId: "", dueDate: todayISO(), clientId: "" }); closeModal2(); toast("Task creat."); };
  const deleteTask = (id) => { setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })); toast("Task șters."); };
  const moveTask = (id, newLane) => { setState((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, lane: newLane } : t) })); };

  // Booking conflict
  const hasConflict = (booking) => state.bookings.some((b) => b.id !== booking.id && b.date === booking.date && b.time === booking.time && b.staffId === booking.staffId);

  // Sort helpers
  const toggleSort = (col) => { if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const sortedRows = (rows, col, dir) => { if (!col) return rows; return [...rows].sort((a, b) => { const va = a[col] ?? ""; const vb = b[col] ?? ""; if (typeof va === "number") return dir === "asc" ? va - vb : vb - va; return dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va)); }); };
  const moveDeal = (id, dir) => {
    setState((s) => {
      const stages = ["lead", "contacted", "offer", "won", "lost"];
      return { ...s, deals: s.deals.map((d) => {
        if (d.id !== id) return d;
        const idx = stages.indexOf(d.stage);
        const next = Math.max(0, Math.min(stages.length - 1, idx + dir));
        return { ...d, stage: stages[next] };
      }) };
    });
    toast(dir > 0 ? "Deal mutat înainte." : "Deal mutat înapoi.");
  };
  const quickReplyMessage = (clientId) => {
    const client = state.clients.find((c) => c.id === clientId);
    setState((s) => ({
      ...s,
      messages: [{ id: uid(), clientId, channel: "WhatsApp", direction: "out", status: "sent", ts: `${todayISO()} 12:00`, text: `Salut, ${client?.name?.split(" ")[0] || ""}! Avem un slot liber și o ofertă potrivită pentru tine.` }, ...s.messages.map((m) => m.clientId === clientId && m.status === "new" ? { ...m, status: "replied" } : m)],
    }));
    toast(`Răspuns AI trimis către ${client?.name || "client"}.`);
  };
  const createOfferFromDeal = (deal) => {
    setState((s) => ({ ...s, offers: [{ id: uid(), clientId: deal.clientId, title: `Ofertă — ${deal.title}`, amount: deal.value, status: "sent", createdAt: todayISO(), dueDate: inDays(5) }, ...s.offers] }));
    toast("Ofertă generată din deal.");
  };
  const toggleOfferStatus = (id) => {
    setState((s) => ({ ...s, offers: s.offers.map((o) => o.id === id ? { ...o, status: o.status === "accepted" ? "sent" : "accepted" } : o) }));
    toast("Status ofertă actualizat.");
  };
  const launchCampaign = (id) => {
    setState((s) => ({ ...s, campaigns: s.campaigns.map((c) => c.id === id ? { ...c, status: c.status === "running" ? "paused" : "running", conversions: c.status === "running" ? c.conversions : c.conversions + 1 } : c) }));
    toast("Campanie actualizată.");
  };
  const bookSuggestedSlot = (slot) => {
    const client = state.clients.find((c) => c.name === slot.clientName) || state.clients[0];
    const service = state.services[0];
    const member = state.staff.find((s) => s.name === slot.staffName) || state.staff[0];
    setState((s) => ({ ...s, bookings: [{ id: uid(), clientId: client.id, serviceId: service.id, staffId: member.id, date: slot.day, time: slot.time, status: "confirmed", notes: "Creat din smart scheduling" }, ...s.bookings] }));
    toast(`Slot rezervat: ${slot.day} ${slot.time}.`);
  };
  const applyAiAction = (type) => {
    if (type === "followup" && state.clients[0]) return quickReplyMessage(state.clients[0].id);
    if (type === "campaign") {
      setState((s) => ({ ...s, campaigns: [{ id: uid(), name: "Campanie AI winback", segment: "inactive", channel: "Email", status: "draft", reach: 26, conversions: 0 }, ...s.campaigns] }));
      return toast("Campanie propusă de AI.");
    }
    if (type === "offer" && state.deals[0]) return createOfferFromDeal(state.deals[0]);
    toast("Acțiune AI executată.");
  };

  // Toggle booking status cycle
  const toggleBookingStatus = (id) => { const cycle = { confirmed: "completed", completed: "pending", pending: "confirmed" }; setState((s) => ({ ...s, bookings: s.bookings.map((b) => b.id === id ? { ...b, status: cycle[b.status] || "confirmed" } : b) })); toast("Status programare schimbat."); };

  // Invoice from any booking
  const createInvoiceFromBooking = (booking) => { const sv = state.services.find((s) => s.id === booking.serviceId); if (state.invoices.some((i) => i.bookingId === booking.id)) return toast("Factură deja existentă pentru acest booking.", "error"); setState((s) => ({ ...s, invoices: [{ id: uid(), bookingId: booking.id, clientId: booking.clientId, amount: sv?.price || 0, status: "unpaid", createdAt: todayISO() }, ...s.invoices] })); toast("Factură generată: " + currency(sv?.price || 0)); };

  // Deal CRUD
  const addDeal = () => { if (!dealForm.title.trim() || !dealForm.clientId) return toast("Completează titlu și client.", "error"); setState((s) => ({ ...s, deals: [{ id: uid(), title: dealForm.title.trim(), clientId: dealForm.clientId, value: Number(dealForm.value) || 0, stage: dealForm.stage || "lead", ownerId: s.staff[0]?.id }, ...s.deals] })); setDealForm({ title: "", clientId: "", value: 0, stage: "lead" }); closeModal2(); toast("Deal adăugat."); };
  const startEditDeal = (d) => { setEditId(d.id); setDealForm({ title: d.title, clientId: d.clientId, value: d.value, stage: d.stage }); setModal("edit-deal"); };
  const saveEditDeal = () => { setState((s) => ({ ...s, deals: s.deals.map((d) => d.id === editId ? { ...d, title: dealForm.title.trim(), clientId: dealForm.clientId, value: Number(dealForm.value) || 0, stage: dealForm.stage } : d) })); closeModal2(); toast("Deal actualizat."); };

  // Custom message send
  const sendCustomMessage = (clientId, text) => { if (!text?.trim()) return; const client = state.clients.find((c) => c.id === clientId); setState((s) => ({ ...s, messages: [{ id: uid(), clientId, channel: "WhatsApp", direction: "out", status: "sent", ts: `${todayISO()} ${new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`, text: text.trim() }, ...s.messages] })); logAct(`Mesaj trimis: ${client?.name}`); toast(`Mesaj trimis către ${client?.name || "client"}.`); };

  // Activity log
  const logAct = useCallback((action) => { setState((s) => ({ ...s, activityLog: [{ id: uid(), action, ts: new Date().toLocaleString("ro-RO") }, ...(s.activityLog || []).slice(0, 49)] })); }, []);

  // Audit trail
  const auditLog = useCallback((entity, entityId, entityName, field, oldValue, newValue) => {
    setState((s) => ({ ...s, auditTrail: [{ id: uid(), entity, entityId, entityName, field, oldValue: String(oldValue), newValue: String(newValue), user: s.role, ts: new Date().toLocaleString("ro-RO") }, ...(s.auditTrail || []).slice(0, 99)] }));
  }, []);

  // CSV import
  const handleCSVImport = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { const parsed = parseCSV(ev.target.result); setCsvData(parsed); setModal("csv-import"); };
    r.readAsText(f);
    e.target.value = "";
  };
  const confirmCSVImport = () => {
    if (!csvData?.length) return toast("Nu există date.", "error");
    if (csvTarget === "clients") {
      const newClients = csvData.map(row => ({
        id: uid(), name: row.name || row.Name || row.Nume || "", email: row.email || row.Email || "",
        phone: row.phone || row.Phone || row.Telefon || "", tags: (row.tags || row.Tags || "").split("|").filter(Boolean),
        notes: row.notes || row.Notes || row.Notite || "", source: row.source || row.Source || row.Sursa || "CSV Import",
        createdAt: todayISO(), lastVisit: "", conversation: ["Import CSV"]
      })).filter(c => c.name);
      setState(s => ({ ...s, clients: [...newClients, ...s.clients] }));
      logAct(`CSV import: ${newClients.length} clienți`);
      toast(`${newClients.length} clienți importați din CSV.`);
    } else if (csvTarget === "bookings") {
      toast("Import bookings din CSV — demo mode.");
    }
    setCsvData(null); closeModal2();
  };

  // Subscription CRUD
  const addSubscription = (clientId, name, amount, interval) => {
    setState(s => ({ ...s, subscriptions: [{ id: uid(), clientId, name, amount: Number(amount), interval, startDate: todayISO(), nextRenewal: inDays(interval === 'lunar' ? 30 : interval === 'trimestrial' ? 90 : 365), status: 'active' }, ...(s.subscriptions || [])] }));
    toast("Abonament creat.");
  };
  const toggleSubscription = (id) => {
    setState(s => ({ ...s, subscriptions: (s.subscriptions || []).map(sub => sub.id === id ? { ...sub, status: sub.status === 'active' ? 'paused' : 'active' } : sub) }));
    toast("Status abonament actualizat.");
  };
  const renewSubscription = (id) => {
    setState(s => ({ ...s, subscriptions: (s.subscriptions || []).map(sub => sub.id === id ? { ...sub, nextRenewal: inDays(sub.interval === 'lunar' ? 30 : sub.interval === 'trimestrial' ? 90 : 365), status: 'active' } : sub) }));
    toast("Abonament reînnoit.");
  };

  // Segment CRUD
  const addSegment = () => {
    if (!segmentForm.name.trim()) return toast("Numele segmentului este obligatoriu.", "error");
    setState(s => ({ ...s, segments: [{ id: uid(), name: segmentForm.name.trim(), rules: segmentForm.rules.filter(r => r.value) }, ...(s.segments || [])] }));
    setSegmentForm({ name: "", rules: [{ field: "tag", op: "includes", value: "" }] });
    closeModal2(); toast("Segment salvat.");
  };

  // Bulk actions
  const toggleSelect = (id) => setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const selectAll = (ids) => setSelectedIds((s) => s.length === ids.length ? [] : [...ids]);
  const bulkDelete = (col) => { if (!selectedIds.length) return toast("Selectează elemente.", "error"); setConfirmAction({ title: `Șterge ${selectedIds.length} elemente?`, desc: "Acțiunea nu poate fi anulată.", fn: () => { setState((s) => ({ ...s, [col]: s[col].filter((i) => !selectedIds.includes(i.id)) })); logAct(`Bulk delete: ${selectedIds.length} ${col}`); setSelectedIds([]); setConfirmAction(null); toast(`${selectedIds.length} elemente șterse.`); } }); };
  const bulkTag = (col, tag) => { if (!selectedIds.length) return; setState((s) => ({ ...s, [col]: s[col].map((c) => selectedIds.includes(c.id) ? { ...c, tags: [...new Set([...(c.tags || []), tag])] } : c) })); logAct(`Bulk tag "${tag}": ${selectedIds.length}`); setSelectedIds([]); toast(`Tag "${tag}" adăugat la ${selectedIds.length} elemente.`); };

  // Pin client
  const togglePin = (id) => { setState((s) => ({ ...s, pinnedClients: (s.pinnedClients || []).includes(id) ? s.pinnedClients.filter((x) => x !== id) : [...(s.pinnedClients || []), id] })); };

  // Add note to client
  const addClientNote = (id, note) => { if (!note?.trim()) return; setState((s) => ({ ...s, clients: s.clients.map((c) => c.id === id ? { ...c, conversation: [note.trim(), ...(c.conversation || [])] } : c) })); logAct(`Notă: ${note.slice(0, 30)}`); toast("Notă adăugată."); };

  // Revenue forecast (simple linear projection)
  const revenueForecast = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => inDays(i - 6)).map((d) => state.invoices.filter((inv) => inv.createdAt === d && inv.status === "paid").reduce((s, inv) => s + Number(inv.amount || 0), 0));
    const avg = last7.reduce((a, b) => a + b, 0) / 7;
    return { daily: Math.round(avg), weekly: Math.round(avg * 7), monthly: Math.round(avg * 30), goalPct: state.revenueGoal ? Math.round((revenue / state.revenueGoal) * 100) : 0 };
  }, [state.invoices, state.revenueGoal, revenue]);

  // Set revenue goal
  const setRevenueGoal = (val) => setState((s) => ({ ...s, revenueGoal: Number(val) || 0 }));

  // Tag management
  const allTags = useMemo(() => { const set = new Set(); state.clients.forEach((c) => (c.tags || []).forEach((t) => set.add(t))); return [...set].sort(); }, [state.clients]);
  const addTagToClient = (clientId, tag) => { if (!tag) return; setState((s) => ({ ...s, clients: s.clients.map((c) => c.id === clientId ? { ...c, tags: [...new Set([...(c.tags || []), tag.toLowerCase()])] } : c) })); };
  const removeTagFromClient = (clientId, tag) => { setState((s) => ({ ...s, clients: s.clients.map((c) => c.id === clientId ? { ...c, tags: (c.tags || []).filter((t) => t !== tag) } : c) })); };

  const statusChip = (status) => {
    const cls = status === "confirmed" || status === "paid" || status === "published" || status === "completed" ? "green" : status === "pending" || status === "scheduled" || status === "unpaid" ? "yellow" : "gray";
    return <span className={`chip ${cls}`}>{status}</span>;
  };

  // Nav items
  const navItems = [
    { id: "dashboard", icon: "⌂", label: "Dashboard", badge: "Home" },
    { id: "clients", icon: "◉", label: "Clienți", badge: state.clients.length },
    { id: "pipeline", icon: "◬", label: "Pipeline", badge: state.deals.length },
    { id: "inbox", icon: "💬", label: "Inbox", badge: state.messages.filter((m) => m.status === "new").length || state.messages.length },
    { id: "bookings", icon: "▦", label: "Programări", badge: state.bookings.length },
    { id: "calendar", icon: "◫", label: "Calendar", badge: "7z" },
    { id: "content", icon: "✎", label: "Content", badge: state.posts.length },
    { id: "campaigns", icon: "🎯", label: "Campanii", badge: state.campaigns.length },
    { id: "offers", icon: "🧾", label: "Oferte", badge: state.offers.length },
    { id: "billing", icon: "⊡", label: "Facturare", badge: state.invoices.length },
    { id: "analytics", icon: "📊", label: "Analytics", badge: "Live" },
    { id: "team", icon: "👥", label: "Echipă", badge: state.staff.length },
    { id: "automation", icon: "⚡", label: "Automatizări", badge: "Live" },
    { id: "booking-public", icon: "◎", label: "Booking extern", badge: "Pub" },
    { id: "subscriptions", icon: "🔄", label: "Abonamente", badge: (state.subscriptions || []).filter(s => s.status === 'active').length },
    { id: "segments", icon: "🎯", label: "Segmente", badge: (state.segments || []).length },
    { id: "task-manager", icon: "☑", label: "Task Manager", badge: state.tasks.filter(t => t.lane !== 'done').length },
    { id: "settings", icon: "⚙", label: "Setări", badge: state.role },
    { id: "ai", icon: "🤖", label: "AI", badge: aiSuggestions.length },
  ];

  // Flow builder data
  const flowSteps = [
    { icon: "◉", label: "Client nou", active: state.clients.length > 0 },
    { icon: "📧", label: "Email automat", active: state.automations.find((a) => a.type === "new-client-task" && a.active) },
    { icon: "▦", label: "Booking creat", active: state.bookings.length > 0 },
    { icon: "🔔", label: "Reminder", active: state.automations.find((a) => a.type === "reminder" && a.active) },
    { icon: "⊡", label: "Factură", active: state.invoices.length > 0 },
    { icon: "⚡", label: "Follow-up", active: state.automations.find((a) => a.type === "followup" && a.active) },
  ];

  // Calendar data
  const calDays = useMemo(() => Array.from({ length: 7 }, (_, i) => inDays(i)), []);

  // Command palette filtered
  const cmdFiltered = useMemo(() => {
    const q = cmdkQuery.toLowerCase();
    return cmdGroups.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) })).filter((g) => g.items.length);
  }, [cmdkQuery]);

  // Client detail
  const detailData = useMemo(() => {
    if (!detailClient) return null;
    const c = state.clients.find((x) => x.id === detailClient);
    if (!c) return null;
    const bks = state.bookings.filter((b) => b.clientId === c.id);
    const invs = state.invoices.filter((i) => i.clientId === c.id);
    const score = clientScore(c, state.bookings);
    const timeline = [];
    timeline.push({ type: "tl-client", time: c.createdAt, text: `Client creat — ${(c.tags || []).join(", ")}` });
    bks.forEach((b) => { const sv = state.services.find((x) => x.id === b.serviceId); timeline.push({ type: "tl-booking", time: b.date, text: `Programare: ${sv?.name || "Serviciu"} la ${b.time} — ${b.status}` }); });
    invs.forEach((i) => timeline.push({ type: "tl-invoice", time: i.createdAt, text: `Factură: ${currency(i.amount)} — ${i.status}` }));
    const msgs = state.messages.filter((m) => m.clientId === c.id);
    msgs.forEach((m) => timeline.push({ type: "tl-auto", time: m.ts, text: `${m.channel} ${m.direction === "in" ? "primit" : "trimis"}: ${m.text.slice(0, 60)}` }));
    const dls = state.deals.filter((d) => d.clientId === c.id);
    dls.forEach((d) => timeline.push({ type: "tl-invoice", time: "", text: `Deal: ${d.title} — ${currency(d.value)} (${d.stage})` }));
    (c.conversation || []).forEach((m) => timeline.push({ type: m.startsWith("⚡") ? "tl-auto" : "tl-booking", time: "recent", text: m }));
    timeline.sort((a, b) => (b.time || "").localeCompare(a.time || ""));
    return { ...c, score, bks, invs, timeline, dealCount: dls.length, msgCount: msgs.length };
  }, [detailClient, state]);

  // ─── Modal helper ───
  const ModalWrap = ({ title, children }) => (
    <div className="modal-overlay" onClick={closeModal2} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button className="btn sm ghost" onClick={closeModal2} aria-label="Închide">✕</button></div>
        {children}
      </div>
    </div>
  );

  const FormField = ({ label, children, full }) => (
    <div className={`field${full ? " full" : ""}`}><span className="field-label">{label}</span>{children}</div>
  );

  // ═══ RENDER ═══
  return (
    <>
      <style>{CSS}</style>
      <div ref={rootRef} className={darkMode ? "" : "light-theme"}>
        {/* ═══ HERO ═══ */}
        {phase === "hero" && (
          <div className={`hero-screen${heroExiting ? " exit" : ""}`}>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              <div className="hero-orb hero-orb-1" /><div className="hero-orb hero-orb-2" /><div className="hero-orb hero-orb-3" />
            </div>
            <div className="hero-content">
              <div className="hero-logo-mark">A</div>
              <div className="hero-badge"><span className="pulse-dot" /> CRM · BOOKING · CONTENT · BILLING · AUTOMATIONS</div>
              <h1 className="hero-title">De la client nou la<br /><span className="gradient-text">factură plătită</span></h1>
              <p className="hero-sub">Gestionezi <strong>clienți, programări și bani</strong> dintr-un singur loc. Fără tab-uri separate, fără copy-paste.</p>
              <p className="hero-value"><span>↓ 3h/săpt</span> din automatizări · <span>↓ 40%</span> no-show · <span>↑ 25%</span> revenire</p>
              <div className="hero-actions">
                <button className="btn hero primary" onClick={startTour}>▶ Start demo ghidat</button>
                <button className="btn hero ghost" onClick={enterApp}>Intră direct →</button>
              </div>
              <p className="hero-keys"><kbd>Enter</kbd> demo rapid · <kbd>⌘K</kbd> command palette</p>
            </div>
          </div>
        )}

        {/* ═══ GUIDED TOUR ═══ */}
        {phase === "tour" && (
          <div className="tour-overlay">
            <div className="tour-backdrop" onClick={() => setPhase("app")} />
            <div className="tour-card">
              <div className="tour-dots">{tourSteps.map((_, i) => <div key={i} className={`tour-dot ${i < tourStep ? "done" : i === tourStep ? "active" : "pending"}`} />)}</div>
              {tourStep < tourSteps.length ? (
                <>
                  <div className="tour-icon" style={{ background: tourSteps[tourStep].bg, color: "var(--bg)", fontSize: 22 }}>{tourSteps[tourStep].icon}</div>
                  <div className="tour-step-num">{tourSteps[tourStep].num}</div>
                  <h3 className="tour-title">{tourSteps[tourStep].title}</h3>
                  <p className="tour-desc">{tourSteps[tourStep].desc}</p>
                  <button className="btn primary" onClick={tourAction} style={{ width: "100%", justifyContent: "center", padding: 12 }}>{tourSteps[tourStep].action}</button>
                  <button className="btn ghost sm" onClick={() => setPhase("app")} style={{ width: "100%", marginTop: 12, justifyContent: "center" }}>Sari peste tour →</button>
                </>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,var(--brand),var(--accent))", display: "grid", placeItems: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Gata! Sistemul e live.</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Ai creat un flux complet: client → programare → factură → automatizare.</p>
                  <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 20 }}>Poți explora dashboardul cu datele create sau poți reseta totul și începe de la zero.</p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button className="btn primary" onClick={() => setPhase("app")} style={{ flex: 1, justifyContent: "center", padding: 12 }}>Explorează dashboardul →</button>
                    <button className="btn ghost" onClick={() => { localStorage.removeItem("alpis-fusion-demo-state"); setState(createDemoState()); setPhase("app"); setView("dashboard"); toast("Resetat la zero. Date demo proaspete."); }} style={{ flex: 1, justifyContent: "center", padding: 12 }}>⟲ Reset la zero</button>
                  </div>
                </div>
              )}
              <div className="tour-progress"><div className="tour-progress-bar" style={{ width: `${(tourStep / tourSteps.length) * 100}%` }} /></div>
            </div>
          </div>
        )}

        {/* ═══ APP ═══ */}
        <div className={`app-shell${phase !== "app" ? " hidden" : ""}`}>
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-head">
              <div className="brand"><div className="logo-mark">A</div><div className="brand-text"><h1>ALPis Fusion</h1><p>Command Center</p></div></div>
            </div>
            <div className="nav-group">
              <div className="nav-label">Workspace</div>
              {navItems.map((n) => (
                <button key={n.id} className={`nav-btn${view === n.id ? " active" : ""}`} onClick={() => setView(n.id)}>
                  <span className="nav-icon">{n.icon}</span>{n.label}<span className="nav-badge">{n.badge}</span>
                </button>
              ))}
            </div>
            <div className="sidebar-foot">
              <div className="nav-label">Rol</div>
              <select className="select" value={state.role} onChange={(e) => changeRole(e.target.value)} style={{ width: "100%", fontSize: 11 }}>
                <option value="admin">admin</option><option value="staff">staff</option><option value="viewer">viewer</option>
              </select>
              <div style={{ marginTop: 10, fontSize: 9, color: "var(--muted)", fontFamily: "var(--mono)", lineHeight: 1.6 }}>
                <div>⌘K command palette</div>
                <div>D C B P F I — navigare</div>
                <div>N — acțiune rapidă</div>
                <div style={{ marginTop: 6, opacity: 0.5 }}>ALPis Fusion CRM v2.0 Premium</div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="content">
            <div className="topbar">
              <div className="top-left">
                <div className="search-box">
                  <span className="s-icon" style={{ fontSize: 14 }}>⌕</span>
                  <input placeholder="Caută client, programare, factură…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <span className="search-kbd" style={{ cursor: "pointer" }} onClick={() => setCmdkOpen(true)}>⌘K</span>
                </div>
                <span className="role-pill">Rol: <strong>{state.role}</strong></span>
              </div>
              <div className="top-right">
                <div className={`theme-toggle${!darkMode ? " on" : ""}`} onClick={() => setDarkMode((d) => !d)} />
                <div className="notif-btn" style={{ position: "relative" }}>
                  <button className="btn sm" onClick={() => setNotifOpen((o) => !o)} style={{ fontSize: 14, padding: "7px 9px" }}>🔔</button>
                  {notifications.length > 0 && <span className="notif-count">{notifications.length}</span>}
                  {notifOpen && (
                    <div className="notif-dropdown">
                      <div className="notif-dropdown-head"><span>Notificări</span><button className="btn sm ghost" onClick={() => setNotifOpen(false)} style={{ fontSize: 10 }}>Închide</button></div>
                      {notifications.map((n, i) => (
                        <div className="notif-item" key={i} style={{ cursor: "pointer" }} onClick={() => { setNotifOpen(false); if (n.icon === "▦") setView("bookings"); else if (n.icon === "⊡") setView("billing"); else if (n.icon === "🧾") setView("offers"); else if (n.icon === "💬") setView("inbox"); }}>
                          <span className="ni-icon" style={{ background: n.bg, color: n.color }}>{n.icon}</span>
                          <div><div dangerouslySetInnerHTML={{ __html: n.text }} /><div style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--muted)", marginTop: 3 }}>{n.time}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn ghost sm" onClick={() => { localStorage.setItem("alpis-fusion-demo-state", JSON.stringify(state)); setLastSaved(new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })); setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1500); toast("Salvat manual."); }}>💾 Salvează</button>
                <button className="btn ghost sm" onClick={resetDemo}>⟲ Reset</button>
                <button className="btn primary sm" onClick={() => setModal("quick")}>＋ Acțiune rapidă</button>
              </div>
            </div>

            {/* ─── DASHBOARD ─── */}
            {view === "dashboard" && (
              <div className="stack-y">
                <div className="section-head"><div className="between"><div><h2 className="section-title">Command Center</h2><p className="section-sub">Tot ce contează, într-un singur ecran</p></div><span className="status-live"><span className="pulse-dot" /> LIVE</span></div></div>
                <div className="info-banner"><div><div style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>Autosave activ {saveFlash && <span className="save-flash">✓ salvat</span>}</div><div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{lastSaved ? `Ultima salvare: ${lastSaved}` : "Se salvează automat la fiecare 30 secunde."}</div></div><button className="btn danger" onClick={resetDemo}>⟲ Reset complet</button></div>
                <div className="grid c4">
                  {[
                    { label: "Clienți", value: state.clients.length, sub: "cu scoring și timeline", spark: sparkClients, color: "var(--brand)" },
                    { label: "Programări", value: state.bookings.length, sub: `${state.bookings.filter((b) => b.date === todayISO()).length} azi`, spark: sparkBookings, color: "var(--accent)" },
                    { label: "Venituri", value: currency(revenue), sub: `${unpaidInv.length} neplătite`, spark: sparkRevenue, color: "var(--warm)" },
                    { label: "Revenire", value: `${retention}%`, sub: "clienți cu 2+ vizite", spark: [Math.max(0, retention - 10), retention, Math.min(100, retention + 5)], color: "var(--ok)" },
                  ].map((k, i) => (
                    <div className="kpi-card" key={i}>
                      <span className="kpi-label">{k.label}</span>
                      <div className="kpi-value">{k.value}</div>
                      <span className="kpi-sub">{k.sub}</span>
                      <Sparkline values={k.spark} color={k.color} />
                    </div>
                  ))}
                </div>
                <div className="grid c4">
                  <div className="card cc-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "linear-gradient(135deg,var(--brand),var(--accent))", color: "var(--bg)", fontSize: 16, fontWeight: 800, boxShadow: "0 4px 16px rgba(124,108,255,.3)" }}>⚡</div>
                      <div><div style={{ fontSize: 14, fontWeight: 700 }}>Acțiuni urgente</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Ce necesită atenție</div></div>
                    </div>
                    {(() => { const pb = state.bookings.filter((b) => b.status === "pending").length; const ui = unpaidInv.length; const nc = state.clients.filter((c) => c.tags?.includes("new")).length;
                      const actions = []; if (pb) actions.push([`${pb} programări pending`, "yellow"]); if (ui) actions.push([`${ui} facturi neplătite`, "red"]); if (nc) actions.push([`${nc} clienți noi`, "teal"]); if (!actions.length) actions.push(["Totul e la zi", "green"]);
                      return actions.map((a, i) => <div className="item" key={i}><div className="item-info"><h4>{a[0]}</h4></div><span className={`chip ${a[1]}`}>!</span></div>);
                    })()}
                  </div>
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--brand)" }} />Venituri 7 zile</div><MiniBarChart data={revenueByService} height={130} /></div>
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--accent)" }} />Programări/status</div><DonutChart data={bookingsByStatus} height={140} /></div>
                  <div className="card">
                    <div className="card-title"><span className="dot" style={{ background: "var(--ok)" }} />Client health</div>
                    {[["Sănătos", clientsWithHealth.filter(c => c.health >= 75).length, "var(--ok)"], ["Atenție", clientsWithHealth.filter(c => c.health >= 45 && c.health < 75).length, "var(--warm)"], ["Risc churn", clientsWithHealth.filter(c => c.health < 45).length, "var(--danger)"]].map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: s[2], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", flex: 1 }}>{s[0]}</span>
                        <strong style={{ fontSize: 13, fontFamily: "var(--mono)" }}>{s[1]}</strong>
                      </div>
                    ))}
                    {overdueTasks.length > 0 && <div style={{ marginTop: 8, fontSize: 10, color: "var(--danger)" }}>⏰ {overdueTasks.length} task-uri overdue</div>}
                    {expiringSubscriptions.length > 0 && <div style={{ marginTop: 4, fontSize: 10, color: "var(--warm)" }}>🔄 {expiringSubscriptions.length} abonamente expiră curând</div>}
                  </div>
                </div>
                <div className="grid c3">
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--info)" }} />Inbox & răspunsuri</div><div className="timeline-mini">{messageRows.slice(0, 3).map((m) => <div key={m.id} className="item"><div className="item-info"><h4>{m.clientName}</h4><p>{m.channel} · {m.text.slice(0, 52)}{m.text.length > 52 ? "…" : ""}</p></div><button className="btn sm" onClick={() => quickReplyMessage(m.clientId)}>Răspuns AI</button></div>)}</div></div>
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--warm)" }} />Pipeline</div><div className="timeline-mini">{dealsByStage.map((col) => <div key={col.stage} className="kv"><span style={{ textTransform: "capitalize" }}>{col.stage}</span><strong>{col.items.length}</strong></div>)}</div><button className="btn sm" style={{ marginTop: 10 }} onClick={() => setView("pipeline")}>Deschide pipeline</button></div>
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--accent)" }} />AI copilot</div>{aiSuggestions.slice(0, 3).map((item, i) => <div key={i} className="item"><div className="item-info"><h4>{item.icon} Sugestie</h4><p>{item.text}</p></div></div>)}<div className="row-actions" style={{ marginTop: 10, opacity: 1 }}><button className="btn sm" onClick={() => applyAiAction("followup")}>Follow-up</button><button className="btn sm" onClick={() => applyAiAction("campaign")}>Campanie</button></div></div>
                </div>
                <div className="impact-row">
                  <div className="impact-pill"><span style={{ color: "var(--ok)", fontWeight: 800 }}>↓</span><span style={{ fontFamily: "var(--mono)" }}>30%</span><span style={{ color: "var(--muted)" }}>no-shows</span></div>
                  <div className="impact-pill"><span style={{ color: "var(--ok)", fontWeight: 800 }}>↓</span><span style={{ fontFamily: "var(--mono)" }}>3h/săpt</span><span style={{ color: "var(--muted)" }}>economisit</span></div>
                  <div className="impact-pill"><span style={{ color: "var(--accent)", fontWeight: 800 }}>↑</span><span style={{ fontFamily: "var(--mono)" }}>{state.bookings.filter((b) => b.date === todayISO()).length}</span><span style={{ color: "var(--muted)" }}>programări azi</span></div>
                  <div className="impact-pill"><span style={{ color: "var(--accent)", fontWeight: 800 }}>↑</span><span style={{ fontFamily: "var(--mono)" }}>{currency(revenue)}</span><span style={{ color: "var(--muted)" }}>facturat</span></div>
                  <div className="impact-pill"><span style={{ color: "var(--brand-light)", fontWeight: 800 }}>◬</span><span style={{ fontFamily: "var(--mono)" }}>{currency(state.deals.reduce((s, d) => s + Number(d.value || 0), 0))}</span><span style={{ color: "var(--muted)" }}>pipeline</span></div>
                </div>
                <div className="grid c3">
                  <div className="card forecast-card">
                    <div className="card-title"><span className="dot" style={{ background: "var(--accent)" }} />Revenue forecast</div>
                    <div className="kv"><span>Media zilnică</span><strong>{currency(revenueForecast.daily)}</strong></div>
                    <div className="kv"><span>Proiecție lunară</span><strong>{currency(revenueForecast.monthly)}</strong></div>
                    <div className="kv" style={{ marginTop: 8 }}><span>Obiectiv</span><strong>{currency(state.revenueGoal)}</strong></div>
                    <div className="goal-bar"><div className="goal-fill" style={{ width: `${Math.min(revenueForecast.goalPct, 100)}%` }} /></div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)" }}><span>{revenueForecast.goalPct}%</span><span>din {currency(state.revenueGoal)}</span></div>
                  </div>
                  <div className="live-ticker">
                    <div className="lt-header"><span className="pulse-dot" /> Activitate live</div>
                    {liveEvents.slice(0, 5).map((ev) => (
                      <div className="lt-event" key={ev.id}>
                        <span className="lt-icon" style={{ background: ev.bg, color: ev.color }}>{ev.icon}</span>
                        <span><strong>{ev.text.split(" ")[0]}</strong> {ev.text.split(" ").slice(1).join(" ")}</span>
                        <span className="lt-ts">{ev.ts}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card ai-card">
                    <div className="ai-label"><span style={{ animation: "livePulse 2s ease-in-out infinite" }}>✦</span> Sugestii inteligente</div>
                    {aiSuggestions.map((s, i) => <div className="suggestion" key={i}><span>{s.icon}</span><span>{s.text}</span></div>)}
                  </div>
                  <div className="card">
                    <div className="card-title"><span className="dot" style={{ background: "var(--ok)" }} />Funnel conversie</div>
                    {[["Clienți", state.clients.length, "var(--brand)"], ["Programări", state.bookings.length, "var(--accent)"], ["Completate", state.bookings.filter((b) => b.status === "completed").length, "var(--warm)"], ["Plătite", state.invoices.filter((i) => i.status === "paid").length, "var(--ok)"]].map((s, i) => {
                      const pct = state.clients.length ? Math.round((s[1] / Math.max(state.clients.length, 1)) * 100) : 0;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--muted)", width: 70 }}>{s[0]}</span>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,.04)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.max(pct, 4)}%`, borderRadius: 3, background: s[2], transition: "width .8s cubic-bezier(.34,1.56,.64,1)" }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600, width: 28, textAlign: "right" }}>{s[1]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid c2">
                  <div className="card">
                    <div className="between" style={{ marginBottom: 10 }}><span className="card-title">Flux operațional</span><span className="chip gray">kanban</span></div>
                    <div className="task-input-row"><input className="input" placeholder="Task nou..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} style={{ fontSize: 11 }} /><button className="btn sm primary" onClick={() => addTask()}>＋</button></div>
                    <div className="kanban" style={{ marginTop: 10 }}>
                      {["todo", "doing", "done"].map((lane) => {
                        const names2 = { todo: "De făcut", doing: "În lucru", done: "Finalizat" };
                        const colors2 = { todo: "var(--warm)", doing: "var(--brand)", done: "var(--ok)" };
                        const nextLane = { todo: "doing", doing: "done", done: "todo" };
                        const tasks = state.tasks.filter((t) => t.lane === lane);
                        return (
                          <div className="lane" key={lane}>
                            <div className="lane-title"><span style={{ width: 5, height: 5, borderRadius: "50%", background: colors2[lane] }} />{names2[lane]}<span className="count">{tasks.length}</span></div>
                            {tasks.map((t) => <div className="task-card" key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{t.title}</span><div style={{ display: "flex", gap: 2, flexShrink: 0 }}><button style={{ fontSize: 10, cursor: "pointer", background: "none", border: "none", color: "var(--brand-light)" }} onClick={() => moveTask(t.id, nextLane[lane])} title="Mută">→</button><button style={{ fontSize: 10, cursor: "pointer", background: "none", border: "none", color: "var(--danger)" }} onClick={() => deleteTask(t.id)} title="Șterge">✕</button></div></div>)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="card">
                    <div className="between" style={{ marginBottom: 10 }}><span className="card-title">Clienți recenți</span><button className="btn sm ghost" onClick={() => setView("clients")}>CRM →</button></div>
                    {state.clients.slice(0, 5).map((c) => (
                      <div className="item" key={c.id} style={{ cursor: "pointer" }} onClick={() => setDetailClient(c.id)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={c.name} />
                          <div className="item-info"><h4>{c.name}</h4><p>{c.email || "—"}</p></div>
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>{(c.tags || []).slice(0, 2).map((t) => <span key={t} className="chip gray">{t}</span>)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── CLIENTS ─── */}
            {view === "clients" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">ClientFlow CRM</h2><p className="section-sub">Segmentare, scoring, timeline · {enrichedClients.length} clienți</p></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><select className="select" value={clientFilter} onChange={(e) => { setClientFilter(e.target.value); setClientPage(1); }} style={{ width: "auto", padding: "6px 10px", fontSize: 11 }}><option value="all">Toți</option><option value="vip">VIP</option><option value="new">Noi</option><option value="inactive">Inactivi</option><option value="premium">Premium</option><option value="returning">Returning</option></select><button className="btn sm" onClick={() => exportCSV("clients")}>CSV</button><button className="btn primary sm" onClick={() => setModal("client")}>＋ Client</button></div></div>
                {selectedIds.length > 0 && (
                  <div className="info-banner" style={{ background: "var(--brand-dim)", borderColor: "rgba(124,108,255,.2)" }}>
                    <div style={{ fontWeight: 600 }}>{selectedIds.length} selectat{selectedIds.length > 1 ? "e" : ""}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn sm" onClick={() => bulkTag("clients", "vip")}>Tag VIP</button>
                      <button className="btn sm" onClick={() => bulkTag("clients", "premium")}>Tag Premium</button>
                      <button className="btn sm danger" onClick={() => bulkDelete("clients")}>Șterge tot</button>
                      <button className="btn sm ghost" onClick={() => setSelectedIds([])}>Anulează</button>
                    </div>
                  </div>
                )}
                <div className="card">
                  {enrichedClients.length === 0 ? <div className="empty-state"><h3>Niciun client</h3><p>Adaugă primul client.</p><button className="btn primary sm" onClick={() => setModal("client")}>＋ Client</button></div> : (<>
                    <div className="table-wrap"><table><thead><tr><th style={{ width: 30 }}><input type="checkbox" checked={selectedIds.length === enrichedClients.length && enrichedClients.length > 0} onChange={() => selectAll(enrichedClients.map((c) => c.id))} /></th><th></th><th className="sortable-th" onClick={() => toggleSort("name")}>Nume {sortCol === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th><th>Contact</th><th>Tag-uri</th><th className="sortable-th" onClick={() => toggleSort("score")}>Scor {sortCol === "score" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th><th>Health</th><th>Sursă</th><th></th></tr></thead><tbody>
                      {sortedRows(enrichedClients, sortCol, sortDir).slice((clientPage - 1) * 10, clientPage * 10).map((c) => (
                        <tr key={c.id} onMouseEnter={(e) => { setHoverClient(c.id); setHoverPos({ x: Math.min(e.clientX + 16, window.innerWidth - 300), y: Math.min(e.clientY - 20, window.innerHeight - 200) }); }} onMouseLeave={() => setHoverClient(null)}>
                          <td><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                          <td style={{ width: 30 }}><button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: (state.pinnedClients || []).includes(c.id) ? "var(--warm)" : "var(--muted)", opacity: (state.pinnedClients || []).includes(c.id) ? 1 : 0.3 }} onClick={() => togglePin(c.id)} title="Pin">{(state.pinnedClients || []).includes(c.id) ? "★" : "☆"}</button></td>
                          <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={c.name} /><div><div style={{ fontWeight: 600 }}><Hl text={c.name} query={search} /></div><div style={{ fontSize: 10, color: "var(--muted)" }}>{c.createdAt}</div></div></div></td>
                          <td><div><Hl text={c.email || "—"} query={search} /></div><div style={{ fontSize: 10, color: "var(--muted)" }}>{c.phone}</div></td>
                          <td>{(c.tags || []).map((t) => <span key={t} className={`chip ${t === "vip" ? "yellow" : t === "new" ? "teal" : t === "premium" ? "blue" : "gray"}`} style={{ marginRight: 3 }}>{t}</span>)}</td>
                          <td><div className="score-badge"><div className="score-track"><div className="score-fill" style={{ width: `${c.score}%`, background: c.score >= 70 ? "var(--ok)" : c.score >= 40 ? "var(--warm)" : "var(--danger)" }} /></div><span className="score-num" style={{ color: c.score >= 70 ? "var(--ok)" : c.score >= 40 ? "var(--warm)" : "var(--danger)" }}>{c.score}</span></div></td>
                          <td>{(() => { const h = healthScore(c, state.bookings, state.invoices); return <span className={`chip ${healthChip(h)}`}>{healthLabel(h)}</span>; })()}</td>
                          <td><span className="chip gray" style={{ fontSize: 9 }}>{c.source || '—'}</span></td>
                          <td><div className="row-actions"><button className="btn sm ghost" onClick={() => setDetailClient(c.id)}>→</button><button className="btn sm ghost" onClick={() => startEditClient(c)}>✎</button><button className="btn sm danger" onClick={() => deleteItem("clients", c.id)}>✕</button></div></td>
                        </tr>
                      ))}
                    </tbody></table></div>
                    {enrichedClients.length > 10 && (
                      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12, alignItems: "center" }}>
                        <button className="btn sm ghost" disabled={clientPage <= 1} onClick={() => setClientPage((p) => p - 1)}>← Anterior</button>
                        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)" }}>{clientPage} / {Math.ceil(enrichedClients.length / 10)}</span>
                        <button className="btn sm ghost" disabled={clientPage >= Math.ceil(enrichedClients.length / 10)} onClick={() => setClientPage((p) => p + 1)}>Următor →</button>
                      </div>
                    )}
                  </>)}
                </div>
              </div>
            )}

            {/* ─── PIPELINE ─── */}
            {view === "pipeline" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Sales Pipeline</h2><p className="section-sub">Lead → contact → ofertă → won/lost</p></div><button className="btn primary sm" onClick={() => setModal("deal")}>＋ Deal</button></div>
                {state.deals.length === 0 ? <div className="empty-state"><h3>Pipeline gol</h3><p>Adaugă primul deal pentru a vedea funnel-ul de vânzări.</p><button className="btn primary sm" onClick={() => setModal("deal")}>＋ Primul deal</button></div> : (
                <div className="board-grid">
                  {dealsByStage.map((col) => (
                    <div key={col.stage} className="board-col">
                      <div className="board-head"><span style={{ textTransform: "capitalize" }}>{col.stage}</span><span className="chip gray">{col.items.length}</span></div>
                      {col.items.map((deal) => {
                        const client = state.clients.find((c) => c.id === deal.clientId);
                        const owner = state.staff.find((m) => m.id === deal.ownerId);
                        return (
                          <div className="deal-card" key={deal.id}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{deal.title}</div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{client?.name || "Client"} · owner {owner?.name || "-"}</div>
                            <div className="kv"><span>Valoare</span><strong>{currency(deal.value)}</strong></div>
                            <div className="row-actions" style={{ marginTop: 10, opacity: 1 }}>
                              <button className="btn sm" onClick={() => moveDeal(deal.id, -1)}>←</button>
                              <button className="btn sm" onClick={() => moveDeal(deal.id, 1)}>→</button>
                              <button className="btn sm" onClick={() => startEditDeal(deal)}>✎</button>
                              <button className="btn sm" onClick={() => createOfferFromDeal(deal)}>Ofertă</button>
                              <button className="btn sm danger" onClick={() => deleteItem("deals", deal.id)}>✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>)}
              </div>
            )}

            {/* ─── INBOX ─── */}
            {view === "inbox" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Inbox unificat</h2><p className="section-sub">WhatsApp + email într-o singură listă</p></div><button className="btn primary sm" onClick={() => quickReplyMessage(state.clients[0]?.id)}>Trimite follow-up AI</button></div>
                {messageRows.length === 0 ? <div className="empty-state"><h3>Inbox gol</h3><p>Nu există mesaje încă. Trimite un follow-up AI pentru a începe o conversație.</p></div> : (
                <div className="grid c2">
                  {messageRows.map((msg) => (
                    <div className="message-card" key={msg.id}>
                      <div className="between"><div style={{ fontWeight: 700 }}>{msg.clientName}</div>{statusChip(msg.status)}</div>
                      <div className="msg-meta"><span className="chip gray">{msg.channel}</span><span className="chip gray">{msg.direction === "in" ? "client" : "echipă"}</span><span className="chip gray">{msg.ts}</span></div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{msg.text}</div>
                      <div className="row-actions" style={{ marginTop: 10, opacity: 1 }}><button className="btn sm" onClick={() => quickReplyMessage(msg.clientId)}>Răspuns AI</button><button className="btn sm ghost" onClick={() => setDetailClient(msg.clientId)}>Vezi client</button><button className="btn sm danger" onClick={() => deleteItem("messages", msg.id)}>✕</button></div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* ─── BOOKINGS ─── */}
            {view === "bookings" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Programări & Servicii</h2><p className="section-sub">Servicii, echipă, sloturi</p></div><div style={{ display: "flex", gap: 8 }}><button className="btn sm" onClick={() => setModal("service")}>＋ Serviciu</button><button className="btn primary sm" onClick={() => setModal("booking")}>＋ Programare</button></div></div>
                <div className="grid c3">
                  <div className="card"><span className="card-title">Servicii</span>{state.services.map((sv) => <div className="item" key={sv.id}><div className="item-info"><h4>{sv.name}</h4><p>{sv.category} · {sv.duration}min</p></div><div style={{ display: "flex", alignItems: "center", gap: 4 }}><span className="chip teal">{currency(sv.price)}</span><div className="row-actions"><button className="btn sm ghost" onClick={() => startEditService(sv)}>✎</button></div></div></div>)}</div>
                  <div className="card"><span className="card-title">Echipă</span>{state.staff.map((m) => <div className="item" key={m.id}><div className="item-info"><h4>{m.name}</h4><p>{m.role}</p></div></div>)}</div>
                  <div className="card"><span className="card-title">Sloturi libere (7z)</span>{(() => { const slots = []; for (let i = 0; i < 7; i++) { const d = inDays(i); ["09:00","10:00","11:00","14:00","15:00","16:00"].forEach((t) => { if (!state.bookings.some((b) => b.date === d && b.time === t)) slots.push({ day: d, time: t }); }); } return slots.slice(0, 5).map((s, i) => <div className="item" key={i}><div className="item-info"><h4>{s.day}</h4><p>{s.time}</p></div><span className="chip green">free</span></div>); })()}</div>
                </div>
                <div className="card">
                  <div className="table-wrap"><table><thead><tr><th>Client</th><th>Serviciu</th><th>Angajat</th><th>Dată/Oră</th><th>Status</th><th></th></tr></thead><tbody>
                    {bookingRows.map((r) => (
                      <tr key={r.id}><td><div style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar name={r.clientName} size={24} />{r.clientName}</div></td><td>{r.serviceName}</td><td>{r.staffName}</td><td><span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{r.date} {r.time}</span>{hasConflict(r) && <span className="conflict-badge" style={{ marginLeft: 4 }}>⚠ conflict</span>}</td><td><button className={`chip ${r.status === "confirmed" ? "green" : r.status === "completed" ? "blue" : "yellow"}`} style={{ cursor: "pointer", border: "none", font: "inherit" }} onClick={() => toggleBookingStatus(r.id)} title="Click pentru a schimba statusul">{r.status}</button></td><td><div className="row-actions"><button className="btn sm ghost" onClick={() => createInvoiceFromBooking(r)} title="Facturează">⊡</button><button className="btn sm ghost" onClick={() => startEditBooking(r)}>✎</button><button className="btn sm danger" onClick={() => deleteItem("bookings", r.id)}>✕</button></div></td></tr>
                    ))}
                  </tbody></table></div>
                </div>
              </div>
            )}

            {/* ─── CALENDAR ─── */}
            {view === "calendar" && (
              <div className="stack-y">
                <div className="section-head"><h2 className="section-title">Calendar 7 zile</h2><p className="section-sub">Vizualizare rapidă săptămânală</p></div>
                <div className="card"><div className="cal-grid">
                  {calDays.map((day) => {
                    const dt = new Date(day); const bks = state.bookings.filter((b) => b.date === day);
                    return (
                      <div className="cal-day" key={day}>
                        <div className="cal-day-head"><span>{dayNames[dt.getDay()]}</span><span className="day-num">{dt.getDate()}</span></div>
                        {bks.length ? bks.map((b) => { const c = state.clients.find((x) => x.id === b.clientId); return <div className="cal-slot" key={b.id}>{b.time} · {c?.name || "?"}</div>; }) : <p style={{ fontSize: 9, color: "var(--muted)", marginTop: 6 }}>Liber</p>}
                      </div>
                    );
                  })}
                </div></div>
              </div>
            )}

            {/* ─── CONTENT ─── */}
            {view === "content" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Content Studio</h2><p className="section-sub">Editor, preview, calendar editorial</p></div><button className="btn primary sm" onClick={() => setModal("post")}>＋ Postare</button></div>
                {state.posts.length === 0 ? <div className="empty-state"><h3>Nicio postare</h3><p>Creează prima postare pentru calendarul editorial.</p><button className="btn primary sm" onClick={() => setModal("post")}>＋ Prima postare</button></div> : (
                <div className="grid c2">
                  {state.posts.map((p) => (
                    <div className="card" key={p.id}>
                      <div className="between" style={{ marginBottom: 8 }}><h4 style={{ fontSize: 14, fontWeight: 700 }}>{p.title}</h4>{statusChip(p.status)}</div>
                      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{p.category}</p>
                      {p.tags?.length > 0 && <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>{p.tags.map((t) => <span key={t} className="chip gray">{t}</span>)}</div>}
                      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{(p.body || "").slice(0, 80)}{p.body?.length > 80 ? "…" : ""}</p>
                      <div className="row-actions" style={{ marginTop: 10, opacity: 1 }}><button className="btn sm ghost" onClick={() => startEditPost(p)}>✎ Editează</button><button className="btn sm danger" onClick={() => deleteItem("posts", p.id)}>✕ Șterge</button></div>
                    </div>
                  ))}
                </div>)}
              </div>
            )}

            {/* ─── CAMPAIGNS ─── */}
            {view === "campaigns" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Campaign Builder</h2><p className="section-sub">Segmente, reach și conversii</p></div><button className="btn primary sm" onClick={() => applyAiAction("campaign")}>＋ Campanie AI</button></div>
                {state.campaigns.length === 0 ? <div className="empty-state"><h3>Nicio campanie</h3><p>Creează prima campanie cu AI pentru a targeta segmentele de clienți.</p><button className="btn primary sm" onClick={() => applyAiAction("campaign")}>＋ Prima campanie</button></div> : (<>
                <div className="metric-row">
                  <div className="card"><span className="card-title">Reach total</span><div style={{ fontSize: 24, fontWeight: 800 }}>{campaignStats.reach}</div></div>
                  <div className="card"><span className="card-title">Conversii</span><div style={{ fontSize: 24, fontWeight: 800 }}>{campaignStats.conversions}</div></div>
                  <div className="card"><span className="card-title">Campanii active</span><div style={{ fontSize: 24, fontWeight: 800 }}>{state.campaigns.filter((c) => c.status === "running").length}</div></div>
                  <div className="card"><span className="card-title">Segment top</span><div style={{ fontSize: 20, fontWeight: 800 }}>{clientsByTag[0]?.name || "—"}</div></div>
                </div>
                <div className="grid c2">
                  {state.campaigns.map((campaign) => (
                    <div className="campaign-card" key={campaign.id}>
                      <div className="between"><div style={{ fontWeight: 700 }}>{campaign.name}</div>{statusChip(campaign.status)}</div>
                      <div className="segment-pills"><span className="chip gray">{campaign.segment}</span><span className="chip gray">{campaign.channel}</span><span className="chip gray">{campaign.reach} reach</span></div>
                      <div className="kv" style={{ marginTop: 10 }}><span>Conversii</span><strong>{campaign.conversions}</strong></div>
                      <div className="row-actions" style={{ marginTop: 10, opacity: 1 }}><button className="btn sm" onClick={() => launchCampaign(campaign.id)}>{campaign.status === "running" ? "Pauză" : "Lansează"}</button><button className="btn sm danger" onClick={() => deleteItem("campaigns", campaign.id)}>✕</button></div>
                    </div>
                  ))}
                </div></>)}
              </div>
            )}

            {/* ─── OFFERS ─── */}
            {view === "offers" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Quotes & Offers</h2><p className="section-sub">Draft, trimise, acceptate</p></div><button className="btn primary sm" onClick={() => applyAiAction("offer")}>＋ Generează ofertă</button></div>
                {state.offers.length === 0 ? <div className="empty-state"><h3>Nicio ofertă</h3><p>Generează prima ofertă din pipeline sau cu AI.</p></div> : (
                <div className="grid c2">
                  {state.offers.map((offer) => {
                    const client = state.clients.find((c) => c.id === offer.clientId);
                    return (
                      <div className="offer-card" key={offer.id}>
                        <div className="between"><div style={{ fontWeight: 700 }}>{offer.title}</div>{statusChip(offer.status)}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "8px 0" }}>{client?.name || "Client"} · scadentă {offer.dueDate}</div>
                        <div className="kv"><span>Valoare</span><strong>{currency(offer.amount)}</strong></div>
                        <div className="row-actions" style={{ marginTop: 10, opacity: 1 }}><button className="btn sm" onClick={() => toggleOfferStatus(offer.id)}>{offer.status === "accepted" ? "Marchează trimisă" : "Acceptă"}</button><button className="btn sm ghost" onClick={() => setDetailClient(offer.clientId)}>Client</button><button className="btn sm danger" onClick={() => deleteItem("offers", offer.id)}>✕</button></div>
                      </div>
                    );
                  })}
                </div>)}
              </div>
            )}

            {/* ─── ANALYTICS ─── */}
            {view === "analytics" && (
              <div className="stack-y">
                <div className="section-head"><h2 className="section-title">Analytics</h2><p className="section-sub">Revenue, LTV, retenție și segmente</p></div>
                <div className="metric-row">
                  <div className="card"><span className="card-title">Venit total</span><div style={{ fontSize: 24, fontWeight: 800 }}>{currency(revenue)}</div></div>
                  <div className="card"><span className="card-title">LTV mediu</span><div style={{ fontSize: 24, fontWeight: 800 }}>{currency(ltv)}</div></div>
                  <div className="card"><span className="card-title">Retenție</span><div style={{ fontSize: 24, fontWeight: 800 }}>{retention}%</div></div>
                  <div className="card"><span className="card-title">Win rate</span><div style={{ fontSize: 24, fontWeight: 800 }}>{Math.round(((state.deals.filter((d) => d.stage === "won").length) / Math.max(1, state.deals.filter((d) => d.stage === "won" || d.stage === "lost").length)) * 100)}%</div></div>
                </div>
                <div className="metric-row">
                  <div className="card"><span className="card-title">No-show rate</span><div style={{ fontSize: 24, fontWeight: 800 }}>{noShowRate}%</div></div>
                  <div className="card"><span className="card-title">Collection rate</span><div style={{ fontSize: 24, fontWeight: 800, color: "var(--ok)" }}>{invoiceCollectionRate}%</div></div>
                  <div className="card"><span className="card-title">Avg sales cycle</span><div style={{ fontSize: 24, fontWeight: 800 }}>{avgSalesCycle}z</div></div>
                  <div className="card"><span className="card-title">MRR abonamente</span><div style={{ fontSize: 24, fontWeight: 800 }}>{currency(subscriptionMRR)}</div></div>
                </div>
                <div className="grid c3">
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--brand)" }} />Venit / serviciu</div><MiniBarChart data={revenueByService} height={160} /></div>
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--accent)" }} />Tag-uri clienți</div><DonutChart data={clientsByTag} height={160} /></div>
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--warm)" }} />Pipeline</div><DonutChart data={dealsByStage.map((d) => ({ name: d.stage, value: d.items.length }))} height={160} /></div>
                </div>
                <div className="grid c3">
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--info)" }} />Lead source</div><MiniBarChart data={sourceStats.slice(0, 6)} height={140} /></div>
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--ok)" }} />Revenue / sursă</div><MiniBarChart data={revenueBySource.slice(0, 6)} height={140} /></div>
                  <div className="card"><div className="card-title"><span className="dot" style={{ background: "var(--brand)" }} />Conversie / stage</div>
                    {conversionByStage.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--muted)", width: 60, textTransform: "capitalize" }}>{s.stage}</span>
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,.04)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.max(s.pct, 3)}%`, borderRadius: 3, background: "var(--brand)", transition: "width .5s" }} />
                        </div>
                        <span style={{ fontSize: 10, fontFamily: "var(--mono)", fontWeight: 600, width: 30, textAlign: "right" }}>{s.pct}%</span>
                      </div>
                    ))}
                    <div className="kv" style={{ marginTop: 8 }}><span>Top serviciu profit</span><strong style={{ fontSize: 11 }}>{topServiceByProfit}</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TEAM ─── */}
            {view === "team" && (
              <div className="stack-y">
                <div className="section-head"><h2 className="section-title">Team Performance</h2><p className="section-sub">Productivitate, conversii și venit</p></div>
                <div className="grid c3">
                  {staffPerformance.map((member) => (
                    <div className="staff-card" key={member.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><Avatar name={member.name} size={34} /><div><div style={{ fontWeight: 700 }}>{member.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{member.role}</div></div></div>
                      <div className="kv"><span>Programări</span><strong>{member.bookings}</strong></div>
                      <div className="kv"><span>Finalizate</span><strong>{member.completed}</strong></div>
                      <div className="kv"><span>Conversie</span><strong>{member.conversion}%</strong></div>
                      <div className="kv"><span>Venit</span><strong>{currency(member.revenue)}</strong></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── AI ─── */}
            {view === "ai" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">AI Assistant</h2><p className="section-sub">Follow-up, ofertă, campanie și scheduling</p></div><div className="module-toolbar"><button className="btn sm" onClick={() => applyAiAction("followup")}>Follow-up</button><button className="btn sm" onClick={() => applyAiAction("offer")}>Ofertă</button><button className="btn sm" onClick={() => applyAiAction("campaign")}>Campanie</button></div></div>
                <div className="grid c2">
                  <div className="card">
                    <div className="card-title"><span className="dot" style={{ background: "var(--brand)" }} />Sugestii AI</div>
                    {aiSuggestions.map((item, i) => <div key={i} className="ai-card"><div style={{ fontWeight: 700, marginBottom: 4 }}>{item.icon} Sugestie</div><div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.text}</div></div>)}
                  </div>
                  <div className="card">
                    <div className="card-title"><span className="dot" style={{ background: "var(--accent)" }} />Smart scheduling</div>
                    {suggestedSlots.map((slot, i) => <div key={i} className="item"><div className="item-info"><h4>{slot.day} · {slot.time}</h4><p>{slot.staffName} · recomandat pentru {slot.clientName}</p></div><button className="btn sm" onClick={() => bookSuggestedSlot(slot)}>Book</button></div>)}
                  </div>
                </div>
              </div>
            )}

            {/* ─── BILLING ─── */}
            {view === "billing" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Facturare</h2><p className="section-sub">Generare, status, export</p></div><div style={{ display: "flex", gap: 8 }}><button className="btn sm" onClick={() => exportCSV("invoices")}>CSV</button><button className="btn sm" onClick={() => exportJSON("invoices")}>JSON</button><button className="btn primary sm" onClick={createInvoice}>＋ Factură</button></div></div>
                <div className="grid c3">
                  <div className="card"><span className="card-title">Plătite</span><div style={{ fontSize: 24, fontWeight: 800 }}>{state.invoices.filter((i) => i.status === "paid").length}</div><p style={{ fontSize: 11, color: "var(--muted)" }}>{currency(state.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0))}</p></div>
                  <div className="card"><span className="card-title">Neplătite</span><div style={{ fontSize: 24, fontWeight: 800, color: "var(--warm)" }}>{unpaidInv.length}</div><p style={{ fontSize: 11, color: "var(--muted)" }}>{currency(unpaidInv.reduce((s, i) => s + Number(i.amount || 0), 0))}</p></div>
                  <div className="card"><span className="card-title">Total</span><div style={{ fontSize: 24, fontWeight: 800 }}>{currency(revenue)}</div></div>
                </div>
                {invoiceRows.length === 0 ? <div className="empty-state"><h3>Nicio factură</h3><p>Generează prima factură din programări sau pipeline.</p><button className="btn primary sm" onClick={createInvoice}>＋ Prima factură</button></div> : <div className="card"><div className="table-wrap"><table><thead><tr><th>ID</th><th>Client</th><th>Sumă</th><th>Status</th><th>Data</th><th></th></tr></thead><tbody>
                  {invoiceRows.map((r) => (
                    <tr key={r.id}><td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>#{r.id.slice(0, 6)}</td><td>{r.clientName}</td><td style={{ fontWeight: 700 }}>{currency(r.amount)}</td><td><button className={`chip ${r.status === "paid" ? "green" : "yellow"}`} style={{ cursor: "pointer", border: "none", font: "inherit" }} onClick={() => toggleInvoice(r.id)}>{r.status === "paid" ? "✓ plătit" : "○ neplătit"}</button></td><td style={{ color: "var(--muted)" }}>{r.createdAt}</td><td><div className="row-actions"><button className="btn sm ghost" onClick={() => printInvoice(r)} title="Print PDF">🖨</button><button className="btn sm danger" onClick={() => deleteItem("invoices", r.id)}>✕</button></div></td></tr>
                  ))}
                </tbody></table></div></div>}
              </div>
            )}

            {/* ─── AUTOMATION ─── */}
            {view === "automation" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Automatizări</h2><p className="section-sub">No-code flows — economisești 3h/săptămână</p></div><button className="btn success sm" onClick={runAutomations}>⚡ Rulează acum</button></div>
                <div className="card">
                  <span className="card-title"><span className="dot" style={{ background: "var(--accent)" }} />Flow builder — Booking reminder</span>
                  <div className="flow-builder">{flowSteps.map((s, i) => <React.Fragment key={i}>{i > 0 && <span className="flow-arrow">→</span>}<div className={`flow-node${s.active ? " active" : ""}`}><span className="fn-icon">{s.icon}</span><span className="fn-label">{s.label}</span></div></React.Fragment>)}</div>
                  <div className="flow-stage-list">
                    <div className="flow-stage-item"><strong>IF</strong><span>booking created</span><span className="chip blue">trigger</span></div>
                    <div className="flow-stage-item"><strong>WAIT</strong><span>1 zi</span><span className="chip gray">delay</span></div>
                    <div className="flow-stage-item"><strong>SEND</strong><span>WhatsApp reminder</span><span className="chip teal">action</span></div>
                    <div className="flow-stage-item"><strong>IF NOT</strong><span>client răspunde în 2h</span><span className="chip yellow">condition</span></div>
                    <div className="flow-stage-item"><strong>CREATE</strong><span>task follow-up manual</span><span className="chip yellow">fallback</span></div>
                  </div>
                </div>
                <div className="card">
                  <span className="card-title"><span className="dot" style={{ background: "var(--brand)" }} />Flow — Client inactiv winback</span>
                  <div className="flow-stage-list">
                    <div className="flow-stage-item"><strong>IF</strong><span>client.lastVisit &gt; 30 zile</span><span className="chip blue">trigger</span></div>
                    <div className="flow-stage-item"><strong>TAG</strong><span>adaugă "inactive"</span><span className="chip gray">action</span></div>
                    <div className="flow-stage-item"><strong>SEND</strong><span>email ofertă revenire (-15%)</span><span className="chip teal">action</span></div>
                    <div className="flow-stage-item"><strong>WAIT</strong><span>3 zile</span><span className="chip gray">delay</span></div>
                    <div className="flow-stage-item"><strong>IF NOT</strong><span>booking creat</span><span className="chip yellow">condition</span></div>
                    <div className="flow-stage-item"><strong>SEND</strong><span>WhatsApp follow-up</span><span className="chip teal">action</span></div>
                  </div>
                </div>
                <div className="card">
                  <span className="card-title"><span className="dot" style={{ background: "var(--warm)" }} />Flow — Post-vizită satisfaction</span>
                  <div className="flow-stage-list">
                    <div className="flow-stage-item"><strong>IF</strong><span>booking.status = completed</span><span className="chip blue">trigger</span></div>
                    <div className="flow-stage-item"><strong>WAIT</strong><span>2 ore</span><span className="chip gray">delay</span></div>
                    <div className="flow-stage-item"><strong>SEND</strong><span>email "Cum a fost experiența?"</span><span className="chip teal">action</span></div>
                    <div className="flow-stage-item"><strong>IF</strong><span>rating ≥ 4</span><span className="chip yellow">condition</span></div>
                    <div className="flow-stage-item"><strong>TAG</strong><span>adaugă "returning"</span><span className="chip green">action</span></div>
                  </div>
                </div>
                <div className="grid c2">
                  <div className="card"><span className="card-title">Reguli active</span>{state.automations.map((a) => <div className="item" key={a.id}><div className="item-info"><h4>{a.name}</h4><p>{a.type}</p></div><button className={`chip ${a.active ? "green" : "gray"}`} style={{ cursor: "pointer", border: "none", font: "inherit" }} onClick={() => toggleAutomation(a.id)}>{a.active ? "● on" : "○ off"}</button></div>)}
                    <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>Automatizări active: {state.automations.filter((a) => a.active).length} / {state.automations.length}</div>
                  </div>
                  <div className="card"><span className="card-title">Execuții recente</span>
                    {(state.activityLog || []).filter((l) => l.action.toLowerCase().includes("automat") || l.action.toLowerCase().includes("reminder") || l.action.toLowerCase().includes("follow")).slice(0, 5).map((l) => <div className="item" key={l.id}><div className="item-info"><h4>{l.action}</h4><p>{l.ts}</p></div></div>)}
                    {!(state.activityLog || []).some((l) => l.action.toLowerCase().includes("automat")) && <div style={{ fontSize: 11, color: "var(--muted)", padding: 12 }}>Nicio execuție încă. Apasă "Rulează acum".</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ─── BOOKING PUBLIC ─── */}
            {view === "booking-public" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Booking extern</h2><p className="section-sub">Link public pentru rezervări self-service 24/7</p></div><span className="chip blue">/book/{state.staff[0]?.name?.split(" ")[0]?.toLowerCase() || "demo"}</span></div>
                <div className="grid c2">
                  <div className="card">
                    <span className="card-title">Rezervare publică</span>
                    <div className="form-grid" style={{ marginTop: 6 }}>
                      <FormField label="Nume"><input className="input" id="pub-name" placeholder="Ana Popescu" /></FormField>
                      <FormField label="Email"><input className="input" id="pub-email" placeholder="ana@email.com" /></FormField>
                      <FormField label="Serviciu"><select className="select" id="pub-service">{state.services.map((s) => <option key={s.id} value={s.id}>{s.name} — {currency(s.price)}</option>)}</select></FormField>
                      <FormField label="Angajat"><select className="select" id="pub-staff">{state.staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></FormField>
                      <FormField label="Data"><input className="input" id="pub-date" type="date" defaultValue={todayISO()} /></FormField>
                      <FormField label="Ora"><select className="select" id="pub-time">{["09:00","10:00","11:00","12:00","14:00","15:00","16:00"].map((h) => <option key={h} value={h}>{h}</option>)}</select></FormField>
                      <div className="full"><button className="btn primary" onClick={() => {
                        const n = document.getElementById("pub-name")?.value?.trim();
                        const em = document.getElementById("pub-email")?.value?.trim();
                        const sId = document.getElementById("pub-service")?.value;
                        const stId = document.getElementById("pub-staff")?.value;
                        const dt = document.getElementById("pub-date")?.value;
                        const tm = document.getElementById("pub-time")?.value;
                        if (!n || !em || !sId || !stId || !dt || !tm) return toast("Completează tot.", "error");
                        let cl = state.clients.find((c) => c.email.toLowerCase() === em.toLowerCase());
                        if (!cl) { cl = { id: uid(), name: n, email: em, phone: "", tags: ["new"], notes: "Lead booking public", createdAt: todayISO(), lastVisit: "", conversation: ["Booking extern"] }; setState((s) => ({ ...s, clients: [cl, ...s.clients] })); }
                        setState((s) => ({ ...s, bookings: [{ id: uid(), clientId: cl.id, serviceId: sId, staffId: stId, date: dt, time: tm, status: "confirmed", notes: "Booking extern" }, ...s.bookings] }));
                        toast("Rezervare creată: " + n);
                      }}>Confirmă rezervarea</button></div>
                    </div>
                  </div>
                  <div className="card">
                    <span className="card-title">Beneficii</span>
                    <div className="item"><div className="item-info"><h4>Self-service 24/7</h4><p>Clientul alege singur serviciul și slotul.</p></div><span className="chip teal">24/7</span></div>
                    <div className="item"><div className="item-info"><h4>Remindere automate</h4><p>Se declanșează automat după rezervare.</p></div><span className="chip blue">auto</span></div>
                    <div className="item"><div className="item-info"><h4>Lead capture</h4><p>Clientul ajunge direct în CRM cu tag „new".</p></div><span className="chip yellow">lead</span></div>
                  </div>
                </div>
              </div>
            )}


            {/* ─── TASK MANAGER ─── */}
            {view === "task-manager" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Task Manager</h2><p className="section-sub">Follow-up, owner, prioritate, deadline · {state.tasks.filter(t => t.lane !== 'done').length} active · {overdueTasks.length} overdue</p></div><button className="btn primary sm" onClick={() => setModal("task")}>＋ Task</button></div>
                {state.tasks.length === 0 ? <div className="empty-state"><h3>Niciun task</h3><p>Creează primul task pentru a urmări follow-up-uri și acțiuni.</p><button className="btn primary sm" onClick={() => setModal("task")}>＋ Primul task</button></div> : (<>
                {overdueTasks.length > 0 && (
                  <div className="info-banner" style={{ background: "var(--danger-dim)", borderColor: "rgba(255,82,102,.2)" }}>
                    <div style={{ fontWeight: 600, color: "var(--danger)" }}>⏰ {overdueTasks.length} task-uri overdue</div>
                    <div style={{ display: "flex", gap: 6 }}>{overdueTasks.slice(0, 3).map(t => <span key={t.id} className="chip red">{t.title.slice(0, 20)}</span>)}</div>
                  </div>
                )}
                <div className="kanban">
                  {["todo", "doing", "done"].map((lane) => {
                    const names2 = { todo: "De făcut", doing: "În lucru", done: "Finalizat" };
                    const colors2 = { todo: "var(--warm)", doing: "var(--brand)", done: "var(--ok)" };
                    const nextLane = { todo: "doing", doing: "done", done: "todo" };
                    const tasks = state.tasks.filter((t) => t.lane === lane);
                    return (
                      <div className="lane" key={lane}>
                        <div className="lane-title"><span style={{ width: 6, height: 6, borderRadius: "50%", background: colors2[lane] }} />{names2[lane]}<span className="count">{tasks.length}</span></div>
                        {tasks.map((t) => {
                          const isOverdue = t.lane !== 'done' && t.dueDate && t.dueDate < todayISO();
                          const owner = state.staff.find(s => s.id === t.ownerId);
                          const client = t.clientId ? state.clients.find(c => c.id === t.clientId) : null;
                          return (
                            <div className="task-card-enhanced" key={t.id} style={isOverdue ? { borderColor: "rgba(255,82,102,.3)" } : {}}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <span style={{ fontWeight: 600 }}>{t.title}</span>
                                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                  <button style={{ fontSize: 10, cursor: "pointer", background: "none", border: "none", color: "var(--brand-light)" }} onClick={() => moveTask(t.id, nextLane[lane])}>→</button>
                                  <button style={{ fontSize: 10, cursor: "pointer", background: "none", border: "none", color: "var(--danger)" }} onClick={() => deleteTask(t.id)}>✕</button>
                                </div>
                              </div>
                              <div className="task-meta">
                                <span className={`chip ${t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'yellow' : 'gray'}`}>{t.priority}</span>
                                {owner && <span className="chip gray">{owner.name.split(' ')[0]}</span>}
                                {client && <span className="chip blue">{client.name.split(' ')[0]}</span>}
                                {t.dueDate && <span className="chip gray">{t.dueDate}</span>}
                                {isOverdue && <span className="overdue-badge">OVERDUE</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div></>)}
              </div>
            )}

            {/* ─── SUBSCRIPTIONS ─── */}
            {view === "subscriptions" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Abonamente & Subscriptions</h2><p className="section-sub">Recurring revenue, reînnoiri, MRR: {currency(subscriptionMRR)}</p></div></div>
                {!(state.subscriptions || []).length ? <div className="empty-state"><h3>Niciun abonament</h3><p>Adaugă primul abonament recurent pentru a genera MRR.</p></div> : (<>
                <div className="metric-row">
                  <div className="card"><span className="card-title">MRR</span><div style={{ fontSize: 24, fontWeight: 800 }}>{currency(subscriptionMRR)}</div></div>
                  <div className="card"><span className="card-title">Active</span><div style={{ fontSize: 24, fontWeight: 800 }}>{(state.subscriptions || []).filter(s => s.status === 'active').length}</div></div>
                  <div className="card"><span className="card-title">Expirate</span><div style={{ fontSize: 24, fontWeight: 800, color: "var(--danger)" }}>{(state.subscriptions || []).filter(s => s.status === 'expired').length}</div></div>
                  <div className="card"><span className="card-title">Expiră în 7z</span><div style={{ fontSize: 24, fontWeight: 800, color: "var(--warm)" }}>{expiringSubscriptions.length}</div></div>
                </div>
                <div className="grid c2">
                  {(state.subscriptions || []).map((sub) => {
                    const client = state.clients.find(c => c.id === sub.clientId);
                    const isExpiring = sub.status === 'active' && sub.nextRenewal <= inDays(7);
                    return (
                      <div className="sub-card card" key={sub.id} style={isExpiring ? { borderColor: "rgba(255,140,66,.3)" } : {}}>
                        <div className="between"><div style={{ fontWeight: 700 }}>{sub.name}</div>{statusChip(sub.status)}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "8px 0" }}>{client?.name || "Client"} · {sub.interval}</div>
                        <div className="kv"><span>Valoare</span><strong>{currency(sub.amount)}</strong></div>
                        <div className="kv"><span>Următoarea reînnoire</span><strong style={{ color: isExpiring ? "var(--warm)" : "var(--text)" }}>{sub.nextRenewal}</strong></div>
                        {isExpiring && <div style={{ marginTop: 6, fontSize: 10, color: "var(--warm)", fontWeight: 600 }}>⚠ Expiră curând — reînnoiește</div>}
                        <div className="row-actions" style={{ marginTop: 10, opacity: 1 }}>
                          <button className="btn sm" onClick={() => renewSubscription(sub.id)}>🔄 Reînnoiește</button>
                          <button className="btn sm" onClick={() => toggleSubscription(sub.id)}>{sub.status === 'active' ? 'Pauză' : 'Activează'}</button>
                          <button className="btn sm danger" onClick={() => deleteItem("subscriptions", sub.id)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div></>)}
              </div>
            )}

            {/* ─── SEGMENTS ─── */}
            {view === "segments" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Segment Builder</h2><p className="section-sub">Segmente salvate cu reguli avansate</p></div><button className="btn primary sm" onClick={() => setModal("segment")}>＋ Segment nou</button></div>
                {!(state.segments || []).length ? <div className="empty-state"><h3>Niciun segment</h3><p>Creează primul segment cu reguli de tip „VIP + fără booking 30 zile".</p><button className="btn primary sm" onClick={() => setModal("segment")}>＋ Primul segment</button></div> : (
                <div className="grid c2">
                  {(state.segments || []).map((seg) => {
                    const matched = matchSegment(seg);
                    return (
                      <div className="card" key={seg.id}>
                        <div className="between"><div style={{ fontWeight: 700 }}>{seg.name}</div><span className="chip blue">{matched.length} clienți</span></div>
                        <div style={{ marginTop: 8 }}>
                          {(seg.rules || []).map((r, i) => (
                            <div className="segment-rule" key={i}>
                              <span className="chip gray">{r.field}</span>
                              <span style={{ color: "var(--muted)" }}>{r.op}</span>
                              <span style={{ fontWeight: 600 }}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {matched.slice(0, 5).map(c => <span key={c.id} className="chip gray" style={{ marginRight: 3, marginBottom: 3 }}>{c.name}</span>)}
                          {matched.length > 5 && <span className="chip gray">+{matched.length - 5} alții</span>}
                        </div>
                        <div className="row-actions" style={{ marginTop: 10, opacity: 1 }}>
                          <button className="btn sm" onClick={() => { setState(s => ({ ...s, campaigns: [{ id: uid(), name: `Campanie — ${seg.name}`, segment: seg.name, channel: "Email", status: "draft", reach: matched.length, conversions: 0 }, ...s.campaigns] })); toast("Campanie creată din segment."); }}>📣 Campanie</button>
                          <button className="btn sm danger" onClick={() => deleteItem("segments", seg.id)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>)}
              </div>
            )}
            {/* ─── SETTINGS & AUDIT ─── */}
            {view === "settings" && (
              <div className="stack-y">
                <div className="section-head between"><div><h2 className="section-title">Setări & Audit</h2><p className="section-sub">Roluri, backup, exporturi, jurnal</p></div><div style={{ display: "flex", gap: 8 }}><button className="btn sm" onClick={backupAll}>⬇ Backup</button><label className="btn sm" style={{ cursor: "pointer" }}>⬆ Restore<input type="file" accept=".json" style={{ display: "none" }} onChange={restoreBackup} /></label></div></div>
                <div className="grid c3">
                  <div className="card">
                    <span className="card-title">Rol curent</span>
                    <select className="select" value={state.role} onChange={(e) => changeRole(e.target.value)} style={{ marginTop: 4 }}><option value="admin">admin</option><option value="staff">staff</option><option value="viewer">viewer</option></select>
                    <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>Admin = complet · Staff = operațional · Viewer = citire</p>
                  </div>
                  <div className="card">
                    <span className="card-title">Exporturi</span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      <button className="btn sm" onClick={() => exportJSON("all")}>All JSON</button>
                      <button className="btn sm" onClick={() => exportCSV("clients")}>CSV Clienți</button>
                      <button className="btn sm" onClick={() => exportCSV("bookings")}>CSV Prog.</button>
                      <button className="btn sm" onClick={() => exportCSV("invoices")}>CSV Facturi</button>
                    </div>
                  </div>
                  <div className="card">
                    <span className="card-title">Statistici sistem</span>
                    <div className="kv"><span>Clienți</span><strong>{state.clients.length}</strong></div>
                    <div className="kv"><span>Programări</span><strong>{state.bookings.length}</strong></div>
                    <div className="kv"><span>Facturi</span><strong>{state.invoices.length}</strong></div>
                    <div className="kv"><span>Deals</span><strong>{state.deals.length}</strong></div>
                    <div className="kv"><span>Mesaje</span><strong>{state.messages.length}</strong></div>
                    <div className="kv"><span>Tasks</span><strong>{state.tasks.length}</strong></div>
                  </div>
                </div>
                <div className="card">
                  <span className="card-title">Autosave</span>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{lastSaved ? `Ultima salvare: ${lastSaved}` : "Se salvează automat la fiecare 30 secunde."} {saveFlash && <span className="save-flash">✓</span>}</p>
                </div>
                <div className="card">
                  <span className="card-title">Activity log ({(state.activityLog || []).length})</span>
                  {(state.activityLog || []).slice(0, 15).map((l) => (
                    <div className="item" key={l.id}><div className="item-info"><h4 style={{ fontSize: 11 }}>{l.action}</h4><p>{l.ts}</p></div></div>
                  ))}
                  {!(state.activityLog || []).length && <div style={{ fontSize: 11, color: "var(--muted)", padding: 12 }}>Nicio activitate înregistrată.</div>}
                </div>
                <div className="card">
                  <div className="between" style={{ marginBottom: 12 }}><span className="card-title">Audit Trail Enterprise ({(state.auditTrail || []).length})</span><span className="chip blue">RBAC</span></div>
                  {(state.auditTrail || []).slice(0, 20).map((a) => (
                    <div className="audit-item" key={a.id}>
                      <span className="chip gray">{a.entity}</span>
                      <strong style={{ fontSize: 11 }}>{a.entityName}</strong>
                      <span className="audit-field">{a.field}</span>
                      <span className="audit-old">{a.oldValue}</span>
                      <span>→</span>
                      <span className="audit-new">{a.newValue}</span>
                      <span className="chip gray">{a.user}</span>
                      <span className="audit-ts">{a.ts}</span>
                    </div>
                  ))}
                  {!(state.auditTrail || []).length && <div style={{ fontSize: 11, color: "var(--muted)", padding: 12 }}>Nicio modificare înregistrată.</div>}
                </div>
                <div className="card">
                  <div className="between" style={{ marginBottom: 8 }}><span className="card-title">Import CSV</span></div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>Importă clienți sau bookings din fișiere CSV. Câmpuri acceptate: name, email, phone, tags, notes, source.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select className="select" value={csvTarget} onChange={(e) => setCsvTarget(e.target.value)} style={{ width: "auto", padding: "6px 10px", fontSize: 11 }}><option value="clients">Clienți</option><option value="bookings">Programări</option></select>
                    <label className="btn sm primary" style={{ cursor: "pointer" }}>📂 Alege CSV<input type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSVImport} /></label>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* ═══ MODALS ═══ */}
        {modal === "quick" && (
          <ModalWrap title="Acțiuni rapide">
            <div className="grid c2">
              <button className="btn primary" onClick={() => { closeModal2(); setTimeout(() => setModal("client"), 50); }}>＋ Client</button>
              <button className="btn primary" onClick={() => { closeModal2(); setTimeout(() => setModal("booking"), 50); }}>＋ Programare</button>
              <button className="btn primary" onClick={() => { closeModal2(); setTimeout(() => setModal("post"), 50); }}>＋ Postare</button>
              <button className="btn" onClick={() => { closeModal2(); createInvoice(); }}>＋ Factură</button>
              <button className="btn" onClick={() => { closeModal2(); runAutomations(); }}>⚡ Automatizări</button>
              <button className="btn" onClick={() => { closeModal2(); setView("pipeline"); }}>◬ Pipeline</button>
              <button className="btn" onClick={() => { closeModal2(); setView("inbox"); }}>💬 Inbox</button>
              <button className="btn" onClick={() => { closeModal2(); setView("calendar"); }}>◫ Calendar</button>
              <button className="btn" onClick={() => { closeModal2(); backupAll(); }}>⬇ Backup JSON</button>
              <button className="btn" onClick={() => { closeModal2(); exportCSV("clients"); }}>CSV Clienți</button>
              <button className="btn" onClick={() => { closeModal2(); exportCSV("bookings"); }}>CSV Programări</button>
              <label className="btn" style={{ cursor: "pointer" }}>⬆ Restore<input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => { closeModal2(); restoreBackup(e); }} /></label>
            </div>
          </ModalWrap>
        )}

        {(modal === "client" || modal === "edit-client") && (
          <ModalWrap title={editId ? "Editează client" : "Client nou"}>
            <div className="form-grid">
              <FormField label="Nume *"><input className="input" value={clientForm.name} onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} /></FormField>
              <FormField label="Email"><input className="input" type="email" value={clientForm.email} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} /></FormField>
              <FormField label="Telefon"><input className="input" value={clientForm.phone} onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))} /></FormField>
              <FormField label="Tag-uri"><input className="input" value={clientForm.tags} onChange={(e) => setClientForm((f) => ({ ...f, tags: e.target.value }))} placeholder="new, vip" /></FormField>
              <FormField label="Sursă"><select className="select" value={clientForm.source || "Organic"} onChange={(e) => setClientForm((f) => ({ ...f, source: e.target.value }))}>{leadSources.map(s => <option key={s} value={s}>{s}</option>)}</select></FormField>
              <FormField label="Notițe" full><textarea className="textarea" value={clientForm.notes} onChange={(e) => setClientForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
              <div className="full"><button className="btn primary" onClick={editId ? saveEditClient : addClient}>{editId ? "Actualizează" : "Salvează"}</button></div>
            </div>
          </ModalWrap>
        )}

        {(modal === "service" || modal === "edit-service") && (
          <ModalWrap title={editId ? "Editează serviciu" : "Serviciu nou"}>
            <div className="form-grid">
              <FormField label="Nume *"><input className="input" value={serviceForm.name} onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))} /></FormField>
              <FormField label="Categorie"><input className="input" value={serviceForm.category} onChange={(e) => setServiceForm((f) => ({ ...f, category: e.target.value }))} /></FormField>
              <FormField label="Preț (RON)"><input className="input" type="number" min="0" value={serviceForm.price} onChange={(e) => setServiceForm((f) => ({ ...f, price: e.target.value }))} /></FormField>
              <FormField label="Durată (min)"><input className="input" type="number" min="1" value={serviceForm.duration} onChange={(e) => setServiceForm((f) => ({ ...f, duration: e.target.value }))} /></FormField>
              <div className="full"><button className="btn primary" onClick={editId ? saveEditService : addService}>{editId ? "Actualizează" : "Salvează"}</button></div>
            </div>
          </ModalWrap>
        )}

        {(modal === "booking" || modal === "edit-booking") && (
          <ModalWrap title={editId ? "Editează programare" : "Programare nouă"}>
            <div className="form-grid">
              <FormField label="Client *"><select className="select" value={bookingForm.clientId} onChange={(e) => setBookingForm((f) => ({ ...f, clientId: e.target.value }))}><option value="">Selectează</option>{state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
              <FormField label="Serviciu *"><select className="select" value={bookingForm.serviceId} onChange={(e) => setBookingForm((f) => ({ ...f, serviceId: e.target.value }))}><option value="">Selectează</option>{state.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FormField>
              <FormField label="Angajat *"><select className="select" value={bookingForm.staffId} onChange={(e) => setBookingForm((f) => ({ ...f, staffId: e.target.value }))}><option value="">Selectează</option>{state.staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></FormField>
              <FormField label="Status"><select className="select" value={bookingForm.status} onChange={(e) => setBookingForm((f) => ({ ...f, status: e.target.value }))}><option value="confirmed">confirmed</option><option value="pending">pending</option><option value="completed">completed</option></select></FormField>
              <FormField label="Data"><input className="input" type="date" value={bookingForm.date} onChange={(e) => setBookingForm((f) => ({ ...f, date: e.target.value }))} /></FormField>
              <FormField label="Ora"><input className="input" type="time" value={bookingForm.time} onChange={(e) => setBookingForm((f) => ({ ...f, time: e.target.value }))} /></FormField>
              <FormField label="Notițe" full><textarea className="textarea" value={bookingForm.notes} onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
              <div className="full"><button className="btn primary" onClick={editId ? saveEditBooking : addBooking}>{editId ? "Actualizează" : "Salvează"}</button></div>
            </div>
          </ModalWrap>
        )}

        {(modal === "post" || modal === "edit-post") && (
          <ModalWrap title={editId ? "Editează postare" : "Postare nouă"}>
            <div className="form-grid">
              <FormField label="Titlu *"><input className="input" value={postForm.title} onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))} /></FormField>
              <FormField label="Categorie"><input className="input" value={postForm.category} onChange={(e) => setPostForm((f) => ({ ...f, category: e.target.value }))} /></FormField>
              <FormField label="Tag-uri"><input className="input" value={postForm.tags} onChange={(e) => setPostForm((f) => ({ ...f, tags: e.target.value }))} /></FormField>
              <FormField label="Status"><select className="select" value={postForm.status} onChange={(e) => setPostForm((f) => ({ ...f, status: e.target.value }))}><option value="draft">draft</option><option value="scheduled">scheduled</option><option value="published">published</option></select></FormField>
              <FormField label="Conținut" full><textarea className="textarea" value={postForm.body} onChange={(e) => setPostForm((f) => ({ ...f, body: e.target.value }))} /></FormField>
              <div className="full"><button className="btn primary" onClick={editId ? saveEditPost : addPost}>{editId ? "Actualizează" : "Salvează"}</button></div>
            </div>
          </ModalWrap>
        )}

        {(modal === "deal" || modal === "edit-deal") && (
          <ModalWrap title={editId ? "Editează deal" : "Deal nou"}>
            <div className="form-grid">
              <FormField label="Titlu *"><input className="input" value={dealForm.title} onChange={(e) => setDealForm((f) => ({ ...f, title: e.target.value }))} /></FormField>
              <FormField label="Client *"><select className="select" value={dealForm.clientId} onChange={(e) => setDealForm((f) => ({ ...f, clientId: e.target.value }))}><option value="">Selectează</option>{state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
              <FormField label="Valoare (RON)"><input className="input" type="number" min="0" value={dealForm.value} onChange={(e) => setDealForm((f) => ({ ...f, value: e.target.value }))} /></FormField>
              <FormField label="Etapă"><select className="select" value={dealForm.stage} onChange={(e) => setDealForm((f) => ({ ...f, stage: e.target.value }))}><option value="lead">Lead</option><option value="contacted">Contacted</option><option value="offer">Offer</option><option value="won">Won</option><option value="lost">Lost</option></select></FormField>
              <div className="full"><button className="btn primary" onClick={editId ? saveEditDeal : addDeal}>{editId ? "Actualizează" : "Salvează"}</button></div>
            </div>
          </ModalWrap>
        )}


        {modal === "task" && (
          <ModalWrap title="Task nou">
            <div className="form-grid">
              <FormField label="Titlu *"><input className="input" value={taskForm.title} onChange={(e) => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Follow-up client VIP" /></FormField>
              <FormField label="Prioritate"><select className="select" value={taskForm.priority} onChange={(e) => setTaskForm(f => ({ ...f, priority: e.target.value }))}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></FormField>
              <FormField label="Owner"><select className="select" value={taskForm.ownerId} onChange={(e) => setTaskForm(f => ({ ...f, ownerId: e.target.value }))}><option value="">— Alege —</option>{state.staff.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></FormField>
              <FormField label="Deadline"><input className="input" type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} /></FormField>
              <FormField label="Client (opțional)"><select className="select" value={taskForm.clientId} onChange={(e) => setTaskForm(f => ({ ...f, clientId: e.target.value }))}><option value="">— Niciun client —</option>{state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
              <div className="full"><button className="btn primary" onClick={addFullTask}>Creează task</button></div>
            </div>
          </ModalWrap>
        )}

        {modal === "segment" && (
          <ModalWrap title="Segment nou">
            <div className="form-grid">
              <FormField label="Nume segment *" full><input className="input" value={segmentForm.name} onChange={(e) => setSegmentForm(f => ({ ...f, name: e.target.value }))} placeholder="VIP fără booking 30z" /></FormField>
              <div className="full">
                <span className="field-label" style={{ marginBottom: 6, display: "block" }}>Reguli</span>
                {segmentForm.rules.map((r, i) => (
                  <div className="segment-rule" key={i}>
                    <select value={r.field} onChange={(e) => { const rules = [...segmentForm.rules]; rules[i].field = e.target.value; setSegmentForm(f => ({ ...f, rules })); }}>
                      <option value="tag">Tag</option><option value="daysSinceBooking">Zile fără booking</option><option value="unpaidInvoices">Facturi neplătite</option><option value="source">Sursă</option><option value="health">Health score</option>
                    </select>
                    <select value={r.op} onChange={(e) => { const rules = [...segmentForm.rules]; rules[i].op = e.target.value; setSegmentForm(f => ({ ...f, rules })); }}>
                      <option value="includes">include</option><option value=">">&gt;</option><option value="<">&lt;</option><option value="=">egal</option>
                    </select>
                    <input value={r.value} onChange={(e) => { const rules = [...segmentForm.rules]; rules[i].value = e.target.value; setSegmentForm(f => ({ ...f, rules })); }} placeholder="valoare" style={{ flex: 1 }} />
                    {segmentForm.rules.length > 1 && <button className="btn sm danger" onClick={() => setSegmentForm(f => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }))}>✕</button>}
                  </div>
                ))}
                <button className="btn sm" style={{ marginTop: 6 }} onClick={() => setSegmentForm(f => ({ ...f, rules: [...f.rules, { field: "tag", op: "includes", value: "" }] }))}>＋ Regulă</button>
              </div>
              {segmentForm.rules.some(r => r.value) && (
                <div className="full">
                  <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Preview: {matchSegment({ rules: segmentForm.rules.filter(r => r.value) }).length} clienți potriviți</p>
                  {matchSegment({ rules: segmentForm.rules.filter(r => r.value) }).slice(0, 4).map(c => <span key={c.id} className="chip gray" style={{ marginRight: 3 }}>{c.name}</span>)}
                </div>
              )}
              <div className="full"><button className="btn primary" onClick={addSegment}>Salvează segment</button></div>
            </div>
          </ModalWrap>
        )}

        {modal === "csv-import" && csvData && (
          <ModalWrap title={`Import CSV — ${csvTarget} (${csvData.length} rânduri)`}>
            <div className="csv-preview">
              <table>
                <thead><tr>{Object.keys(csvData[0] || {}).map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{csvData.slice(0, 10).map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{String(v).slice(0, 40)}</td>)}</tr>)}</tbody>
              </table>
            </div>
            {csvData.length > 10 && <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>... și {csvData.length - 10} rânduri suplimentare</p>}
            <div className="full" style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button className="btn primary" onClick={confirmCSVImport}>✓ Importă {csvData.length} {csvTarget}</button>
              <button className="btn ghost" onClick={() => { setCsvData(null); closeModal2(); }}>Anulează</button>
            </div>
          </ModalWrap>
        )}
        {/* ═══ COMMAND PALETTE ═══ */}
        {cmdkOpen && (
          <div className="cmdk-overlay" onClick={() => setCmdkOpen(false)}>
            <div className="cmdk-box" onClick={(e) => e.stopPropagation()}>
              <div className="cmdk-header"><span className="cmdk-prompt">❯</span><input value={cmdkQuery} onChange={(e) => setCmdkQuery(e.target.value)} placeholder="Ce vrei să faci?" autoFocus /></div>
              <div className="cmdk-results">
                {cmdFiltered.map((g) => (
                  <div key={g.group}>
                    <div className="cmdk-group-label">{g.group}</div>
                    {g.items.map((item) => (
                      <div key={item.label} className="cmdk-item" onClick={() => {
                        setCmdkOpen(false); setCmdkQuery("");
                        if (item.view) setView(item.view);
                        if (item.modal) setModal(item.modal);
                        if (item.action === "invoice") createInvoice();
                        if (item.action === "auto") runAutomations();
                      }}>
                        <span className="ci-icon">{item.icon}</span>{item.label}{item.key && <span className="ci-short">{item.key}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ CLIENT DETAIL PANEL ═══ */}
        {detailClient && detailData && (
          <>
            <div className="detail-backdrop" onClick={() => setDetailClient(null)} />
            <div className="detail-panel">
              <div className="between" style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800 }}>{detailData.name}</h2>
                <button className="btn sm ghost" onClick={() => setDetailClient(null)}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>{(detailData.tags || []).map((t) => <span key={t} className={`chip ${t === "vip" ? "yellow" : t === "new" ? "teal" : t === "premium" ? "blue" : "gray"}`}>{t}</span>)}</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <button className="btn sm" onClick={() => { setDetailClient(null); startEditClient(detailData); }}>✎ Editează</button>
                <button className="btn sm danger" onClick={() => { setDetailClient(null); deleteItem("clients", detailData.id); }}>✕ Șterge</button>
              </div>
              <div className="item"><div className="item-info"><h4>Scor client</h4><p>{detailData.score}/100</p></div><span className={`chip ${detailData.score > 70 ? "green" : detailData.score > 40 ? "yellow" : "red"}`}>{detailData.score > 70 ? "Hot" : detailData.score > 40 ? "Warm" : "Cold"}</span></div>
              {(() => { const h = healthScore(detailData, state.bookings, state.invoices); return (
                <div className="item"><div className="item-info"><h4>Health score</h4><p>{healthLabel(h)} — {h}/100</p></div><div className="health-bar"><div className="health-fill" style={{ width: `${h}%`, background: healthColor(h) }} /></div></div>
              ); })()}
              {detailData.source && <div className="item"><div className="item-info"><h4>Sursă</h4><p>{detailData.source}</p></div><span className="chip gray">{detailData.source}</span></div>}
              <div className="item"><div className="item-info"><h4>Email</h4><p>{detailData.email || "—"}</p></div></div>
              <div className="item"><div className="item-info"><h4>Telefon</h4><p>{detailData.phone || "—"}</p></div></div>
              {detailData.notes && <div className="item"><div className="item-info"><h4>Notițe</h4><p>{detailData.notes}</p></div></div>}
              <div className="item"><div className="item-info"><h4>Programări</h4><p>{detailData.bks.length} total</p></div></div>
              <div className="item"><div className="item-info"><h4>Facturi</h4><p>{detailData.invs.length} total — {currency(detailData.invs.reduce((s, i) => s + Number(i.amount || 0), 0))}</p></div></div>
              {detailData.dealCount > 0 && <div className="item"><div className="item-info"><h4>Deals</h4><p>{detailData.dealCount} în pipeline</p></div></div>}
              {detailData.msgCount > 0 && <div className="item"><div className="item-info"><h4>Mesaje</h4><p>{detailData.msgCount} conversații</p></div></div>}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button className="btn sm" onClick={() => quickReplyMessage(detailData.id)}>Trimite mesaj AI</button><button className="btn sm" onClick={() => { setDetailClient(null); setView("pipeline"); }}>Vezi deals</button></div>
              <div style={{ marginTop: 16 }}>
                <span className="card-title" style={{ marginBottom: 8 }}>Timeline ({detailData.timeline.length})</span>
                <div className="timeline">
                  {detailData.timeline.slice(0, 12).map((t, i) => (
                    <div className={`tl-item ${t.type}`} key={i}>
                      <div className="tl-time">{t.time}</div>
                      <div className="tl-text"><strong>{t.text.split("—")[0]}</strong>{t.text.includes("—") ? ` — ${t.text.split("—").slice(1).join("—")}` : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ CONFIRM DIALOG ═══ */}
        {confirmAction && (
          <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
              <h3>{confirmAction.title}</h3>
              <p>{confirmAction.desc}</p>
              <div className="confirm-actions">
                <button className="btn ghost" onClick={() => setConfirmAction(null)}>Anulează</button>
                <button className="btn danger" onClick={confirmAction.fn}>Confirmă</button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ BOTTOM NAV (mobile) ═══ */}
        {phase === "app" && (
          <div className="bottom-nav">
            {[
              { id: "dashboard", icon: "⌂", label: "Home" },
              { id: "clients", icon: "◉", label: "CRM" },
              { id: "bookings", icon: "▦", label: "Book" },
              { id: "pipeline", icon: "◬", label: "Pipe" },
              { id: "billing", icon: "⊡", label: "Bill" },
              { id: "task-manager", icon: "☑", label: "Tasks" },
            ].map((n) => (
              <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => setView(n.id)}>
                <span className="bnav-icon">{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
        )}

        {/* ═══ TOASTS ═══ */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div className="toast" key={t.id}>
              <span className={`t-icon ${t.type}`}>{t.type === "success" ? "✓" : t.type === "info" ? "ℹ" : "✕"}</span>
              <span>{t.msg}</span>
              {t.undoFn && <button className="undo-btn" onClick={() => { t.undoFn(); setToasts((ts) => ts.filter((x) => x.id !== t.id)); }}>Undo</button>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
