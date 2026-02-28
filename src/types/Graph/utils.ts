import { Graph, SimpleGraph } from './type'

// BackendGraph type: what backend expects
export interface BackendGraph {
  nodes: Array<{
    id: string;
    label?: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight?: number;
    label?: string;
  }>;
  directed: boolean;
  weighted: boolean;
  multigraph: boolean;
}

export class GraphConverter {
  /**
   * Convert from frontend Graph to flattened SimpleGraph
   */
  static toSimple(graph: Graph): SimpleGraph {
    return {
      nodes: graph.nodes.map(n => `${n.id}|${n.label || ''}|${n.x || 0}|${n.y || 0}`),
      edges: graph.edges.map(e => `${e.source}|${e.target}|${e.weight || 1}|${e.label || ''}`),
      directed: graph.directed,
      weighted: graph.weighted,
      multigraph: graph.multigraph,
      evaluation_type: [],
    }
  }

  /**
   * Convert from flattened SimpleGraph to backend format
   */
  static toBackend(simple: SimpleGraph): BackendGraph {
    return {
      nodes: simple.nodes.map(nodeStr => {
        const [id = '', label = '', x = '0', y = '0'] = nodeStr.split('|');
        return {
          id,
          label: label || undefined,
          position: { x: parseFloat(x), y: parseFloat(y) }
        }
      }),
      edges: simple.edges.map(edgeStr => {
        const [source = '', target = '', weight = '1', label = ''] = edgeStr.split('|');
        return {
          source,
          target,
          weight: parseFloat(weight),
          label: label || undefined
        }
      }),
      directed: simple.directed,
      weighted: simple.weighted,
      multigraph: simple.multigraph
    }
  }

  /**
   * Convert from SimpleGraph back to frontend Graph
   */
  static fromSimple(simple: SimpleGraph): Graph {
    return {
      nodes: simple.nodes.map(nodeStr => {
        const [id = '', label = '', x = '0', y = '0'] = nodeStr.split('|');
        return {
          id,
          label: label || undefined,
          x: parseFloat(x),
          y: parseFloat(y),
          metadata: {}
        }
      }),
      edges: simple.edges.map((edgeStr, idx) => {
        const [source = '', target = '', weight = '1', label = ''] = edgeStr.split('|');
        return {
          id: `e-${source}-${target}-${idx}`,
          source,
          target,
          weight: parseFloat(weight),
          label: label || undefined,
          metadata: {}
        }
      }),
      directed: simple.directed,
      weighted: simple.weighted,
      multigraph: simple.multigraph,
      metadata: {}
    }
  }
}
