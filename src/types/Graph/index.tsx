import React, { useState, useEffect } from 'react'
import {
  BaseResponseAreaProps,
  BaseResponseAreaWizardProps,
} from '../base-props.type'
import { ResponseAreaTub } from '../response-area-tub'

import { ConfigPanel } from './components/ConfigPanel'
import { GraphEditor } from './Graph.component'
import {
  Graph,
  GraphConfig,
  GraphConfigSchema,
  GraphAnswer,
  GraphAnswerSchema,
  toSimpleGraph,
  fromSimpleGraph,
  graphAnswerToSimple,
  simpleToAnswer,
} from './type'

const DEFAULT_CONFIG: GraphConfig = {
  directed: false,
  weighted: false,
  multigraph: false,
  evaluation_type: '',
}

const DEFAULT_ANSWER: GraphAnswer = {
  nodes: [],
  edges: [],
}

export class GraphResponseAreaTub extends ResponseAreaTub {
  public readonly responseType = 'HANDDRAWNGRAPH'
  public readonly displayWideInput = true

  protected answerSchema = GraphAnswerSchema
  protected configSchema = GraphConfigSchema

  protected answer: GraphAnswer = { ...DEFAULT_ANSWER }
  protected config: GraphConfig = { ...DEFAULT_CONFIG }

  public readonly delegateFeedback = true

  constructor() {
    super()
  }

  initWithDefault = () => {
    this.config = { ...DEFAULT_CONFIG }
    this.answer = { ...DEFAULT_ANSWER }
  }

  initWithConfig = () => {
    // Called by the parent app when initialising with config only (student view)
    // config is already extracted via extractConfig — nothing extra needed
  }

  // Override extractConfig to handle missing/invalid config gracefully
  protected extractConfig = (provided: any): void => {
    if (!provided || typeof provided !== 'object') {
      this.config = { directed: false, weighted: false, multigraph: false, evaluation_type: '' }
      return
    }

    const parsedConfig = this.configSchema?.safeParse(provided)
    if (!parsedConfig || !parsedConfig.success) {
      // Legacy migration: config was a SimpleGraph — extract just the flags
      // evaluation_type may be a legacy string[] — take first element
      const legacyEval = provided.evaluation_type
      this.config = {
        directed: provided.directed ?? false,
        weighted: provided.weighted ?? false,
        multigraph: provided.multigraph ?? false,
        evaluation_type: Array.isArray(legacyEval)
          ? (legacyEval[0] ?? '')
          : (legacyEval ?? ''),
      }
      return
    }

    this.config = parsedConfig.data
  }

  // Override extractAnswer — answer may be flattened (nodes + edges + config flags)
  protected extractAnswer = (provided: any): void => {
    if (!provided || typeof provided !== 'object') return

    if (Array.isArray(provided.nodes) && Array.isArray(provided.edges)) {
      this.answer = { nodes: provided.nodes, edges: provided.edges }
      // Always read config flags from the flattened answer
      const legacyEval = provided.evaluation_type
      this.config = {
        directed: provided.directed ?? false,
        weighted: provided.weighted ?? false,
        multigraph: provided.multigraph ?? false,
        evaluation_type: Array.isArray(legacyEval)
          ? (legacyEval[0] ?? '')
          : (legacyEval ?? ''),
      }
    }
  }

  /* -------------------- Custom Check -------------------- */
  customCheck = (): boolean => {
    return !!(this.answer && this.answer.nodes.length > 0)
  }

