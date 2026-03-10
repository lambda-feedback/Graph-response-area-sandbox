# Graph Module Documentation

This module provides a visual editor for Graphs built with **Cytoscape.js** and **Paper.js**. It bridges a **Python-style backend** (deeply nested objects) and a **TypeScript/Zod frontend** (restricted to 2-level JSON nesting via pipe-delimited strings).

---

## 1. The Core Data Structures

### Frontend Schema (`Graph`)

The full graph type used internally by the editor. Defined as a Zod schema in `type.ts`.

```typescript
type Graph = {
  nodes: Array<{
    id: string;
    label?: string;
    x?: number;
    y?: number;
    metadata: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight?: number;   // currently unused
    label?: string;
    id?: string;
    metadata: Record<string, any>;
  }>;
  directed: boolean;
  weighted: boolean;   // currently unused
  multigraph: boolean; // currently unused
  metadata: Record<string, any>;
}
```

### Flattened Schema (`SimpleGraph`)

To satisfy the `jsonNestedSchema` (2-level nesting limit, Shimmy communication issues), nodes and edges are serialised as pipe-delimited strings.

```typescript
type SimpleGraph = {
  nodes: string[];        // Format: "id|label|x|y"
  edges: string[];        // Format: "source|target|weight|label"
  directed: boolean;
  weighted: boolean;
  multigraph: boolean;
  evaluation_type: string[];
}
```

### Config Schema (`GraphConfig`)

Teacher-configured parameters stored separately in `config`, **not** in the answer. `evaluation_type` is a plain string (the backend Pydantic `EvaluationParams` expects a string, not an array).

```typescript
type GraphConfig = {
  directed: boolean;
  weighted: boolean;
  multigraph: boolean;
  evaluation_type: string;  // e.g. 'connectivity', 'isomorphism', ...
}
```

### Answer Schema (`GraphAnswer`)

Topology-only answer — config flags live in `GraphConfig`, not here.

```typescript
type GraphAnswer = {
  nodes: string[];  // pipe-delimited node strings
  edges: string[];  // pipe-delimited edge strings
}
```

### Validation & Feedback Types

```typescript
enum CheckPhase { Idle = 'idle', Evaluated = 'evaluated' }

interface ValidationError {
  type: 'error' | 'warning'
  message: string
  field?: string
}

interface GraphFeedback {
  valid: boolean
  errors: ValidationError[]
  phase: CheckPhase
}
```

---

## 2. File Structure

```
src/types/Graph/
  Graph.component.tsx         # GraphEditor — Cytoscape + Paper.js visual editor (panel inlined)
  Graph.component.styles.ts   # makeStyles (emotion/tss-react) styles for GraphEditor
  index.tsx                   # GraphResponseAreaTub, WizardPanel, InputComponent
  type.ts                     # All Zod schemas, types, and conversion utilities
  components/
    ConfigPanel.tsx           # Teacher config UI (graph type, evaluation type)
    ConfigPanel.styles.ts     # makeStyles styles for ConfigPanel
```

> **Note:** Styles use `makeStyles` from `@styles` (tss-react/emotion) rather than CSS modules. This is required because the project builds as an IIFE library — CSS modules are extracted into a separate file that may not be loaded by the consuming app, while emotion injects styles at runtime inside the JS bundle.

---

## 3. Key Components

### `Graph.component.tsx` — `GraphEditor`

The primary visual editor.

- **Rendering**: Uses **Cytoscape.js** for graph rendering and interaction.
- **Draw Mode**: Uses **Paper.js** (overlaid canvas) for freehand drawing:
  - **Draw a circle** → creates a new node at the circle's centre.
  - **Draw a line between nodes** → creates a new edge between the two closest nodes.
  - **Click two nodes** (while in draw mode) → creates an edge between them.
- **Selection**: Clicking a node or edge selects it; its properties appear in the inlined **Item Properties** side panel.
- **Sync**: Every mutation (add/delete/edit) calls `syncToGraph()`, which reads Cytoscape state and fires `onChange(graph)`.

### `components/ConfigPanel.tsx`

Teacher-facing configuration panel (rendered in `WizardComponent` only).

