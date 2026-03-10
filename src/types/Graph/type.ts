import { z } from "zod";

// -----------------------------
// Node Schema
// -----------------------------
export const NodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
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
  label: z.string().optional(),
  id: z.string().optional(),
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
// Simplified Graph: for internal editor use (topology + flags merged)
// -----------------------------
export const SimpleGraphSchema = z.object({
  // Nodes as pipe-delimited strings: "id|label|x|y"
  nodes: z.array(z.string()),
  // Edges as pipe-delimited strings: "source|target|weight|label"
  edges: z.array(z.string()),
  directed: z.boolean().default(false),
  weighted: z.boolean().default(false),
  multigraph: z.boolean().default(false),
  evaluation_type: z.array(z.string()).default([]),
});

export type SimpleGraph = z.infer<typeof SimpleGraphSchema>

// -----------------------------
// GraphConfig: teacher-configured params (stored in config, NOT in answer)
// directed, weighted, multigraph, evaluation_type live here
// -----------------------------
export const GraphConfigSchema = z.object({
  directed: z.boolean().default(false),
  weighted: z.boolean().default(false),
  multigraph: z.boolean().default(false),
  // Plain string — backend Pydantic EvaluationParams expects e.g. 'connectivity', not ['connectivity']
  evaluation_type: z.string().default(''),
});

export type GraphConfig = z.infer<typeof GraphConfigSchema>

// -----------------------------
// GraphAnswer: student/teacher answer — topology only (nodes + edges)
// flags (directed, weighted, etc.) come from GraphConfig, not stored here
// -----------------------------
export const GraphAnswerSchema = z.object({
  nodes: z.array(z.string()),
  edges: z.array(z.string()),
});

export type GraphAnswer = z.infer<typeof GraphAnswerSchema>

// Helper functions to convert between Graph and SimpleGraph
export function toSimpleGraph(graph: Graph, evaluationType?: string[]): SimpleGraph {
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
    evaluation_type: evaluationType ?? [],
  };
}

// Merge a GraphAnswer (topology) with a GraphConfig (flags) into a SimpleGraph for the editor
export function graphAnswerToSimple(answer: GraphAnswer, config: GraphConfig): SimpleGraph {
  return {
    nodes: answer.nodes,
    edges: answer.edges,
    directed: config.directed,
    weighted: config.weighted,
    multigraph: config.multigraph,
    // Wrap the string into an array for internal SimpleGraph usage
    evaluation_type: config.evaluation_type ? [config.evaluation_type] : [],
  };
}

// Extract only topology from a SimpleGraph (strips config flags)
export function simpleToAnswer(simple: SimpleGraph): GraphAnswer {
  return {
    nodes: simple.nodes,
    edges: simple.edges,
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
    // evaluation_type lives on SimpleGraph only, not on the rich Graph type
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
