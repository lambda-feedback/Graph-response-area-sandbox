import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape'
import paper from 'paper'
import React, { useEffect, useRef, useState, useCallback } from 'react'

import { Graph, Node, Edge } from './type'
import { useLocalStyles } from './Graph.component.styles'

/* ----------------------------- Graph Editor ----------------------------- */
interface GraphEditorProps {
  graph: Graph
  onChange: (graph: Graph) => void
}

export const GraphEditor: React.FC<GraphEditorProps> = ({ 
  graph, 
  onChange, 
}) => {
  const { classes } = useLocalStyles()

  const cyRef = useRef<Core | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [drawMode, setDrawMode] = useState<boolean>(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [fromNode, setFromNode] = useState<string | null>(null)
  const [nodeCounter, setNodeCounter] = useState<number>(graph.nodes.length)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)

  // Drawing state
  const pathRef = useRef<paper.Path | null>(null)
  const startPointRef = useRef<paper.Point | null>(null)
  const paperProjectRef = useRef<paper.Project | null>(null)

  /* -------------------- Initialize Cytoscape (once) -------------------- */
  useEffect(() => {
    if (!containerRef.current || cyRef.current) return
    
    const cy: Core = cytoscape({
      container: containerRef.current,
      layout: { name: 'preset' },
      style: [
        { 
          selector: 'node', 
          style: { 
            label: 'data(displayLabel)', 
            'text-valign': 'center', 
            'text-halign': 'center', 
            width: 50, 
            height: 50, 
            'background-color': '#fff', 
            'border-width': 1, 
            'border-color': '#555',
            'font-size': '14px'
          } 
        },
        { 
          selector: 'node:selected', 
          style: { 
            'background-color': '#e3f2fd',
            'border-width': 3,
            'border-color': '#1976d2'
          } 
        },
        { 
          selector: 'edge', 
          style: { 
            label: 'data(label)', 
            'curve-style': 'bezier', 
            'target-arrow-shape': graph.directed ? 'triangle' : 'none', 
            'line-color': '#555', 
            'target-arrow-color': '#555',
            'font-size': '12px'
          } 
        },
        { 
          selector: 'edge:selected', 
          style: { 
            'line-color': '#1976d2',
            'target-arrow-color': '#1976d2',
            'width': 3
          } 
        },
        {
          selector: '.edge-source',
          style: {
            'background-color': '#d4edda',
            'border-color': '#155724'
          }
        }
      ],
    })

    cyRef.current = cy


    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [])

  /* -------------------- Update arrow style when directed flag changes -------------------- */
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.style()
      .selector('edge')
      .style({ 'target-arrow-shape': graph.directed ? 'triangle' : 'none' })
      .update()
  }, [graph.directed])

  /* -------------------- Update Node Counter -------------------- */
  useEffect(() => {
    // Find the highest node number to avoid duplicate IDs
    let maxNum = 0
    graph.nodes.forEach(node => {
      const match = node.id.match(/^n(\d+)$/)
      if (match && match[1]) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    })
    setNodeCounter(maxNum + 1)
  }, [graph.nodes])

  /* -------------------- Update Cytoscape from Graph -------------------- */
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    // Get existing elements
    const existingNodeIds = new Set(cy.nodes().map(n => n.id()))
    const existingEdgeIds = new Set(cy.edges().map(e => e.id()))

    // Add/Update nodes
    graph.nodes.forEach((n: Node) => {
      if (existingNodeIds.has(n.id)) {
        // Update existing node
        const node = cy.getElementById(n.id)
        node.data('displayLabel', n.label ?? n.id)
        node.position({ x: n.x ?? node.position().x, y: n.y ?? node.position().y })
      } else {
        // Add new node
        cy.add({ 
          group: 'nodes', 
          data: { id: n.id, displayLabel: n.label ?? n.id }, 
          position: { x: n.x ?? 100, y: n.y ?? 100 } 
        })
      }
    })

    // Remove nodes not in graph
    const graphNodeIds = new Set(graph.nodes.map(n => n.id))
    cy.nodes().forEach(node => {
      if (!graphNodeIds.has(node.id())) {
        node.remove()
      }
    })

    // Add/Update edges
    graph.edges.forEach((e: Edge) => {
      const edgeId = e.id ?? `e-${e.source}-${e.target}`
      if (existingEdgeIds.has(edgeId)) {
        // Update existing edge
        const edge = cy.getElementById(edgeId)
        edge.data('label', e.label ?? '')
      } else {
        // Add new edge
        cy.add({ 
          group: 'edges', 
          data: { 
            id: edgeId, 
            source: e.source, 
            target: e.target, 
            label: e.label ?? '' 
          } 
        })
      }
    })

    // Remove edges not in graph
    const graphEdgeIds = new Set(graph.edges.map(e => e.id ?? `e-${e.source}-${e.target}`))
    cy.edges().forEach(edge => {
      if (!graphEdgeIds.has(edge.id())) {
        edge.remove()
      }
    })
  }, [graph])

  /* -------------------- Sync to Graph -------------------- */
  const syncToGraph = useCallback((): void => {
    const cy = cyRef.current
    if (!cy) return

    const nodes: Node[] = cy.nodes().map((n) => ({
      id: n.id(),
      label: n.data('displayLabel') as string,
      x: n.position().x,
      y: n.position().y,
      metadata: {},
    }))

    const edges: Edge[] = cy.edges().map((e) => ({
      id: e.id(),
      source: e.source().id(),
      target: e.target().id(),
      label: (e.data('label') as string) ?? '',
      metadata: {},
      weight: 0
    }))

    onChange({ ...graph, nodes, edges })
  }, [graph, onChange])

  /* -------------------- Add Node -------------------- */
  const addNode = useCallback((): void => {
    const cy = cyRef.current
    if (!cy) return

    const id = `n${nodeCounter}`
    cy.add({ 
      group: 'nodes', 
      data: { id, displayLabel: id }, 
      position: { 
        x: 100 + Math.random() * 300, 
        y: 100 + Math.random() * 300 
      } 
    })
    setNodeCounter(nodeCounter + 1)
    syncToGraph()
  }, [nodeCounter, syncToGraph])

  const addNodeWithPos = useCallback((x: number, y: number): void => {
    const cy = cyRef.current
    if (!cy) return

    const id = `n${nodeCounter}`
    cy.add({ 
      group: 'nodes', 
      data: { id, displayLabel: id }, 
      position: { x, y } 
    })
    setNodeCounter(nodeCounter + 1)
    syncToGraph()
  }, [nodeCounter, syncToGraph])

  /* -------------------- Paper.js Setup -------------------- */
  useEffect(() => {
    const canvas = drawCanvasRef.current
    if (!canvas || paperProjectRef.current) return

    // Create a new Paper.js project for this instance
    const paperProject = new paper.Project(canvas)
    paperProjectRef.current = paperProject


    // Setup canvas size
    const updateCanvasSize = () => {
      const container = containerRef.current
      if (!container || !canvas) return
      
      const { width, height } = container.getBoundingClientRect()
      
      // Set canvas dimensions
      canvas.width = width
      canvas.height = height
      
      // Update Paper.js view
      if (paperProjectRef.current) {
        paperProjectRef.current.view.viewSize = new paper.Size(width, height)
        paperProjectRef.current.view.update()
      }
    }

    updateCanvasSize()
    
    // Handle resizing
    const resizeObserver = new ResizeObserver(updateCanvasSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      if (paperProjectRef.current) {
        paperProjectRef.current.remove()
        paperProjectRef.current = null
      }
    }
  }, [])

  /* -------------------- Drawing Handlers -------------------- */
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawMode || !paperProjectRef.current) return
    
    // Activate this project before drawing
    paperProjectRef.current.activate()
    
    e.preventDefault()
    e.stopPropagation()
    
    const rect = drawCanvasRef.current?.getBoundingClientRect()
    if (!rect || !drawCanvasRef.current) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Clear any existing paths from previous drawings
    if (pathRef.current) {
      pathRef.current.remove()
    }
    
    // Create new path
    pathRef.current = new paper.Path()
    pathRef.current.strokeColor = new paper.Color('red')
    pathRef.current.strokeWidth = 3
    
    startPointRef.current = new paper.Point(x, y)
    pathRef.current.add(startPointRef.current)
    
    setIsDrawing(true)
  }, [drawMode])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawMode || !isDrawing || !pathRef.current) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const rect = drawCanvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    pathRef.current.add(new paper.Point(x, y))
    // console.log(pathRef)
  }, [drawMode, isDrawing])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawMode || !isDrawing || !pathRef.current || !startPointRef.current) {
      setIsDrawing(false)
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    const rect = drawCanvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const endX = e.clientX - rect.left
    const endY = e.clientY - rect.top
    const endPoint = new paper.Point(endX, endY)
    
    // Analyze the drawing
    const bounds = pathRef.current.bounds
    const dx = bounds.width
    const dy = bounds.height
    const diameter = Math.max(dx, dy)
    const strokeLength = pathRef.current.length
    const distance = startPointRef.current.getDistance(endPoint)
    
    console.log('Drawing analysis:', {
      diameter,
      strokeLength,
      distance,
      startPoint: startPointRef.current,
      endPoint,
      bounds
    })
    
    // Circle detection - relaxed criteria
    const circumference = Math.PI * diameter
    const isCircle = diameter > 20 && 
                    strokeLength > circumference * 0.3 && 
                    distance < diameter * 0.5
    
    if (isCircle) {
      console.log('Detected circle, adding node at:', bounds.center)
      // Add node at circle center
      addNodeWithPos(bounds.center.x, bounds.center.y)
    } else {
      console.log('Detected line, finding closest nodes')
      // Find closest nodes to start and end
      const cy = cyRef.current
      if (cy) {
        const findClosestNode = (
          pointX: number,
          pointY: number
        ): NodeSingular | null => {
          let minDist = Infinity
          let closestNode: NodeSingular | null = null

          cy.nodes().forEach((node) => {
            // Use rendered position (viewport coordinates) instead of graph position
            const pos = node.renderedPosition()
            const dist = Math.hypot(pos.x - pointX, pos.y - pointY)
            console.log(`  Node ${node.id()}: rendered pos (${pos.x}, ${pos.y}), dist: ${dist}`)
            if (dist < minDist) {
              minDist = dist
              closestNode = node
            }
          })

          console.log(`  Closest node at distance ${minDist}, threshold: 75`)
          return minDist < 75 ? closestNode : null // Increased threshold to 75
        }
        
        console.log('Start point:', startPointRef.current.x, startPointRef.current.y)
        console.log('End point:', endPoint.x, endPoint.y)
        
        const startNode = findClosestNode(startPointRef.current.x, startPointRef.current.y)
        const endNode   = findClosestNode(endPoint.x, endPoint.y)

        console.log('Found nodes:', {
          startNode: startNode?.id(),
          startDist: startNode ? Math.hypot(startNode.position().x - startPointRef.current.x, startNode.position().y - startPointRef.current.y) : 'N/A',
          endNode: endNode?.id(),
          endDist: endNode ? Math.hypot(endNode.position().x - endPoint.x, endNode.position().y - endPoint.y) : 'N/A',
          totalNodes: cy.nodes().length
        })

        if (startNode !== null && endNode !== null && startNode.id() !== endNode.id()) {
          console.log('✓ Adding edge between:', startNode.id(), endNode.id())
          cy.add({
            group: 'edges',
            data: {
              id: `e-${startNode.id()}-${endNode.id()}-${Date.now()}`,
              source: startNode.id(),
              target: endNode.id(),
              label: '',
            },
          })
          syncToGraph()
        } else {
          console.log('✗ Cannot create edge:', {
            hasStartNode: startNode !== null,
            hasEndNode: endNode !== null,
            sameNode: startNode?.id() === endNode?.id()
          })
        }
      }
    }
    
    // Don't remove the path immediately - keep it visible for a moment
    // setTimeout(() => {
      if (pathRef.current) {
        pathRef.current.remove()
        pathRef.current = null
      }
      startPointRef.current = null
      setIsDrawing(false)
    // }, 500) // Keep stroke visible for 500ms
  }, [drawMode, isDrawing, addNodeWithPos, syncToGraph])

  const handlePointerLeave = useCallback(() => {
    if (pathRef.current) {
      pathRef.current.remove()
      pathRef.current = null
    }
    startPointRef.current = null
    setIsDrawing(false)
  }, [])

  /* -------------------- Cytoscape Selection Handlers -------------------- */
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    const tapNode = (e: cytoscape.EventObject) => {
      const node = e.target as NodeSingular
      
      if (drawMode) {
        if (!fromNode) {
          setFromNode(node.id())
          node.addClass('edge-source')
        } else {
          cy.add({ 
            group: 'edges', 
            data: { 
              id: `e-${fromNode}-${node.id()}-${Date.now()}`, 
              source: fromNode, 
              target: node.id(), 
              label: '' 
            } 
          })
          cy.nodes().removeClass('edge-source')
          setDrawMode(false)
          setFromNode(null)
          syncToGraph()
        }
        return
      }
      
      setSelectedNodeId(node.id())
      setSelectedEdgeId(null)
    }

    const tapEdge = (e: cytoscape.EventObject) => {
      const edge = e.target as EdgeSingular
      setSelectedEdgeId(edge.id())
      setSelectedNodeId(null)
    }

    const tapBlank = (e: cytoscape.EventObject) => {
      // Only clear selection if we clicked the background (not a node or edge)
      if (e.target === cy) {
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
      }
    }

    cy.on('tap', 'node', tapNode)
    cy.on('tap', 'edge', tapEdge)
    cy.on('tap', tapBlank)

    return () => {
      cy.off('tap', 'node', tapNode)
      cy.off('tap', 'edge', tapEdge)
      cy.off('tap', tapBlank)
    }
  }, [drawMode, fromNode, syncToGraph])

  /* -------------------- Render -------------------- */
  // Get fresh node/edge references from IDs
  const selectedNode = selectedNodeId && cyRef.current ? cyRef.current.$id(selectedNodeId) : null
  const selectedEdge = selectedEdgeId && cyRef.current ? cyRef.current.$id(selectedEdgeId) : null
  
  return (
    <div className={classes.container}>
      {/* -------------------- Item Properties Panel -------------------- */}
      <div className={classes.panel}>
        <div className={classes.panelTitle}>Item Properties</div>

        <button 
          className={classes.addButton} 
          onClick={addNode}
        >
          + Add Node
        </button>
        
        <button 
          className={classes.addButton} 
          onClick={() => cyRef.current?.fit(undefined, 40)}
        >
          Fit to Screen
        </button>
        
        <button 
          className={classes.addButton} 
          onClick={() => { 
            setDrawMode((m) => !m); 
            setFromNode(null); 
            cyRef.current?.nodes().removeClass('edge-source');
            
            // Clear any existing drawing when toggling draw mode
            if (pathRef.current) {
              pathRef.current.remove()
              pathRef.current = null
            }
          }}
          style={{ 
            backgroundColor: drawMode ? '#ff4444' : '#4CAF50',
            color: 'white',
            borderColor: drawMode ? '#ff4444' : '#4CAF50'
          }}
        >
          {drawMode ? '✗ Cancel Draw Mode' : '✏️ Enable Draw Mode'}
        </button>

        {drawMode && (
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            fontStyle: 'italic',
            padding: '8px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px'
          }}>
            <strong>Draw Mode Active:</strong><br/>
            • Draw a circle to create a node<br/>
            • Draw a line between nodes to create an edge<br/>
            • Or click nodes to connect them
          </div>
        )}

        {selectedNode && selectedNode.length > 0 ? (
          <>
            <div style={{ 
              padding: '8px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '4px',
              marginBottom: '8px'
            }}>
              <strong>Selected Node: {selectedNode.id()}</strong>
            </div>
            <div className={classes.field}>
              <label>Display Name</label>
              <input
                className={classes.inputField}
                value={selectedNode.data('displayLabel') ?? ''}
                onChange={(e) => { 
                  selectedNode.data('displayLabel', e.target.value); 
                  syncToGraph() 
                }}
              />
            </div>
            <button 
              className={classes.deleteButton} 
              onClick={() => { 
                selectedNode.remove(); 
                setSelectedNodeId(null); 
                syncToGraph() 
              }}
            >
              🗑️ Delete Node
            </button>
          </>
        ) : selectedNodeId ? (
          <div style={{ padding: '8px', color: 'red' }}>
            Node "{selectedNodeId}" not found in graph
          </div>
        ) : null}

        {!selectedNodeId && !selectedEdgeId && (
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            fontStyle: 'italic',
            padding: '8px'
          }}>
            Click a node or edge to select it
          </div>
        )}

        {selectedEdge && selectedEdge.length > 0 ? (
          <>
            <div style={{ 
              padding: '8px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '4px',
              marginBottom: '8px'
            }}>
              <strong>Selected Edge</strong>
            </div>
            <div className={classes.field}>
              <label>Edge Label</label>
              <input
                className={classes.inputField}
                value={selectedEdge.data('label') ?? ''}
                onChange={(e) => { 
                  selectedEdge.data('label', e.target.value); 
                  syncToGraph() 
                }}
              />
            </div>
            <button 
              className={classes.deleteButton} 
              onClick={() => { 
                selectedEdge.remove(); 
                setSelectedEdgeId(null); 
                syncToGraph() 
              }}
            >
              🗑️ Delete Edge
            </button>
          </>
        ) : null}

      </div>

      {/* -------------------- Cytoscape + Paper Canvas -------------------- */}
      <div className={classes.cyWrapper}>
        <div 
          ref={containerRef} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            zIndex: 1
          }} 
        />
        <canvas 
          ref={drawCanvasRef} 
          className={classes.drawCanvas}
          style={{ 
            pointerEvents: drawMode ? 'auto' : 'none',
            cursor: drawMode ? 'crosshair' : 'default'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </div>
    </div>
  )
}