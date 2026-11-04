/**
 * pages/InterviewPage.tsx — Live mock interview: questions, answers, inline feedback.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { startInterview, submitAnswer, endInterview } from '../api/client'
import QuestionCard from '../components/QuestionCard'
import AnswerInput from '../components/AnswerInput'
import ScoreCard from '../components/ScoreCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { useSession } from '../context/SessionContext'
import type { QuestionOut, InterviewAnswerResponse } from '../types'

const TOTAL_QUESTIONS = 5

interface AnsweredItem {
  question: QuestionOut
  questionNumber: number
  score: number
  feedback: string
  improvement: string
}

export default function InterviewPage() {
  const navigate = useNavigate()
  const { state, setFeedback } = useSession()

  const [currentQuestion, setCurrentQuestion] = useState<QuestionOut | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [answered, setAnswered] = useState<AnsweredItem[]>([])
  const [loadingStart, setLoadingStart] = useState(false)
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [loadingEnd, setLoadingEnd] = useState(false)
  const [lastResult, setLastResult] = useState<InterviewAnswerResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [interviewDone, setInterviewDone] = useState(false)

  // Guard: redirect if no session
  useEffect(() => {
    if (!state.session_id) {
      navigate('/', { replace: true })
      return
    }
    // Persist session_id so FeedbackPage can survive a refresh
    localStorage.setItem('interview_session_id', state.session_id)

    // Auto-start the interview on mount
    const init = async () => {
      setLoadingStart(true)
      setError(null)
      try {
        const res = await startInterview(state.session_id!)
        setCurrentQuestion(res.first_question)
        setQuestionNumber(1)
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail?.message ||
          err?.response?.data?.message ||
          'Failed to start interview. Please go back and try again.'
        setError(msg)
      } finally {
        setLoadingStart(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitAnswer = async (answerText: string) => {
    if (!currentQuestion || !state.session_id) return
    setLoadingAnswer(true)
    setError(null)
    try {
      const res = await submitAnswer(state.session_id, currentQuestion.id, answerText)
      setLastResult(res)
      setAnswered((prev) => [
        ...prev,
        {
          question: currentQuestion,
          questionNumber,
          score: res.score,
          feedback: res.feedback,
          improvement: res.improvement,
        },
      ])
      if (res.next_question) {
        setCurrentQuestion(res.next_question)
        setQuestionNumber((n) => n + 1)
        setLastResult(null)
      } else if (res.session_result) {
        // Last answer evaluated — session auto-completed by backend
        setFeedback(res.session_result)
        navigate('/feedback')
      } else {
        // Fallback: show completion UI in case session_result is missing
        setCurrentQuestion(null)
        setInterviewDone(true)
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail?.message ||
        err?.response?.data?.message ||
        'Failed to submit answer. Please try again.'
      setError(msg)
    } finally {
      setLoadingAnswer(false)
    }
  }

  const handleEndInterview = async () => {
    if (!state.session_id) return
    setLoadingEnd(true)
    setError(null)
    try {
      const res = await endInterview(state.session_id)
      setFeedback(res)
      navigate('/feedback')
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail?.message ||
        err?.response?.data?.message ||
        'Failed to end interview. Please try again.'
      setError(msg)
    } finally {
      setLoadingEnd(false)
    }
  }

  if (loadingStart) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Generating your personalised questions…" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Mock Interview</h1>
          <span className="text-sm text-gray-400">
            {answered.length} / {TOTAL_QUESTIONS} answered
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(answered.length / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Active question */}
        {currentQuestion && !interviewDone && (
          <>
            <QuestionCard
              questionNumber={questionNumber}
              totalQuestions={TOTAL_QUESTIONS}
              questionType={currentQuestion.type}
              questionText={currentQuestion.text}
            />
            {/* Show last evaluation inline before next question */}
            {lastResult && (
              <ScoreCard
                score={lastResult.score}
                feedback={lastResult.feedback}
                improvement={lastResult.improvement}
              />
            )}
            <AnswerInput
              onSubmit={handleSubmitAnswer}
              disabled={loadingAnswer}
              loading={loadingAnswer}
            />
          </>
        )}

        {/* All done — show end button */}
        {interviewDone && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <h2 className="text-lg font-semibold text-gray-800">All questions answered!</h2>
            <p className="text-sm text-gray-500">
              Click below to see your overall score and detailed feedback.
            </p>
            <button
              onClick={handleEndInterview}
              disabled={loadingEnd}
              className={`
                w-full py-3 rounded-xl font-semibold text-sm transition-colors
                ${loadingEnd
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'}
              `}
            >
              {loadingEnd ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" /> Computing results…
                </span>
              ) : (
                'View Feedback & Score →'
              )}
            </button>
          </div>
        )}

        {/* Answered questions accordion */}
        {answered.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Completed Questions
            </h2>
            {[...answered].reverse().map((item) => (
              <details key={item.question.id} className="bg-white rounded-xl border border-gray-200">
                <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-gray-700 flex items-center justify-between list-none">
                  <span>Q{item.questionNumber}: {item.question.text.slice(0, 60)}{item.question.text.length > 60 ? '…' : ''}</span>
                  <span className={`text-xs font-bold ml-3 ${item.score >= 7 ? 'text-green-600' : item.score >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                    {item.score.toFixed(1)}/10
                  </span>
                </summary>
                <div className="px-5 pb-4 pt-1">
                  <ScoreCard
                    score={item.score}
                    feedback={item.feedback}
                    improvement={item.improvement}
                  />
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