- Toggle **Directed / Undirected**.
- Select an **Evaluation Type** (e.g. `isomorphism`, `connectivity`, `tree`, ...).
- Accepts an optional `AnswerPanel?: React.ReactNode` prop, rendered below the evaluation-type selector when `isomorphism` is selected.
- Styles are extracted to `ConfigPanel.styles.ts`.

### Item Properties Panel (inlined in `Graph.component.tsx`)

Left side panel rendered directly inside `GraphEditor` for editing selected elements:

- **Add Node** button.
- **Fit to Screen** button.
- **Draw Edge** toggle (activates draw mode).
- Edit **Display Name** of a selected node.
- Edit **Edge Label** of a selected edge.
- **Delete** button for nodes and edges.

---

## 4. Transformation Logic

Conversion utilities in `type.ts` handle the boundary between the rich editor format and the flattened wire format.

| Function | Source | Target |
|---|---|---|
| `toSimpleGraph(graph, evaluationType?)` | `Graph` | `SimpleGraph` |
| `fromSimpleGraph(simple)` | `SimpleGraph` | `Graph` |
| `graphAnswerToSimple(answer, config)` | `GraphAnswer` + `GraphConfig` | `SimpleGraph` |
| `simpleToAnswer(simple)` | `SimpleGraph` | `GraphAnswer` |

---

## 5. Usage in the Pipeline

1. **Load**: Data arrives from the backend as a flattened answer object (nodes + edges + config flags merged together).
2. **Convert**: `fromSimpleGraph(graphAnswerToSimple(answer, config))` reconstructs the rich `Graph` for the editor.
3. **Edit**: The user interacts with `GraphEditor`. Internal state stays in the rich `Graph` format.
4. **Save**: On change, `simpleToAnswer(toSimpleGraph(graph))` flattens the topology back. Config flags are merged into the answer object before sending to the backend:
   ```typescript
   const flatAnswer = {
     ...answer,
     directed: config.directed,
     weighted: config.weighted,
     multigraph: config.multigraph,
     evaluation_type: config.evaluation_type,
   }
   ```

### Legacy migration

`extractConfig` and `extractAnswer` in `GraphResponseAreaTub` handle two legacy cases:
- `evaluation_type` stored as `string[]` (old format) — first element is taken.
- Config flags flattened directly into the answer object (old format) — flags are read from there and a proper `GraphConfig` is reconstructed.

---

## 6. Important Implementation Notes

- **Node IDs**: Auto-generated as `n0`, `n1`, `n2`, ... The counter tracks the highest existing ID to avoid duplicates on reload.
- **Edge IDs**: Generated as `` `e-${source}-${target}-${Date.now()}` `` to guarantee uniqueness, including in multigraphs.
- **Config is flattened into answer**: The backend reads `directed`, `weighted`, `multigraph`, and `evaluation_type` from the answer object, not a separate config field. This is handled in `WizardPanel.onChange`.
- **Stable sub-components**: `WizardPanel` is defined outside the `GraphResponseAreaTub` class to prevent React from treating it as a new component type on re-render, which would unmount/remount `GraphEditor` and destroy Cytoscape state.
- **Cytoscape vs Paper.js layering**: Paper.js canvas sits on top of Cytoscape (`zIndex: 10`) with `pointerEvents: none` when not in draw mode, and `pointerEvents: auto` + `cursor: crosshair` when draw mode is active.
- **Arrow direction**: The Cytoscape edge style `target-arrow-shape` is reactively updated whenever `graph.directed` changes.
- **Isomorphism mode**: When `evaluation_type === 'isomorphism'`, `WizardPanel` renders a second `GraphEditor` for the teacher to define the reference graph.
- **Initial emit**: `WizardPanel` emits `onChange` on mount so config is always persisted to the DB even if the teacher never interacts with it.

---

## 7. Supported Evaluation Types

```
isomorphism, connectivity, bipartite, cycle_detection,
graph_coloring, planarity, tree, forest, dag, eulerian,
semi_eulerian, regular, complete, degree_sequence,
subgraph, hamiltonian_path, hamiltonian_cycle, clique_number
```

---

## 8. Dev Notice

Run `yarn dev` to start (runs `build:watch` + `preview` in parallel).

Note: for dev mode only, there is an extra config in `vite.config.ts`:

```ts
root: 'dev', // for dev only
```

Remember to remove it before going to production.