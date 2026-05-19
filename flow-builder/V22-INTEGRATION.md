# Flow Builder v2.2 — Edge conditions + versioning

## Ce adaugă

`FlowBuilderV22.jsx` extinde modulul Flow Builder cu două capabilități noi:

- **conditions pe edges** — regulile sunt puse direct pe conexiuni, nu doar în noduri
- **versioning per flow** — snapshots salvate înainte de schimbări importante

Include și:

- mock test runner
- evaluare vizuală pass / blocked pe fiecare edge
- editare condiții direct în panel
- export/import JSON
- localStorage key: `alpis-flows-v22`
- RO/EN prin prop `lang`
- theme-aware CSS prin variables existente

## Integrare în App.jsx

Adaugă importul:

```jsx
import FlowBuilderV22 from './FlowBuilderV22.jsx';
```

În zona unde randezi view-urile:

```jsx
{view === 'flowbuilder-v22' && (
  <FlowBuilderV22 lang={lang} />
)}
```

În sidebar / navigation:

```jsx
<button
  className={view === 'flowbuilder-v22' ? 'active' : ''}
  onClick={() => setView('flowbuilder-v22')}
>
  🔀 Flow Builder v2.2
</button>
```

## Test rapid

1. Deschide view-ul `Flow Builder v2.2`.
2. Verifică mock data: `status=lead`, `value=2400`, `tag=vip,premium`, `inactiveHours=28`.
3. Apasă **Rulează test**.
4. Edge-urile trebuie să devină verzi dacă trec condiția, roșii dacă sunt blocate.
5. Modifică `value` sub 1000 și rulează din nou — ramura standard trebuie să treacă, ramura VIP să fie blocată.
6. Apasă **Salvează versiune** și verifică lista de versions.

## Roadmap v2.3

- conditions groups pe edge: AND/OR nested
- test scenarios multiple, salvate ca presets
- diff între două versiuni de flow
- rollback la o versiune anterioară
- webhook trigger pentru integrare externă
