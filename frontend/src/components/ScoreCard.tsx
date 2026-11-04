/**
 * components/ScoreCard.tsx — Score (0-10), feedback text, and improvement suggestion.
 */

interface ScoreCardProps {
  score: number
  feedback: string
  improvement: string
}

function ScoreBadge({ score }: { score: number }) {
  let colorClass = 'text-green-700 bg-green-50 border-green-200'
  if (score < 4) colorClass = 'text-red-700 bg-red-50 border-red-200'
  else if (score < 6) colorClass = 'text-amber-700 bg-amber-50 border-amber-200'
  else if (score < 8) colorClass = 'text-blue-700 bg-blue-50 border-blue-200'

  return (
    <span className={`text-2xl font-bold px-4 py-1 rounded-full border ${colorClass}`}>
      {score.toFixed(1)} / 10
    </span>
  )
}

export default function ScoreCard({ score, feedback, improvement }: ScoreCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Your Score</span>
        <ScoreBadge score={score} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Feedback</p>
        <p className="text-sm text-gray-700 leading-relaxed">{feedback}</p>
      </div>
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">💡 Improvement Tip</p>
        <p className="text-sm text-blue-800 leading-relaxed">{improvement}</p>
      </div>
    </div>
  )
}
