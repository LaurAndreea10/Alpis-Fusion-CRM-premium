import { useEffect, useMemo, useState } from "react";

/* ============================================================
   FlowBuilderV22.jsx
   Alpis Fusion v2.2 — Edge conditions + per-flow versioning
   ============================================================

   Self-contained React module. It extends the Flow Builder concept with:
   - conditions directly on edges, not only on nodes
   - version snapshots per flow
   - mock test runner that evaluates edge conditions
   - JSON export/import
   - RO/EN copy
   - localStorage key: alpis-flows-v22
   ============================================================ */

const STORAGE_KEY = "alpis-flows-v22";
const uid = (p = "id") => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const COPY = {
  ro: {
    title: "Flow Builder v2.2 · Edge conditions + versioning",
    subtitle: "Reguli pe conexiuni, snapshots per flow și test mode cu date mock.",
    newFlow: "+ Flow nou",
    saveVersion: "Salvează versiune",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    test: "Rulează test",
    reset: "Reset demo",
    edgeConditions: "Condiții pe edges",
    versions: "Versiuni flow",
    canvas: "Canvas logic",
    result: "Rezultat test",
    pass: "trece",
    fail: "blocat",
    activeVersion: "versiune activă",
    mockData: "Date mock",
    explain: "Edge conditions permit ramuri diferite în funcție de valoarea lead-ului, tag, timp sau status. Versioning-ul păstrează snapshots înainte de schimbări mari.",
    fields: { status: "status", value: "valoare", tag: "tag", inactiveHours: "ore inactive" }
  },
  en: {
    title: "Flow Builder v2.2 · Edge conditions + versioning",
    subtitle: "Rules on connections, per-flow snapshots and mock-data test mode.",
    newFlow: "+ New flow",
    saveVersion: "Save version",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    test: "Run test",
    reset: "Reset demo",
    edgeConditions: "Edge conditions",
    versions: "Flow versions",
    canvas: "Logic canvas",
    result: "Test result",
    pass: "passes",
    fail: "blocked",
    activeVersion: "active version",
    mockData: "Mock data",
    explain: "Edge conditions allow different branches depending on lead value, tag, time or status. Versioning keeps snapshots before major changes.",
    fields: { status: "status", value: "value", tag: "tag", inactiveHours: "inactive hours" }
  }
};

const demoFlow = () => ({
  id: uid("flow"),
  name: "High-value lead nurture",
  version: 3,
  updatedAt: new Date().toISOString(),
  nodes: [
    { id: "n1", type: "trigger", label: "Status = Lead", x: 40, y: 90 },
    { id: "n2", type: "condition", label: "Check value + tag", x: 300, y: 90 },
    { id: "n3", type: "action", label: "VIP follow-up", x: 560, y: 40 },
    { id: "n4", type: "action", label: "Standard nurture", x: 560, y: 160 },
    { id: "n5", type: "wait", label: "WAIT 24h", x: 820, y: 40 },
    { id: "n6", type: "action", label: "Send offer", x: 1060, y: 40 }
  ],
  edges: [
    { id: "e1", from: "n1", to: "n2", condition: { field: "status", op: "=", value: "lead" } },
    { id: "e2", from: "n2", to: "n3", condition: { field: "value", op: ">=", value: 1000 } },
    { id: "e3", from: "n2", to: "n4", condition: { field: "value", op: "<", value: 1000 } },
    { id: "e4", from: "n3", to: "n5", condition: { field: "tag", op: "includes", value: "vip" } },
    { id: "e5", from: "n5", to: "n6", condition: { field: "inactiveHours", op: ">=", value: 24 } }
  ],
  versions: [
    { id: "v1", label: "v1 · basic nurture", createdAt: "2026-05-10", note: "Initial flow: lead → nurture." },
    { id: "v2", label: "v2 · value branch", createdAt: "2026-05-15", note: "Added high-value branch." },
    { id: "v3", label: "v3 · edge conditions", createdAt: "2026-05-19", note: "Added edge conditions + WAIT 24h." }
  ]
});

const defaultMock = { status: "lead", value: 2400, tag: "vip, premium", inactiveHours: 28 };
const nodeColor = { trigger: "#4f8cff", condition: "#a78bfa", action: "#4ade80", wait: "#fbbf24" };

function evaluateCondition(condition, mock) {
  if (!condition) return true;
  const raw = mock[condition.field];
  const a = typeof raw === "string" ? raw.toLowerCase() : Number(raw || 0);
  const b = typeof condition.value === "string" ? condition.value.toLowerCase() : Number(condition.value || 0);
  if (condition.op === "=") return a === b;
  if (condition.op === ">=") return Number(a) >= Number(b);
  if (condition.op === "<") return Number(a) < Number(b);
  if (condition.op === "includes") return String(a).includes(String(b));
  return false;
}

