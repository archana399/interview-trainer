/**
 * pages/FeedbackPage.tsx — Post-interview summary with overall score and per-question accordion.
 *
 * Persistence: if state.feedback is missing (e.g. after a page refresh), the
 * session_id is read from localStorage and the completed session is fetched
 * from GET /api/history/{session_id} to reconstruct the feedback view.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScoreCard from '../components/ScoreCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { useSession } from '../context/SessionContext'
import { fetchSession } from '../api/client'
import type { InterviewEndResponse } from '../types'

function OverallScoreBadge({ score }: { score: number }) {
  let ring = 'ring-green-400'
  let text = 'text-green-600'
  if (score < 4) { ring = 'ring-red-400'; text = 'text-red-600' }
  else if (score < 6) { ring = 'ring-amber-400'; text = 'text-amber-600' }
  else if (score < 8) { ring = 'ring-blue-400'; text = 'text-blue-600' }
  return (
    <div className={`mx-auto h-32 w-32 rounded-full ring-8 ${ring} bg-white flex flex-col items-center justify-center`}>
      <span className={`text-4xl font-bold ${text}`}>{score.toFixed(1)}</span>
      <span className="text-xs text-gray-400">out of 10</span>
    </div>
  )
}

function buildSummary(score: number): string {
  if (score >= 8) return `Excellent performance! Overall score: ${score.toFixed(1)}/10. You demonstrated strong knowledge and communication skills across all questions.`
  if (score >= 6) return `Good performance. Overall score: ${score.toFixed(1)}/10. You showed solid understanding with a few areas to refine.`
  if (score >= 4) return `Adequate performance. Overall score: ${score.toFixed(1)}/10. Review the feedback for each question to identify key improvement areas.`
  return `Needs improvement. Overall score: ${score.toFixed(1)}/10. Focus on the improvement suggestions provided for each question.`
}

export default function FeedbackPage() {
  const navigate = useNavigate()
  const { state, setFeedback, clearSession } = useSession()

  const [feedback, setLocalFeedback] = useState<InterviewEndResponse | null>(
    state.feedback ?? null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Already have feedback in context — nothing to do
    if (state.feedback) {
      setLocalFeedback(state.feedback)
      return
    }

    // Try to recover from localStorage (survives page refresh)
    const savedId =
      localStorage.getItem('interview_session_id') ||
      state.session_id

    if (!savedId) {
      navigate('/', { replace: true })
      return
    }

    setLoading(true)
    fetchSession(savedId)
      .then((detail) => {
        if (detail.status !== 'completed' || detail.overall_score == null) {
          // Session exists but isn't finished — send back to interview
          navigate('/interview', { replace: true })
          return
        }
        const recovered: InterviewEndResponse = {
          overall_score: detail.overall_score,
          summary: buildSummary(detail.overall_score),
          all_questions_with_answers: detail.questions,
        }
        setFeedback(recovered)
        setLocalFeedback(recovered)
      })
      .catch(() => {
        setError('Could not load your interview results. Please check your session history.')
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDashboard = () => navigate('/dashboard')

  const handleNewInterview = () => {
    localStorage.removeItem('interview_session_id')
    clearSession()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading your results…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!feedback) return null

  const { overall_score, summary, all_questions_with_answers } = feedback

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Interview Complete</h1>
          <OverallScoreBadge score={overall_score} />
          <p className="text-sm text-gray-600 max-w-sm mx-auto">{summary}</p>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Question Breakdown
          </h2>
          {all_questions_with_answers.map((q) => (
            <details key={q.id} className="bg-white rounded-xl border border-gray-200">
              <summary className="px-5 py-4 cursor-pointer list-none">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">Q{q.question_order}</span>
                      <span className={`
                        text-xs font-medium px-2 py-0.5 rounded-full capitalize
                        ${q.question_type === 'technical' ? 'bg-purple-100 text-purple-700' :
                          q.question_type === 'behavioral' ? 'bg-green-100 text-green-700' :
                          'bg-amber-100 text-amber-700'}
                      `}>{q.question_type}</span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium leading-snug line-clamp-2">{q.question_text}</p>
                  </div>
                  <span className={`
                    shrink-0 text-sm font-bold
                    ${(q.score ?? 0) >= 7 ? 'text-green-600' : (q.score ?? 0) >= 5 ? 'text-amber-600' : 'text-red-600'}
                  `}>
                    {q.score?.toFixed(1) ?? '—'}/10
                  </span>
                </div>
              </summary>
              <div className="px-5 pb-5 pt-1 space-y-3">
                {q.answer_text && (
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Your Answer</p>
                    <p className="text-sm text-gray-700">{q.answer_text}</p>
                  </div>
                )}
                {q.score != null && q.feedback && (
                  <ScoreCard
                    score={q.score}
                    feedback={q.feedback}
                    improvement={q.improvement ?? ''}
                  />
                )}
              </div>
            </details>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDashboard}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            View Dashboard →
          </button>
          <button
            onClick={handleNewInterview}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            New Interview
          </button>
        </div>
      </div>
    </div>
  )
}
