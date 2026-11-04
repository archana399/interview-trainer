/**
 * components/ProgressChart.tsx — SVG bar chart of overall scores across past sessions.
 * No external chart library required.
 */

import type { SessionSummary } from '../types'

interface ProgressChartProps {
  sessions: SessionSummary[]
}

const BAR_MAX_HEIGHT = 120
const BAR_WIDTH = 36
const BAR_GAP = 16
const PADDING_LEFT = 40
const PADDING_BOTTOM = 40
const PADDING_TOP = 16

export default function ProgressChart({ sessions }: ProgressChartProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No completed sessions yet.
      </div>
    )
  }

  // Only show up to 10 most recent sessions
  const visible = [...sessions]
    .filter((s) => s.overall_score != null)
    .slice(0, 10)

  if (visible.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No scored sessions yet.
      </div>
    )
  }

  const svgWidth = PADDING_LEFT + visible.length * (BAR_WIDTH + BAR_GAP) + BAR_GAP
  const svgHeight = BAR_MAX_HEIGHT + PADDING_BOTTOM + PADDING_TOP

  return (
    <div className="overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} aria-label="Score progress chart">
        {/* Y-axis labels */}
        {[0, 5, 10].map((tick) => {
          const y = PADDING_TOP + BAR_MAX_HEIGHT - (tick / 10) * BAR_MAX_HEIGHT
          return (
            <g key={tick}>
              <line x1={PADDING_LEFT - 4} y1={y} x2={PADDING_LEFT} y2={y} stroke="#d1d5db" />
              <text x={PADDING_LEFT - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                {tick}
              </text>
            </g>
          )
        })}

        {/* Y-axis line */}
        <line
          x1={PADDING_LEFT}
          y1={PADDING_TOP}
          x2={PADDING_LEFT}
          y2={PADDING_TOP + BAR_MAX_HEIGHT}
          stroke="#e5e7eb"
        />

        {/* Bars */}
        {visible.map((session, i) => {
          const score = session.overall_score ?? 0
          const barH = (score / 10) * BAR_MAX_HEIGHT
          const x = PADDING_LEFT + BAR_GAP + i * (BAR_WIDTH + BAR_GAP)
          const y = PADDING_TOP + BAR_MAX_HEIGHT - barH
          const fill = score >= 8 ? '#22c55e' : score >= 6 ? '#3b82f6' : score >= 4 ? '#f59e0b' : '#ef4444'
          const date = new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

          return (
            <g key={session.id}>
              <rect x={x} y={y} width={BAR_WIDTH} height={barH} fill={fill} rx={4} opacity={0.85} />
              <text
                x={x + BAR_WIDTH / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={10}
                fontWeight="600"
                fill="#374151"
              >
                {score.toFixed(1)}
              </text>
              <text
                x={x + BAR_WIDTH / 2}
                y={PADDING_TOP + BAR_MAX_HEIGHT + 16}
                textAnchor="middle"
                fontSize={9}
                fill="#9ca3af"
              >
                {date}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
