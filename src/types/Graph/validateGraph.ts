import { Graph } from './type'
import { GraphFeedback, ValidationError, CheckPhase } from './type'

/**
 * Validates a graph for common errors
 */
export function validateGraph(graph: Graph): GraphFeedback {
  const errors: ValidationError[] = []

  // Check if graph has nodes
  if (graph.nodes.length === 0) {
    errors.push({
      type: 'error',
      message: 'Graph must have at least one node',
      field: 'nodes',
    })
  }

  // Check for duplicate node IDs
  const nodeIds = new Set<string>()
  const duplicateIds = new Set<string>()
  
  graph.nodes.forEach((node) => {
    if (nodeIds.has(node.id)) {
      duplicateIds.add(node.id)
    }
    nodeIds.add(node.id)
  })

  if (duplicateIds.size > 0) {
    errors.push({
      type: 'error',
      message: `Duplicate node IDs found: ${Array.from(duplicateIds).join(', ')}`,
      field: 'nodes',
    })
  }

  // Check for edges with invalid node references
  graph.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.source)) {
      errors.push({
        type: 'error',
        message: `Edge ${index + 1}: source node "${edge.source}" does not exist`,
        field: 'edges',
      })
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({
        type: 'error',
        message: `Edge ${index + 1}: target node "${edge.target}" does not exist`,
        field: 'edges',
      })
    }
  })

  // Check for self-loops (if not allowed)
  const selfLoops = graph.edges.filter((edge) => edge.source === edge.target)
  if (selfLoops.length > 0) {
    errors.push({
      type: 'warning',
      message: `Graph contains ${selfLoops.length} self-loop(s)`,
      field: 'edges',
    })
  }

  // Check if weighted graph has weights on all edges
  if (graph.weighted) {
    const edgesWithoutWeight = graph.edges.filter(
      (edge) => edge.weight === undefined || edge.weight === null
    )
    if (edgesWithoutWeight.length > 0) {
      errors.push({
        type: 'warning',
        message: `${edgesWithoutWeight.length} edge(s) are missing weights in a weighted graph`,
        field: 'edges',
      })
    }
  }

  // Check for disconnected nodes (nodes with no edges)
  const connectedNodes = new Set<string>()
  graph.edges.forEach((edge) => {
    connectedNodes.add(edge.source)
    connectedNodes.add(edge.target)
  })

  const disconnectedNodes = graph.nodes.filter(
    (node) => !connectedNodes.has(node.id)
  )

  if (disconnectedNodes.length > 0 && graph.edges.length > 0) {
    errors.push({
      type: 'warning',
      message: `${disconnectedNodes.length} node(s) are not connected to the graph`,
      field: 'nodes',
    })
  }

  return {
    valid: errors.filter((e) => e.type === 'error').length === 0,
    errors,
    phase: CheckPhase.Idle,
  }
}
