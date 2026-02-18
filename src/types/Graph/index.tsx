import {
  BaseResponseAreaProps,
  BaseResponseAreaWizardProps,
} from '../base-props.type'
import { ResponseAreaTub } from '../response-area-tub'

import { GraphEditor } from './Graph.component'
import { Graph, CompressedGraph, CompressedGraphSchema, GraphFeedback, CheckPhase } from './type'
import { Edge, Node } from './type'
import { validateGraph } from './validateGraph'

export class GraphResponseAreaTub extends ResponseAreaTub {
  public readonly responseType = 'HANDDRAWNGRAPH'
  public readonly displayWideInput = true

  protected answerSchema = CompressedGraphSchema
  protected configSchema = CompressedGraphSchema

  // Correct answer for grading (teacher sets in "answer" panel)
  protected answer: CompressedGraph = {
    nodes: [],
    edges: [],
    directed: false,
    weighted: false,
    multigraph: false,
    name:'',
    metadata: {},
  }

  // Initial state shown to students (teacher sets in "preview" panel)
  protected config: CompressedGraph = {
    nodes: [],
    edges: [],
    directed: false,
    weighted: false,
    multigraph: false,
    name:'',
    metadata: {},
  }

  private previewFeedback: GraphFeedback | null = null
  private phase: CheckPhase = CheckPhase.Idle

  // Temporarily test with delegateFeedback = true
  public readonly delegateFeedback = true
  public readonly delegateLivePreview = true

  constructor() {
    super()
    console.log('[Graph Constructor] GraphResponseAreaTub instantiated')
    console.log('[Graph Constructor] customCheck method:', this.customCheck)
    console.log('[Graph Constructor] typeof customCheck:', typeof this.customCheck)
  }

  initWithDefault = () => {
    this.config = {
      nodes: [],
      edges: [],
      directed: false,
      weighted: false,
      multigraph: false,
      name:'',
      metadata: {},
    }
    this.answer = {
      nodes: [],
      edges: [],
      directed: false,
      weighted: false,
      multigraph: false,
      name:'',
      metadata: {},
    }
  }

  initWithConfig = () => {
    // Called by the parent app when initialising with config only (student view)
    // config is already extracted via extractConfig — nothing extra needed
  }

  // Override extractConfig to handle missing/invalid config gracefully
  protected extractConfig = (provided: any): void => {
    if (!provided || typeof provided !== 'object') {
      // No config provided - use empty graph as default
      this.config = {
        nodes: [],
        edges: [],
        directed: false,
        weighted: false,
        multigraph: false,
        name:'',
        metadata: {},
      }
      return
    }

    const parsedConfig = this.configSchema?.safeParse(provided)
    if (!parsedConfig || !parsedConfig.success) {
      // Invalid config - use empty graph as default
      this.config = {
        nodes: [],
        edges: [],
        directed: false,
        weighted: false,
        multigraph: false,
        name:'',
        metadata: {},
      }
      return
    }

    this.config = parsedConfig.data
  }

  // Override extractAnswer to properly store student's answer
  protected extractAnswer = (provided: any): void => {
    console.log('[Graph extractAnswer] Called with:', provided)
    
    if (!provided || typeof provided !== 'object') {
      console.log('[Graph extractAnswer] No valid answer provided')
      return
    }

    const parsedAnswer = this.answerSchema.safeParse(provided)
    if (!parsedAnswer.success) {
      console.log('[Graph extractAnswer] Failed to parse answer:', parsedAnswer.error)
      return
    }

    console.log('[Graph extractAnswer] Successfully extracted answer:', parsedAnswer.data)
    this.answer = parsedAnswer.data
  }

  /* -------------------- Custom Check -------------------- */
  customCheck = (): boolean => {
    console.log('[Graph customCheck] Called')
    console.log('[Graph customCheck] this.answer:', this.answer)
    
    // Validate the student's answer before submission
    if (!this.answer || this.answer.nodes.length === 0) {
      console.log('[Graph customCheck] No answer or empty graph - returning false')
      return false // No answer to submit
    }

    // Decompress the graph (convert stringified nodes/edges back to objects)
    const decompressedGraph: Graph = {
      nodes: this.answer.nodes.map((e) => JSON.parse(e)),
      edges: this.answer.edges.map((e) => JSON.parse(e)),
      directed: this.answer.directed,
      weighted: this.answer.weighted,
      multigraph: this.answer.multigraph,
      name: this.answer.name || '',
      metadata: this.answer.metadata || {},
    }

    console.log('[Graph customCheck] Decompressed graph:', decompressedGraph)

    // Validate the decompressed graph
    const feedback = validateGraph(decompressedGraph)
    
    console.log('[Graph customCheck] Validation feedback:', feedback)
    
    // Check if there are any errors
    const hasErrors = feedback.errors.filter(e => e.type === 'error').length > 0
    
    console.log('[Graph customCheck] Has errors:', hasErrors)
    console.log('[Graph customCheck] Returning:', !hasErrors)
    
    // Return true if valid, false if there are errors
    return !hasErrors
  }

