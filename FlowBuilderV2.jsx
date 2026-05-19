import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const COPY = {
  ro: {
    title: "Flow Builder v2 · Triggers compuse",
    subtitle: "Logică de business vizualizată ca graf: AND, OR, SEQUENCE, templates și export JSON.",
    templates: "Templates pre-built",
    saved: "Flow-uri salvate",
    newFlow: "+ Flow nou",
    save: "Salvează flow",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    addTrigger: "+ Trigger",
    addCondition: "+ Condiție",
    addAction: "+ Acțiune",
    empty: "Canvas gol · Alege un template sau adaugă noduri manual",
    active: "flow-uri active",
    edit: "Editează",
    delete: "Șterge",
    back: "← Înapoi la listă",
    savedOk: "✓ Flow salvat",
    importedOk: "✓ Import reușit",
    importErr: "Eroare la import",
    runOnce: "Rulează o dată",
    nodeTrigger: "TRIGGER",
    nodeCondition: "CONDIȚIE",
    nodeAction: "ACȚIUNE",
    helpTitle: "Cum funcționează",
    help: [
      "1. Alege un template sau adaugă noduri manual.",
      "2. Conectează nodurile prin click pe portul drept → portul stâng.",
      "3. AND/OR/SEQUENCE compun mai multe triggers într-o regulă.",
      "4. Salvează — flow-ul persistă în localStorage la cheia alpis-flows-v2."
    ]
  },
  en: {
    title: "Flow Builder v2 · Compound triggers",
    subtitle: "Business logic visualized as a graph: AND, OR, SEQUENCE, templates and JSON export.",
    templates: "Pre-built templates",
    saved: "Saved flows",
    newFlow: "+ New flow",
    save: "Save flow",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    addTrigger: "+ Trigger",
    addCondition: "+ Condition",
    addAction: "+ Action",
    empty: "Empty canvas · Pick a template or add nodes manually",
    active: "active flows",
    edit: "Edit",
    delete: "Delete",
    back: "← Back to list",
    savedOk: "✓ Flow saved",
    importedOk: "✓ Import successful",
    importErr: "Import error",
    runOnce: "Run once",
    nodeTrigger: "TRIGGER",
    nodeCondition: "CONDITION",
    nodeAction: "ACTION",
    helpTitle: "How it works",
    help: [
      "1. Pick a template or add nodes manually.",
      "2. Connect nodes by clicking right port → left port.",
      "3. AND/OR/SEQUENCE compose multiple triggers into a rule.",
      "4. Save — the flow persists in localStorage under alpis-flows-v2."
    ]
  }
};

const NODE_COLORS = {
  trigger: { bg: "rgba(79,140,255,.15)", border: "#4f8cff", label: "#93c5fd" },
  condition: { bg: "rgba(139,92,246,.15)", border: "#a78bfa", label: "#c4b5fd" },
  action: { bg: "rgba(74,222,128,.12)", border: "#4ade80", label: "#86efac" }
};