  /* -------------------- Input -------------------- */
  InputComponent = (props: BaseResponseAreaProps) => {
    const isTeacherPreview = props.isTeacherMode && props.hasPreview

    // Resolve answer (topology only) — props.answer is the parent's managed state
    const resolvedAnswer: GraphAnswer = (() => {
      if (props.answer) {
        const parsed = GraphAnswerSchema.safeParse(props.answer)
        if (parsed.success) return parsed.data
        // Legacy SimpleGraph in answer
        const leg = props.answer as any
        if (Array.isArray(leg.nodes) && Array.isArray(leg.edges))
          return { nodes: leg.nodes, edges: leg.edges }
      }
      return this.answer
    })()

    // Resolve config — read from flattened answer first, then props.config, then tub state
    const resolvedConfig: GraphConfig = (() => {
      // Config flags may be flattened into the answer
      const ans = props.answer as any
      if (ans && (typeof ans.directed !== 'undefined' || typeof ans.evaluation_type !== 'undefined')) {
        const eval_ = ans.evaluation_type
        return {
          directed: ans.directed ?? false,
          weighted: ans.weighted ?? false,
          multigraph: ans.multigraph ?? false,
          evaluation_type: Array.isArray(eval_) ? (eval_[0] ?? '') : (eval_ ?? ''),
        }
      }
      if (props.config) {
        const parsed = GraphConfigSchema.safeParse(props.config)
        if (parsed.success) return parsed.data
        const leg = props.config as any
        return {
          directed: leg.directed ?? false,
          weighted: leg.weighted ?? false,
          multigraph: leg.multigraph ?? false,
          evaluation_type: leg.evaluation_type ?? '',
        }
      }
      return this.config
    })()

    // Config is read-only here — set exclusively via WizardComponent.
    // InputComponent only carries answer changes via props.handleChange.
    const graph: Graph = fromSimpleGraph(graphAnswerToSimple(resolvedAnswer, resolvedConfig))
    return (
      <GraphEditor
        key={isTeacherPreview ? 'teacher-preview' : 'student-input'}
        graph={graph}
        onChange={(val: Graph) => {
          const newAnswer = simpleToAnswer(toSimpleGraph(val))
          this.answer = newAnswer
          props.handleChange(newAnswer)
        }}
      />
    )
  }

  /* -------------------- Wizard -------------------- */
  WizardComponent = (props: BaseResponseAreaWizardProps) => {
    return (
      <WizardPanel
        initialConfig={this.config}
        initialAnswer={this.answer}
        onChange={(config, answer) => {
          this.config = config
          this.answer = answer
          // Flatten config fields into the answer — backend reads from answer, not config
          const flatAnswer = {
            ...answer,
            directed: config.directed,
            weighted: config.weighted,
            multigraph: config.multigraph,
            evaluation_type: config.evaluation_type,
          }
          console.log('[GraphTub] sending to backend:', flatAnswer)
          props.handleChange({
            responseType: this.responseType,
            answer: flatAnswer,
          })
        }}
      />
    )
  }
}

/* ================================================================
   Stable sub-components — defined outside the class so React never
   treats them as new component types on re-render, which would
   unmount/remount GraphEditor and lose all Cytoscape canvas state.
================================================================ */

interface WizardPanelProps {
  initialConfig: GraphConfig
  initialAnswer: GraphAnswer
  onChange: (config: GraphConfig, answer: GraphAnswer) => void
}

const WizardPanel: React.FC<WizardPanelProps> = ({
  initialConfig,
  initialAnswer,
  onChange,
}) => {
  const [config, setConfig] = useState<GraphConfig>(initialConfig)
  const [answer, setAnswer] = useState<GraphAnswer>(initialAnswer)

  // Emit initial state on mount so config is always persisted to DB,
  // even if the teacher never interacts with the config panel.
  useEffect(() => {
    onChange(initialConfig, initialAnswer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConfigChange = (updatedConfig: GraphConfig) => {
    setConfig(updatedConfig)
    onChange(updatedConfig, answer)
  }

  const handleAnswerChange = (val: Graph) => {
    // evaluation_type is now a plain string; wrap for toSimpleGraph which expects string[]
    const newAnswer = simpleToAnswer(toSimpleGraph(val, config.evaluation_type ? [config.evaluation_type] : []))
    setAnswer(newAnswer)
    onChange(config, newAnswer)
  }

  const isIsomorphism = config.evaluation_type?.includes('isomorphism')
  const graph: Graph = fromSimpleGraph(graphAnswerToSimple(answer, config))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <ConfigPanel
        config={config}
        onChange={handleConfigChange}
      />
      {isIsomorphism && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Reference Graph (for Isomorphism)</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#555' }}>Draw the graph the student's answer will be compared against.</p>
          <GraphEditor
            key="wizard-isomorphism-editor"
            graph={graph}
            onChange={handleAnswerChange}
          />
        </div>
      )}
    </div>
  )
}
