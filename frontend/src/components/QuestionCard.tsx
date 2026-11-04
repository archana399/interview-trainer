/**
 * components/QuestionCard.tsx — Displays current question number, type badge, and question text.
 */

interface QuestionCardProps {
  questionNumber: number
  totalQuestions: number
  questionType: string
  questionText: string
}

const TYPE_COLORS: Record<string, string> = {
  technical: 'bg-purple-100 text-purple-700 border-purple-200',
  behavioral: 'bg-green-100 text-green-700 border-green-200',
  hr: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  questionType,
  questionText,
}: QuestionCardProps) {
  const colorClass = TYPE_COLORS[questionType] ?? 'bg-gray-100 text-gray-700 border-gray-200'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400 font-medium">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${colorClass}`}
        >
          {questionType}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((questionNumber - 1) / totalQuestions) * 100}%` }}
        />
      </div>

      <p className="text-base text-gray-800 font-medium leading-relaxed pt-1">{questionText}</p>
    </div>
  )
}