const STORAGE_KEY = "alpis-flows-v2";
const uid = (prefix = "id") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const TEMPLATES = [
  {
    id: "inactive-lead-reminder",
    color: "#fbbf24",
    name: { ro: "Lead inactiv 48h → reminder", en: "Lead inactive 48h → reminder" },
    description: { ro: "Lead-uri fără activitate primesc reminder automat.", en: "Leads without activity receive an automatic reminder." },
    nodes: [
      { id: "t1", type: "trigger", subtype: "status", label: { ro: "Status = Lead", en: "Status = Lead" }, x: 70, y: 80 },
      { id: "t2", type: "trigger", subtype: "time", label: { ro: "Inactiv > 48h", en: "Inactive > 48h" }, x: 70, y: 210 },
      { id: "c1", type: "condition", subtype: "and", label: { ro: "AND", en: "AND" }, x: 330, y: 145 },
      { id: "a1", type: "action", subtype: "email", label: { ro: "Email reminder", en: "Reminder email" }, x: 590, y: 145 }
    ],
    edges: [{ from: "t1", to: "c1" }, { from: "t2", to: "c1" }, { from: "c1", to: "a1" }]
  },
  {
    id: "won-booking-invoice",
    color: "#4ade80",
    name: { ro: "Status Won + booking → factură", en: "Status Won + booking → invoice" },
    description: { ro: "Generează factură și follow-up când booking-ul e confirmat.", en: "Generate invoice and follow-up when booking is confirmed." },
    nodes: [
      { id: "t1", type: "trigger", subtype: "status", label: { ro: "Status = Won", en: "Status = Won" }, x: 70, y: 80 },
      { id: "t2", type: "trigger", subtype: "property", label: { ro: "Booking confirmat", en: "Booking confirmed" }, x: 70, y: 210 },
      { id: "c1", type: "condition", subtype: "and", label: { ro: "AND", en: "AND" }, x: 330, y: 145 },
      { id: "a1", type: "action", subtype: "invoice", label: { ro: "Generează factură", en: "Generate invoice" }, x: 590, y: 90 },
      { id: "a2", type: "action", subtype: "task", label: { ro: "Follow-up +7 zile", en: "Follow-up +7 days" }, x: 590, y: 205 }
    ],
    edges: [{ from: "t1", to: "c1" }, { from: "t2", to: "c1" }, { from: "c1", to: "a1" }, { from: "c1", to: "a2" }]
  },
  {
    id: "vip-upgrade",
    color: "#a78bfa",
    name: { ro: "Tag VIP + revenue > 1000€ → upgrade", en: "Tag VIP + revenue > €1000 → upgrade" },
    description: { ro: "Clienții VIP intră în campanie premium.", en: "VIP customers enter a premium campaign." },
    nodes: [
      { id: "t1", type: "trigger", subtype: "property", label: { ro: "Tag = VIP", en: "Tag = VIP" }, x: 70, y: 80 },
      { id: "t2", type: "trigger", subtype: "property", label: { ro: "Revenue > 1000€", en: "Revenue > €1000" }, x: 70, y: 210 },
      { id: "c1", type: "condition", subtype: "and", label: { ro: "AND", en: "AND" }, x: 330, y: 145 },
      { id: "a1", type: "action", subtype: "tag", label: { ro: "+ Tag upgrade", en: "+ Tag upgrade" }, x: 590, y: 90 },
      { id: "a2", type: "action", subtype: "email", label: { ro: "Email premium", en: "Premium email" }, x: 590, y: 205 }
    ],
    edges: [{ from: "t1", to: "c1" }, { from: "t2", to: "c1" }, { from: "c1", to: "a1" }, { from: "c1", to: "a2" }]
  },
  {
    id: "sequence-offer",
    color: "#4f8cff",
    name: { ro: "SEQUENCE Lead → Contact → Offer", en: "SEQUENCE Lead → Contact → Offer" },
    description: { ro: "Dacă etapele se întâmplă în ordine, trimite ofertă personalizată.", en: "If stages happen in order, send a personalized offer." },
    nodes: [
      { id: "t1", type: "trigger", subtype: "status", label: { ro: "Lead", en: "Lead" }, x: 70, y: 70 },
      { id: "t2", type: "trigger", subtype: "status", label: { ro: "Contact", en: "Contact" }, x: 70, y: 160 },
      { id: "t3", type: "trigger", subtype: "status", label: { ro: "Offer", en: "Offer" }, x: 70, y: 250 },
      { id: "c1", type: "condition", subtype: "sequence", label: { ro: "SEQUENCE", en: "SEQUENCE" }, x: 330, y: 160 },
      { id: "a1", type: "action", subtype: "email", label: { ro: "Ofertă personalizată", en: "Personalized offer" }, x: 590, y: 160 }
    ],
    edges: [{ from: "t1", to: "c1" }, { from: "t2", to: "c1" }, { from: "t3", to: "c1" }, { from: "c1", to: "a1" }]
  },
  {
    id: "booking-conflict",
    color: "#f87171",
    name: { ro: "Booking conflict → notificare + task", en: "Booking conflict → notification + task" },
    description: { ro: "La conflict booking, notifică admin și creează task de reasignare.", en: "On booking conflict, notify admin and create reassignment task." },
    nodes: [
      { id: "t1", type: "trigger", subtype: "event", label: { ro: "Conflict booking", en: "Booking conflict" }, x: 70, y: 150 },
      { id: "a1", type: "action", subtype: "notify", label: { ro: "Notifică admin", en: "Notify admin" }, x: 350, y: 90 },
      { id: "a2", type: "action", subtype: "task", label: { ro: "Task reasignare", en: "Reassign task" }, x: 350, y: 210 }
    ],
    edges: [{ from: "t1", to: "a1" }, { from: "t1", to: "a2" }]
  }
];

