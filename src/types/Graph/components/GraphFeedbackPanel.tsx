import * as React from 'react'
import { useMemo } from 'react'

import {
  CheckPhase,
  GraphFeedbackSchema,
  type GraphFeedback,
} from '../type'

interface GraphFeedbackPanelProps {
  feedback: GraphFeedback | null
  phase: CheckPhase
}

export function GraphFeedbackPanel({
  feedback,
  phase,
}: GraphFeedbackPanelProps) {

  const parsed = useMemo(
    () => GraphFeedbackSchema.safeParse(feedback),
    [feedback],
  )

  if (!feedback || !parsed.success) {
    return (
      <div style={{ opacity: 0.6, fontStyle: 'italic' }}>
        No feedback yet
      </div>
    )
  }

  const safeFeedback = parsed.data

  // Separate errors and warnings
  const errors = safeFeedback.errors.filter(e => e.type === 'error')
  const warnings = safeFeedback.errors.filter(e => e.type === 'warning')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          padding: 10,
          borderRadius: 6,
          background: '#f5f7fa',
          fontWeight: 600,
        }}
      >
        Validation Results
      </div>

      {/* ================= Errors ================= */}
      {errors.length > 0 && (
        <FeedbackSection
          title="Errors"
          items={errors}
          accent="#d32f2f"
        />
      )}

      {/* ================= Warnings ================= */}
      {warnings.length > 0 && (
        <FeedbackSection
          title="Warnings"
          items={warnings}
          accent="#ed6c02"
        />
      )}

      {/* ================= Validation Status ================= */}
      {safeFeedback.valid && errors.length === 0 && (
        <div
          style={{
            padding: 10,
            borderRadius: 6,
            background: '#e8f5e9',
            color: '#2e7d32',
            fontWeight: 600,
          }}
        >
          ✓ Graph structure is valid
        </div>
      )}
    </div>
  )
}

/* ===========================
   Helper components
=========================== */

function FeedbackSection({
  title,
  items,
  accent,
}: {
  title: string
  items: any[]
  accent: string
}) {
  return (
    <Section title={title}>
      <div
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          paddingRight: 4,
        }}
      >
        {items.map((e, i) => (
          <div
            key={i}
            style={{
              borderLeft: `4px solid ${accent}`,
              padding: '6px 8px',
              background: '#fafafa',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ fontWeight: 600 }}>{e.message}</div>

            {e.field && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Field: {e.field}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}


function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          textTransform: 'uppercase',
          opacity: 0.7,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}
