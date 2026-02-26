import { z } from "zod";

// -----------------------------
// Node Schema
// -----------------------------
export const NodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  partition: z.union([z.literal(0), z.literal(1)]).optional(),
  color: z.number().optional(),
  weight: z.number().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export type Node = z.infer<typeof NodeSchema>

// -----------------------------
// Edge Schema
// -----------------------------
export const EdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  weight: z.number().optional().default(1),
  capacity: z.number().optional(),
  flow: z.number().optional(),
  label: z.string().optional(),
  id: z.string().optional(),
  color: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export type Edge = z.infer<typeof EdgeSchema>

// -----------------------------
// Graph Schema
// -----------------------------
export const GraphSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema).default([]),
  directed: z.boolean().default(false),
  weighted: z.boolean().default(false),
  multigraph: z.boolean().default(false),
  metadata: z.record(z.any()).optional().default({}),
});

export type Graph = z.infer<typeof GraphSchema>

// -----------------------------
// Simplified Graph: for backend communication (like FSA)
// -----------------------------
export const SimpleGraphSchema = z.object({
  // Nodes as pipe-delimited strings: "id|label|x|y"
  nodes: z.array(z.string()),
  // Edges as pipe-delimited strings: "source|target|weight|label"
  edges: z.array(z.string()),
  directed: z.boolean().default(false),
  weighted: z.boolean().default(false),
  multigraph: z.boolean().default(false),
});

export type SimpleGraph = z.infer<typeof SimpleGraphSchema>

// Helper functions to convert between Graph and SimpleGraph
export function toSimpleGraph(graph: Graph): SimpleGraph {
  return {
    nodes: graph.nodes.map(n => 
      `${n.id}|${n.label || ''}|${n.x || 0}|${n.y || 0}`
    ),
    edges: graph.edges.map(e => 
      `${e.source}|${e.target}|${e.weight || 1}|${e.label || ''}`
    ),
    directed: graph.directed,
    weighted: graph.weighted,
    multigraph: graph.multigraph,
  };
}

export function fromSimpleGraph(simple: SimpleGraph): Graph {
  return {
    nodes: simple.nodes.map(str => {
      const [id = '', label = '', xStr = '0', yStr = '0'] = str.split('|');
      return {
        id,
        label: label || undefined,
        x: parseFloat(xStr) || 0,
        y: parseFloat(yStr) || 0,
        metadata: {},
      };
    }),
    edges: simple.edges.map(str => {
      const [source = '', target = '', weightStr = '1', label = ''] = str.split('|');
      return {
        source,
        target,
        weight: parseFloat(weightStr) || 1,
        label: label || undefined,
        metadata: {},
      };
    }),
    directed: simple.directed,
    weighted: simple.weighted,
    multigraph: simple.multigraph,
    metadata: {},
  };
}

// -----------------------------
// Compressed Graph: JSON-stringified nodes/edges
// -----------------------------
export const CompressedGraphSchema = z.object({
  nodes: z.array(z.string()), // JSON.stringify(nodes)
  edges: z.array(z.string()), // JSON.stringify(edges)
  directed: z.boolean().default(false),
  weighted: z.boolean().default(false),
  multigraph: z.boolean().default(false),
  name: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export type CompressedGraph = z.infer<typeof CompressedGraphSchema>

// -----------------------------
// Example: compress function
// -----------------------------
export function compressGraph(graph: z.infer<typeof GraphSchema>) {
  return {
    ...graph,
    nodes: JSON.stringify(graph.nodes),
    edges: JSON.stringify(graph.edges),
  };
}

// -----------------------------
// Validation & Feedback Types
// -----------------------------
export enum CheckPhase {
  Idle = 'idle',
  Evaluated = 'evaluated',
}

export interface ValidationError {
  type: 'error' | 'warning'
  message: string
  field?: string
}

export interface GraphFeedback {
  valid: boolean
  errors: ValidationError[]
  phase: CheckPhase
}

export const GraphFeedbackSchema = z.object({
  valid: z.boolean(),
  errors: z.array(
    z.object({
      type: z.enum(['error', 'warning']),
      message: z.string(),
      field: z.string().optional(),
    })
  ),
  phase: z.nativeEnum(CheckPhase),
})