function remapTemplate(template) {
  const map = new Map();
  const nodes = template.nodes.map((node) => {
    const nextId = uid("node");
    map.set(node.id, nextId);
    return { ...node, id: nextId };
  });
  return {
    id: uid("flow"),
    color: template.color,
    name: template.name,
    description: template.description,
    nodes,
    edges: template.edges.map((edge) => ({ from: map.get(edge.from), to: map.get(edge.to) })).filter((edge) => edge.from && edge.to),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function makeNode(type, index, lang) {
  const defaults = {
    trigger: { subtype: "status", label: { ro: "Status schimbat", en: "Status changed" } },
    condition: { subtype: "and", label: { ro: "AND", en: "AND" } },
    action: { subtype: "email", label: { ro: "Trimite email", en: "Send email" } }
  };
  return {
    id: uid("node"),
    type,
    ...defaults[type],
    x: 80 + (index % 4) * 210,
    y: 90 + Math.floor(index / 4) * 120
  };
}

function labelOf(value, lang) {
  if (!value) return "Untitled";
  if (typeof value === "string") return value;
  return value[lang] || value.ro || value.en || "Untitled";
}

function Node({ node, lang, onDragStart, onPortClick, onDelete }) {
  const color = NODE_COLORS[node.type] || NODE_COLORS.trigger;
  return (
    <div
      className="fbv2-node"
      style={{ left: node.x, top: node.y, background: color.bg, borderColor: color.border }}
      onMouseDown={(event) => onDragStart(event, node.id)}
    >
      <button className="fbv2-port fbv2-port-left" aria-label="Input port" onClick={(event) => onPortClick(event, node.id, "in")} />
      <button className="fbv2-port fbv2-port-right" aria-label="Output port" onClick={(event) => onPortClick(event, node.id, "out")} />
      <span className="fbv2-node-type" style={{ color: color.label }}>{node.type}</span>
      <strong>{labelOf(node.label, lang)}</strong>
      <small>{node.subtype}</small>
      <button className="fbv2-node-delete" onClick={(event) => { event.stopPropagation(); onDelete(node.id); }}>×</button>
    </div>
  );
}

export default function FlowBuilderV2({ lang = "ro", onClose }) {
  const t = COPY[lang] || COPY.ro;
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [mode, setMode] = useState("list");
  const [flows, setFlows] = useState([]);
  const [flow, setFlow] = useState(null);
  const [drag, setDrag] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(stored)) setFlows(stored);
    } catch (error) {
      console.warn("FlowBuilderV2 load", error);
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(flows)); } catch (error) {}
  }, [flows]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const startNew = () => {
    setFlow({
      id: uid("flow"),
      color: "#4f8cff",
      name: { ro: "Flow nou", en: "New flow" },
      description: { ro: "", en: "" },
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setMode("editor");
  };

  const openTemplate = (template) => {
    setFlow(remapTemplate(template));
    setMode("editor");
  };

  const saveFlow = () => {
    if (!flow) return;
    const next = { ...flow, updatedAt: new Date().toISOString() };
    setFlow(next);
    setFlows((current) => {
      const exists = current.some((item) => item.id === next.id);
      return exists ? current.map((item) => item.id === next.id ? next : item) : [...current, next];
    });
    showToast(t.savedOk);
  };

  const deleteFlow = (id) => {
    setFlows((current) => current.filter((item) => item.id !== id));
    if (flow?.id === id) {
      setFlow(null);
      setMode("list");
    }
  };

  const addNode = (type) => {
    if (!flow) return;
    setFlow((current) => ({ ...current, nodes: [...current.nodes, makeNode(type, current.nodes.length, lang)] }));
  };

  const deleteNode = (id) => {
    setFlow((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== id),
      edges: current.edges.filter((edge) => edge.from !== id && edge.to !== id)
    }));
  };

  const getCanvasPoint = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left + canvasRef.current.scrollLeft, y: event.clientY - rect.top + canvasRef.current.scrollTop };
  };

  const onDragStart = (event, id) => {
    event.stopPropagation();
    const node = flow.nodes.find((item) => item.id === id);
    const point = getCanvasPoint(event);
    setDrag({ id, offsetX: point.x - node.x, offsetY: point.y - node.y });
  };

  const onMouseMove = (event) => {
    const point = getCanvasPoint(event);
    setCursor(point);
    if (!drag) return;
    setFlow((current) => ({
      ...current,
      nodes: current.nodes.map((node) => node.id === drag.id ? { ...node, x: Math.max(0, point.x - drag.offsetX), y: Math.max(0, point.y - drag.offsetY) } : node)
    }));
  };

  const onMouseUp = () => setDrag(null);

  const onPortClick = (event, id, direction) => {
    event.stopPropagation();
    if (direction === "out") {
      setConnectFrom(id);
      return;
    }
    if (direction === "in" && connectFrom && connectFrom !== id) {
      setFlow((current) => {
        const exists = current.edges.some((edge) => edge.from === connectFrom && edge.to === id);
        return exists ? current : { ...current, edges: [...current.edges, { from: connectFrom, to: id }] };
      });
      setConnectFrom(null);
    }
  };

  const exportJson = () => {
    if (!flow) return;
    const blob = new Blob([JSON.stringify(flow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${labelOf(flow.name, lang).replace(/\s+/g, "-").toLowerCase()}-flow.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}"));
        if (!Array.isArray(imported.nodes) || !Array.isArray(imported.edges)) throw new Error("Invalid flow");
        setFlow({ ...imported, id: uid("flow"), updatedAt: new Date().toISOString() });
        setMode("editor");
        showToast(t.importedOk);
      } catch (error) {
        showToast(t.importErr);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const nodeMap = useMemo(() => new Map((flow?.nodes || []).map((node) => [node.id, node])), [flow]);
  const minimap = useMemo(() => {
    if (!flow?.nodes?.length) return null;
    const xs = flow.nodes.map((node) => node.x);
    const ys = flow.nodes.map((node) => node.y);
    return { minX: Math.min(...xs), minY: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs) + 170, height: Math.max(...ys) - Math.min(...ys) + 90 };
  }, [flow]);

  const edgePath = (from, to) => {
    const x1 = from.x + 160;
    const y1 = from.y + 38;
    const x2 = to.x;
    const y2 = to.y + 38;
    const dx = Math.max(80, Math.abs(x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <section className="fbv2-root">
      <style>{CSS}</style>
      <header className="fbv2-header">
        <div>
          <span className="fbv2-eyebrow">Alpis Fusion · v2</span>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
        <div className="fbv2-header-actions">
          {onClose && <button className="fbv2-btn ghost" onClick={onClose}>Dashboard</button>}
          {mode === "editor" && <button className="fbv2-btn ghost" onClick={() => { setMode("list"); setFlow(null); }}>{t.back}</button>}
          <span className="fbv2-badge">{flows.length} {t.active}</span>
        </div>
      </header>

      {mode === "list" && (
        <div className="fbv2-list">
          <div className="fbv2-section-head">
            <h3>{t.templates}</h3>
            <button className="fbv2-btn primary" onClick={startNew}>{t.newFlow}</button>
          </div>
          <div className="fbv2-grid">
            {TEMPLATES.map((template) => (
              <button key={template.id} className="fbv2-card" onClick={() => openTemplate(template)}>
                <span className="fbv2-card-line" style={{ background: template.color }} />
                <strong>{labelOf(template.name, lang)}</strong>
                <span>{labelOf(template.description, lang)}</span>
                <small>{template.nodes.length} nodes · {template.edges.length} edges</small>
              </button>
            ))}
          </div>

          <div className="fbv2-section-head second">
            <h3>{t.saved}</h3>
          </div>
          <div className="fbv2-grid">
            {flows.length === 0 && <div className="fbv2-empty">—</div>}
            {flows.map((item) => (
              <article key={item.id} className="fbv2-card saved">
                <span className="fbv2-card-line" style={{ background: item.color || "#4f8cff" }} />
                <strong>{labelOf(item.name, lang)}</strong>
                <span>{labelOf(item.description, lang)}</span>
                <small>{item.nodes?.length || 0} nodes · {item.edges?.length || 0} edges</small>
                <div className="fbv2-card-actions">
                  <button className="fbv2-btn sm" onClick={() => { setFlow(item); setMode("editor"); }}>{t.edit}</button>
                  <button className="fbv2-btn sm danger" onClick={() => deleteFlow(item.id)}>{t.delete}</button>
                </div>
              </article>
            ))}
          </div>

          <aside className="fbv2-help">
            <strong>{t.helpTitle}</strong>
            {t.help.map((item) => <span key={item}>{item}</span>)}
          </aside>
        </div>
      )}

      {mode === "editor" && flow && (
        <div className="fbv2-editor">
          <div className="fbv2-toolbar">
            <input value={labelOf(flow.name, lang)} onChange={(event) => setFlow((current) => ({ ...current, name: { ...current.name, [lang]: event.target.value } }))} />
            <button className="fbv2-btn" onClick={() => addNode("trigger")}>{t.addTrigger}</button>
            <button className="fbv2-btn" onClick={() => addNode("condition")}>{t.addCondition}</button>
            <button className="fbv2-btn" onClick={() => addNode("action")}>{t.addAction}</button>
            <button className="fbv2-btn primary" onClick={saveFlow}>{t.save}</button>
            <button className="fbv2-btn" onClick={exportJson}>{t.exportJson}</button>
            <button className="fbv2-btn" onClick={() => fileRef.current?.click()}>{t.importJson}</button>
            <input ref={fileRef} hidden type="file" accept="application/json" onChange={importJson} />
          </div>

          <div ref={canvasRef} className="fbv2-canvas" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
            {flow.nodes.length === 0 && <div className="fbv2-canvas-empty">{t.empty}</div>}
            <svg className="fbv2-svg" width="1600" height="900">
              <defs><marker id="fbv2-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="rgba(147,197,253,.72)" /></marker></defs>
              {flow.edges.map((edge, index) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                return <path key={`${edge.from}-${edge.to}-${index}`} d={edgePath(from, to)} stroke="rgba(79,140,255,.62)" strokeWidth="2" fill="none" markerEnd="url(#fbv2-arrow)" />;
              })}
              {connectFrom && nodeMap.get(connectFrom) && <path d={`M ${nodeMap.get(connectFrom).x + 160} ${nodeMap.get(connectFrom).y + 38} C ${nodeMap.get(connectFrom).x + 240} ${nodeMap.get(connectFrom).y + 38}, ${cursor.x - 80} ${cursor.y}, ${cursor.x} ${cursor.y}`} stroke="rgba(74,222,128,.75)" strokeWidth="2" strokeDasharray="4 4" fill="none" />}
            </svg>
            {flow.nodes.map((node) => <Node key={node.id} node={node} lang={lang} onDragStart={onDragStart} onPortClick={onPortClick} onDelete={deleteNode} />)}
            {minimap && flow.nodes.length > 1 && (
              <div className="fbv2-minimap">
                <strong>Mini-map</strong>
                <svg viewBox={`${minimap.minX} ${minimap.minY} ${minimap.width} ${minimap.height}`}>
                  {flow.edges.map((edge, index) => {
                    const from = nodeMap.get(edge.from);
                    const to = nodeMap.get(edge.to);
                    return from && to ? <line key={index} x1={from.x + 80} y1={from.y + 38} x2={to.x + 80} y2={to.y + 38} stroke="rgba(255,255,255,.28)" /> : null;
                  })}
                  {flow.nodes.map((node) => <rect key={node.id} x={node.x} y={node.y} width="160" height="76" rx="10" fill={NODE_COLORS[node.type].border} opacity=".62" />)}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="fbv2-toast">{toast}</div>}
    </section>
  );
}

const CSS = `
.fbv2-root{color:var(--text,#ededf4);min-height:620px}.fbv2-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px;flex-wrap:wrap}.fbv2-eyebrow{display:inline-flex;margin-bottom:6px;color:var(--accent,#00e5a0);font-family:var(--mono,monospace);font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:800}.fbv2-header h2{margin:0;font-size:clamp(24px,4vw,34px);letter-spacing:-.04em}.fbv2-header p{margin:6px 0 0;color:var(--text-secondary,#9295a8);line-height:1.6}.fbv2-header-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fbv2-badge{display:inline-flex;padding:7px 12px;border-radius:999px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.28);color:#4ade80;font-size:12px;font-weight:800}.fbv2-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:16px 0 12px}.fbv2-section-head.second{margin-top:28px}.fbv2-section-head h3{margin:0;font-size:16px}.fbv2-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.fbv2-card{position:relative;display:flex;flex-direction:column;gap:8px;text-align:left;border:1px solid var(--line,rgba(255,255,255,.08));background:var(--panel,rgba(13,13,20,.88));border-radius:16px;padding:18px;min-height:150px;color:inherit;transition:transform .2s,border-color .2s;overflow:hidden}.fbv2-card:hover{transform:translateY(-2px);border-color:var(--brand,#7c6cff)}.fbv2-card.saved{cursor:default}.fbv2-card-line{position:absolute;top:0;left:0;right:0;height:3px}.fbv2-card strong{font-size:15px}.fbv2-card span{color:var(--text-secondary,#9295a8);font-size:13px;line-height:1.55}.fbv2-card small{margin-top:auto;color:var(--muted,#5c5f73);font-family:var(--mono,monospace);font-size:11px}.fbv2-card-actions{display:flex;gap:8px;margin-top:10px}.fbv2-btn{border:1px solid var(--line,rgba(255,255,255,.1));background:var(--surface,rgba(255,255,255,.05));color:var(--text,#ededf4);border-radius:10px;padding:8px 12px;font-weight:800;font-size:12px;cursor:pointer}.fbv2-btn:hover{border-color:var(--brand,#7c6cff)}.fbv2-btn.primary{background:linear-gradient(135deg,var(--brand,#7c6cff),var(--accent,#00e5a0));border-color:transparent;color:#fff}.fbv2-btn.ghost{background:transparent}.fbv2-btn.sm{padding:6px 9px;font-size:11px}.fbv2-btn.danger{color:#f87171;border-color:rgba(248,113,113,.28);background:rgba(248,113,113,.08)}.fbv2-empty{display:grid;place-items:center;border:1px dashed var(--line,rgba(255,255,255,.1));border-radius:16px;min-height:120px;color:var(--muted,#5c5f73)}.fbv2-help{margin-top:20px;border:1px dashed rgba(79,140,255,.24);background:rgba(79,140,255,.06);border-radius:16px;padding:16px;display:grid;gap:6px;color:var(--text-secondary,#9295a8);font-size:13px}.fbv2-help strong{color:var(--brand-light,#a89bff);text-transform:uppercase;letter-spacing:.08em;font-size:11px}.fbv2-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border:1px solid var(--line,rgba(255,255,255,.08));background:var(--panel,rgba(13,13,20,.88));border-radius:16px;padding:12px;margin-bottom:12px}.fbv2-toolbar input{flex:1;min-width:220px;border:1px solid var(--line,rgba(255,255,255,.08));background:rgba(255,255,255,.04);border-radius:10px;padding:9px 12px;color:inherit}.fbv2-canvas{position:relative;height:590px;overflow:auto;border:1px solid var(--line,rgba(255,255,255,.08));border-radius:18px;background:radial-gradient(circle,rgba(79,140,255,.07) 1px,transparent 1px),rgba(255,255,255,.02);background-size:22px 22px}.fbv2-svg{position:absolute;inset:0;pointer-events:none}.fbv2-canvas-empty{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--muted,#5c5f73);text-align:center;pointer-events:none}.fbv2-node{position:absolute;width:160px;min-height:76px;border:2px solid;border-radius:14px;padding:12px 14px;cursor:move;user-select:none;z-index:3;box-shadow:0 10px 28px rgba(0,0,0,.24);backdrop-filter:blur(12px)}.fbv2-node-type{display:block;font-family:var(--mono,monospace);font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}.fbv2-node strong{display:block;color:#fff;font-size:13px;line-height:1.25}.fbv2-node small{display:block;color:rgba(255,255,255,.62);font-family:var(--mono,monospace);font-size:10px;margin-top:5px}.fbv2-port{position:absolute;top:50%;width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.4);transform:translateY(-50%);cursor:crosshair}.fbv2-port:hover{background:#4ade80;border-color:#4ade80}.fbv2-port-left{left:-8px}.fbv2-port-right{right:-8px}.fbv2-node-delete{position:absolute;right:7px;top:7px;width:20px;height:20px;border:0;border-radius:6px;background:rgba(0,0,0,.28);color:#fff;cursor:pointer}.fbv2-node-delete:hover{background:rgba(248,113,113,.72)}.fbv2-minimap{position:absolute;right:14px;bottom:14px;width:150px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:12px;background:rgba(0,0,0,.48);backdrop-filter:blur(12px);padding:8px;z-index:5}.fbv2-minimap strong{display:block;font-family:var(--mono,monospace);font-size:10px;color:var(--muted,#9295a8);margin-bottom:5px}.fbv2-minimap svg{width:132px;height:82px;background:rgba(255,255,255,.04);border-radius:8px}.fbv2-toast{position:fixed;right:22px;bottom:22px;z-index:9999;background:rgba(74,222,128,.16);color:#4ade80;border:1px solid rgba(74,222,128,.38);padding:11px 15px;border-radius:12px;font-weight:900;backdrop-filter:blur(12px)}body.light-theme .fbv2-card,body.light-theme .fbv2-toolbar{background:rgba(255,255,255,.9)}body.light-theme .fbv2-node strong{color:var(--text,#1a1a2e)}@media(max-width:720px){.fbv2-grid{grid-template-columns:1fr}.fbv2-canvas{height:430px}.fbv2-toolbar{align-items:stretch}.fbv2-toolbar input{width:100%;min-width:0}}@media(prefers-reduced-motion:reduce){.fbv2-card:hover{transform:none}}
`;