export default function FlowBuilderV22({ lang = "ro" }) {
  const t = COPY[lang] || COPY.ro;
  const [flow, setFlow] = useState(demoFlow);
  const [mock, setMock] = useState(defaultMock);
  const [result, setResult] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFlow(JSON.parse(stored));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(flow)); } catch (e) {}
  }, [flow]);

  const nodeMap = useMemo(() => Object.fromEntries(flow.nodes.map(n => [n.id, n])), [flow.nodes]);

  function runTest() {
    const rows = flow.edges.map(edge => {
      const ok = evaluateCondition(edge.condition, mock);
      return {
        id: edge.id,
        from: nodeMap[edge.from]?.label || edge.from,
        to: nodeMap[edge.to]?.label || edge.to,
        condition: `${edge.condition.field} ${edge.condition.op} ${edge.condition.value}`,
        ok
      };
    });
    setResult(rows);
  }

  function saveVersion() {
    const next = {
      id: uid("v"),
      label: `v${(flow.versions?.length || 0) + 1} · snapshot`,
      createdAt: new Date().toISOString().slice(0, 10),
      note: "Snapshot before rule changes"
    };
    setFlow(f => ({ ...f, version: (f.version || 0) + 1, versions: [...(f.versions || []), next], updatedAt: new Date().toISOString() }));
  }

  function updateEdge(edgeId, patch) {
    setFlow(f => ({ ...f, edges: f.edges.map(e => e.id === edgeId ? { ...e, condition: { ...e.condition, ...patch } } : e) }));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(flow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alpis-flow-v22.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { setFlow(JSON.parse(ev.target.result)); } catch (err) { alert("Import error"); }
    };
    reader.readAsText(file);
  }

  return (
    <div className="fb22">
      <style>{css}</style>
      <header className="fb22-head">
        <div>
          <span className="fb22-kicker">Alpis Fusion · v2.2</span>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
        <div className="fb22-actions">
          <button onClick={() => setFlow(demoFlow())}>{t.reset}</button>
          <button onClick={saveVersion}>{t.saveVersion}</button>
          <button onClick={runTest} className="primary">{t.test}</button>
          <button onClick={exportJson}>{t.exportJson}</button>
          <label className="fileBtn">{t.importJson}<input type="file" accept="application/json" onChange={importJson} hidden /></label>
        </div>
      </header>

      <div className="fb22-grid">
        <section className="fb22-card canvasCard">
          <div className="fb22-section-title">{t.canvas}</div>
          <div className="canvas" style={{ width: 1240 }}>
            <svg className="edges" viewBox="0 0 1240 320">
              {flow.edges.map(edge => {
                const from = nodeMap[edge.from], to = nodeMap[edge.to];
                if (!from || !to) return null;
                const ok = result.find(r => r.id === edge.id)?.ok;
                const stroke = ok === undefined ? "rgba(79,140,255,.55)" : ok ? "#4ade80" : "#f87171";
                const midX = (from.x + to.x) / 2 + 90;
                const midY = (from.y + to.y) / 2;
                return (
                  <g key={edge.id}>
                    <path d={`M ${from.x + 150} ${from.y + 34} C ${from.x + 230} ${from.y + 34}, ${to.x - 70} ${to.y + 34}, ${to.x} ${to.y + 34}`} stroke={stroke} strokeWidth="3" fill="none" />
                    <foreignObject x={midX - 74} y={midY - 15} width="148" height="30">
                      <div className="edgeLabel">{edge.condition.field} {edge.condition.op} {String(edge.condition.value)}</div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
            {flow.nodes.map(n => (
              <div className={`node ${n.type}`} key={n.id} style={{ left: n.x, top: n.y, borderColor: nodeColor[n.type] }}>
                <small style={{ color: nodeColor[n.type] }}>{n.type}</small>
                <strong>{n.label}</strong>
              </div>
            ))}
          </div>
        </section>

        <aside className="fb22-side">
          <section className="fb22-card">
            <div className="fb22-section-title">{t.mockData}</div>
            {Object.entries(mock).map(([key, value]) => (
              <label className="field" key={key}>
                <span>{t.fields[key] || key}</span>
                <input value={value} onChange={e => setMock(m => ({ ...m, [key]: key === "value" || key === "inactiveHours" ? Number(e.target.value) : e.target.value }))} />
              </label>
            ))}
          </section>

          <section className="fb22-card">
            <div className="fb22-section-title">{t.edgeConditions}</div>
            {flow.edges.map(edge => (
              <div className="edgeEditor" key={edge.id}>
                <strong>{nodeMap[edge.from]?.label} → {nodeMap[edge.to]?.label}</strong>
                <div className="miniGrid">
                  <input value={edge.condition.field} onChange={e => updateEdge(edge.id, { field: e.target.value })} />
                  <select value={edge.condition.op} onChange={e => updateEdge(edge.id, { op: e.target.value })}>
                    <option>=</option><option>{">="}</option><option>{"<"}</option><option>includes</option>
                  </select>
                  <input value={edge.condition.value} onChange={e => updateEdge(edge.id, { value: e.target.value })} />
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>

      <div className="fb22-grid bottom">
        <section className="fb22-card">
          <div className="fb22-section-title">{t.result}</div>
          {result.length === 0 ? <p className="muted">{t.explain}</p> : result.map(r => (
            <div className={`result ${r.ok ? "ok" : "bad"}`} key={r.id}>
              <strong>{r.from} → {r.to}</strong>
              <span>{r.condition} · {r.ok ? t.pass : t.fail}</span>
            </div>
          ))}
        </section>
        <section className="fb22-card">
          <div className="fb22-section-title">{t.versions}</div>
          <div className="versionNow">v{flow.version} · {t.activeVersion}</div>
          {(flow.versions || []).map(v => (
            <div className="version" key={v.id}><strong>{v.label}</strong><span>{v.createdAt} · {v.note}</span></div>
          ))}
        </section>
      </div>
    </div>
  );
}

const css = `
.fb22{color:var(--text,#eef4ff);padding:8px}.fb22 *{box-sizing:border-box}.fb22-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px}.fb22-kicker{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:var(--accent,#4f8cff)}.fb22 h2{margin:6px 0 4px;font-size:1.7rem;letter-spacing:-.03em}.fb22 p,.muted{color:var(--muted,#9db0d4);line-height:1.65}.fb22-actions{display:flex;gap:8px;flex-wrap:wrap}.fb22 button,.fileBtn{border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(255,255,255,.05);color:var(--text,#eef4ff);border-radius:10px;padding:9px 12px;font:800 .82rem inherit;cursor:pointer}.fb22 button.primary{background:linear-gradient(135deg,var(--accent,#4f8cff),var(--accent2,#8b5cf6));color:#fff;border-color:transparent}.fb22-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px}.fb22-grid.bottom{grid-template-columns:1fr 1fr;margin-top:14px}.fb22-card{border:1px solid var(--line,rgba(255,255,255,.12));border-radius:18px;background:var(--panel,rgba(10,22,46,.75));padding:16px;backdrop-filter:blur(12px)}.fb22-section-title{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:var(--accent,#4f8cff);font-weight:900;margin-bottom:12px}.canvasCard{overflow:auto}.canvas{height:320px;position:relative;background:radial-gradient(circle,rgba(79,140,255,.07) 1px,transparent 1px),rgba(255,255,255,.025);background-size:24px 24px;border-radius:14px;border:1px solid rgba(255,255,255,.08)}.edges{position:absolute;inset:0;width:1240px;height:320px}.node{position:absolute;width:150px;min-height:68px;border:2px solid;border-radius:14px;background:rgba(255,255,255,.07);padding:11px;box-shadow:0 12px 30px rgba(0,0,0,.24)}.node small{display:block;text-transform:uppercase;font-size:.6rem;font-weight:900;letter-spacing:.1em}.node strong{display:block;font-size:.82rem;margin-top:5px;color:#fff}.edgeLabel{height:26px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:rgba(7,18,38,.9);border:1px solid rgba(255,255,255,.14);color:#cbd5e1;font-size:11px;font-weight:900}.field{display:grid;gap:6px;margin-bottom:10px}.field span{font-size:.72rem;color:var(--muted,#9db0d4);font-weight:900;text-transform:uppercase;letter-spacing:.08em}.field input,.edgeEditor input,.edgeEditor select{width:100%;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(255,255,255,.05);border-radius:9px;padding:8px 9px;color:var(--text,#eef4ff);font:700 .82rem inherit}.edgeEditor{border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:10px;margin-bottom:10px;background:rgba(255,255,255,.035)}.edgeEditor strong{display:block;font-size:.78rem;margin-bottom:8px}.miniGrid{display:grid;grid-template-columns:1fr 72px 1fr;gap:6px}.result,.version{border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,.035)}.result{border-left:4px solid #4f8cff}.result.ok{border-left-color:#4ade80}.result.bad{border-left-color:#f87171}.result strong,.version strong{display:block}.result span,.version span{display:block;color:var(--muted,#9db0d4);font-size:.8rem;margin-top:3px}.versionNow{display:inline-flex;margin-bottom:10px;border-radius:999px;padding:6px 10px;background:rgba(79,140,255,.12);border:1px solid rgba(79,140,255,.24);color:var(--accent,#4f8cff);font-size:.78rem;font-weight:900}@media(max-width:920px){.fb22-grid,.fb22-grid.bottom{grid-template-columns:1fr}.fb22-side{display:grid;gap:14px}.miniGrid{grid-template-columns:1fr}}
`;