  /* -------------------- Input -------------------- */
  InputComponent = (props: BaseResponseAreaProps) => {
    console.log('[Graph InputComponent] Rendering with props.answer:', props.answer)
    console.log('[Graph InputComponent] Current this.answer:', this.answer)
    
    // In teacher preview mode, edit the initial config
    // In student mode, start with config and save to props.answer
    const isTeacherPreview = props.isTeacherMode && props.hasPreview
    
    // Determine the source of truth for the graph data
    const initialGraph: CompressedGraph = (() => {
      if (props.answer) {
        // If props.answer exists, use it (parent component's state)
        const parsed = this.answerSchema.safeParse(props.answer)
        if (parsed.success) {
          // Update this.answer so customCheck can access it
          console.log('[Graph InputComponent] Updating this.answer with parsed data:', parsed.data)
          this.answer = parsed.data
          return parsed.data
        } else {
          console.log('[Graph InputComponent] Failed to parse props.answer:', parsed.error)
        }
      } else {
        console.log('[Graph InputComponent] No props.answer provided')
      }
      
      // Fallback to config (initial state) or answer (for teacher answer panel)
      const fallback = isTeacherPreview ? this.config : (this.config ?? this.answer)
      console.log('[Graph InputComponent] Using fallback:', fallback)
      return fallback
    })()

    /* ---------- Extract submitted feedback ---------- */
    const submittedFeedback: GraphFeedback | null = (() => {
      const raw = props.feedback?.feedback
      if (!raw) return null

      try {
        const jsonPart = raw.split('<br>')[1]?.trim()
        if (!jsonPart) return null
        return JSON.parse(jsonPart)
      } catch {
        return null
      }
    })()

    /* ---------- Effective feedback ---------- */
    const effectiveFeedback = this.previewFeedback ?? submittedFeedback

    // Decompress to Graph format for editor
    const graph: Graph = {
      nodes: initialGraph.nodes.map((e) => JSON.parse(e)),
      edges: initialGraph.edges.map((e) => JSON.parse(e)),
      directed: initialGraph.directed,
      weighted: initialGraph.weighted,
      multigraph: initialGraph.multigraph,
      name: initialGraph.name,
      metadata: initialGraph.metadata,
    }

    return (
      <GraphEditor
        key={isTeacherPreview ? "teacher-preview-editor" : "student-input-editor"}
        graph={graph}
        feedback={effectiveFeedback}
        phase={this.phase}
        onChange={(val: Graph) => {
          console.log('[Graph onChange] Called with graph:', val)
          
          const compressed: CompressedGraph = {
            nodes: val.nodes.map((n) => JSON.stringify(n)),
            edges: val.edges.map((e) => JSON.stringify(e)),
            directed: val.directed,
            weighted: val.weighted,
            multigraph: val.multigraph,
            name: val.name,
            metadata: val.metadata,
          }

          console.log('[Graph onChange] Compressed:', compressed)

          if (isTeacherPreview) {
            // Teacher is editing the initial config in preview section
            console.log('[Graph onChange] Updating this.config')
            this.config = compressed
          } else {
            // Student is working - save their current answer for validation
            console.log('[Graph onChange] Updating this.answer')
            this.answer = compressed
          }

          console.log('[Graph onChange] After update, this.answer:', this.answer)

          // Validate the graph
          const preview = validateGraph(val)

          if (preview.errors.filter((e) => e.type === 'error').length > 0) {
            this.previewFeedback = preview
            this.phase = CheckPhase.PreviewError
          } else {
            this.previewFeedback = null
            this.phase = CheckPhase.Idle
          }

          console.log('[Graph onChange] Calling props.handleChange with compressed data')
          props.handleChange(compressed)
          console.log('[Graph onChange] props.handleChange called')
        }}
      />
    )
  }

  /* -------------------- Wizard -------------------- */
  WizardComponent = (props: BaseResponseAreaWizardProps) => {
    // Wizard shows correct answer for grading
    // The separate "Response Area Preview" section handles the initial state (config)
    const answerGraph: Graph = {
      nodes: this.answer.nodes.map((e) => JSON.parse(e)),
      edges: this.answer.edges.map((e) => JSON.parse(e)),
      directed: this.answer.directed,
      weighted: this.answer.weighted,
      multigraph: this.answer.multigraph,
      name: this.answer.name,
      metadata: this.answer.metadata,
    }

    return (
      <GraphEditor
        key="wizard-answer-editor"
        graph={answerGraph}
        feedback={null}
        phase={CheckPhase.Evaluated}
        onChange={(val: Graph) => {
          const compressed: CompressedGraph = {
            nodes: val.nodes.map((n: Node) => JSON.stringify(n)),
            edges: val.edges.map((e: Edge) => JSON.stringify(e)),
            directed: val.directed,
            weighted: val.weighted,
            multigraph: val.multigraph,
            name: val.name,
            metadata: val.metadata,
          }

          this.answer = compressed

          props.handleChange({
            responseType: this.responseType,
            config: this.config,
            answer: compressed,
          })
        }}
      />
    )
  }
}
