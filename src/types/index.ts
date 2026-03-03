import { CodeResponseAreaTub } from './Code'
import { EssayResponseAreaTub } from './Essay'
import { GraphResponseAreaTub } from './Graph'
import { ImagesResponseAreaTub } from './Images'
import { LikertResponseAreaTub } from './Likert'
import { MathMultiLinesResponseAreaTub } from './MathMultiLines'
import { MathSingleLineResponseAreaTub } from './MathSingleLine'
import { MatrixResponseAreaTub } from './Matrix'
import { MultipleChoiceResponseAreaTub } from './MultipleChoice'
import { NumberResponseAreaTub } from './NumberInput'
import { NumericUnitsResponseAreaTub } from './NumericUnits'
import { ResponseAreaTub } from './response-area-tub'
import { isResponseAreaSandboxType } from './sandbox'
import { TableResponseAreaTub } from './Table'
import { TextResponseAreaTub } from './TextInput'
import { TrueFalseResponseAreaTub } from './TrueFalse'
import { VoidResponseAreaTub } from './void-response-area'

export const supportedResponseTypes = [
  'BOOLEAN',
  'TEXT',
  'NUMBER',
  'NUMERIC_UNITS',
  'MATRIX',
  'TABLE',
  'MULTIPLE_CHOICE',
  'GRAPH',
  'EXPRESSION',
  'ESSAY',
  'CODE',
  'MILKDOWN',
  'HANDDRAWNGRAPH'
]

if (typeof window !== 'undefined') {
  const TUBIFY_NAME = localStorage.getItem('tubify-name')
  const TUBIFY_URL = localStorage.getItem('tubify-url')
  if (TUBIFY_NAME && TUBIFY_URL) {
    console.debug('ENABLING TUBIFY', {
      name: TUBIFY_NAME,
      url: TUBIFY_URL,
    })
    const loadComponent = async () => {
      const response = await fetch(`${JSON.parse(TUBIFY_URL)}/tubify.iife.js`)
      const componentCode = await response.text()

      const script = document.createElement('script')
      script.textContent = componentCode
      document.head.appendChild(script)
    }
    loadComponent().then(() => {
      supportedResponseTypes.push(TUBIFY_NAME)
    })
  }
}

class VoidResponseAreaTub extends ResponseAreaTub {
  // public readonly responseType = 'VOID'
  public readonly responseType = 'SANDBOX'

  protected answerSchema = z.any()

  toResponse = (): IModularResponseSchema => {
    return {
      responseType: '',
      answer: null,
    }
  }

  InputComponent = () => {
    return null
  }

  WizardComponent = () => {
    return null
  }
}

const createReponseAreaTub = (type: string): ResponseAreaTub => {
  if (isResponseAreaSandboxType(type) && 'SandboxComponent' in window) {
    return new (window.SandboxComponent as new () => ResponseAreaTub)()
  }

  switch (type) {
    case 'BOOLEAN':
      return new TrueFalseResponseAreaTub()
    case 'TEXT':
      return new TextResponseAreaTub()
    case 'NUMBER':
      return new NumberResponseAreaTub()
    case 'NUMERIC_UNITS':
      return new NumericUnitsResponseAreaTub()
    case 'MATRIX':
      return new MatrixResponseAreaTub()
    case 'TABLE':
      return new TableResponseAreaTub()
    case 'MULTIPLE_CHOICE':
      return new MultipleChoiceResponseAreaTub()
    case 'ESSAY':
      return new EssayResponseAreaTub()
    case 'CODE':
      return new CodeResponseAreaTub()
    case 'HANDDRAWNGRAPH':
      return new GraphResponseAreaTub()
    case 'LIKERT':
      return new LikertResponseAreaTub()
    case 'MATH_SINGLE_LINE':
      return new MathSingleLineResponseAreaTub()
    case 'MATH_MULTI_LINES':
      return new MathMultiLinesResponseAreaTub()
    case 'IMAGES':
      return new ImagesResponseAreaTub()
    case 'VOID':
      return new VoidResponseAreaTub()
    default:
      console.error('Unknown ResponseAreaTub', { type })
      return new VoidResponseAreaTub()
  }
}

export { createReponseAreaTub }
