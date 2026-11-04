/**
 * pages/DashboardPage.tsx — Session history, progress chart, and new interview CTA.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchHistory, fetchSession } from '../api/client'
import ProgressChart from '../components/ProgressChart'
import LoadingSpinner from '../components/LoadingSpinner'
import { useSession } from '../context/SessionContext'
import type { SessionSummary, SessionDetail } from '../types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { clearSession } = useSession()

  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchHistory(20, 0)
        setSessions(res.sessions)
      } catch {
        setError('Failed to load history.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleDetail = async (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null)
      setDetail(null)
      return
    }
    setExpandedId(sessionId)
    setLoadingDetail(true)
    try {
      const d = await fetchSession(sessionId)
      setDetail(d)
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleNewInterview = () => {
    clearSession()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your interview history and progress</p>
          </div>
          <button
            onClick={handleNewInterview}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            + New Interview
          </button>
        </div>

        {loading ? (
          <div className="py-16">
            <LoadingSpinner message="Loading history…" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : (
          <>
            {/* Progress chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Score Progress</h2>
              <ProgressChart sessions={sessions} />
            </div>

            {/* Session list */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
              </h2>
              {sessions.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                  No sessions yet. Start your first interview!
                </div>
              )}
              {sessions.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleDetail(s.id)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-gray-800">
                        {s.target_role || 'Unknown role'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full font-medium
                        ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                      `}>
                        {s.status}
                      </span>
                      {s.overall_score != null && (
                        <span className={`
                          text-sm font-bold
                          ${s.overall_score >= 7 ? 'text-green-600' : s.overall_score >= 5 ? 'text-amber-600' : 'text-red-600'}
                        `}>
                          {s.overall_score.toFixed(1)}/10
                        </span>
                      )}
                      <svg
                        className={`h-4 w-4 text-gray-400 transition-transform ${expandedId === s.id ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expandedId === s.id && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                      {loadingDetail ? (
                        <LoadingSpinner size="sm" message="Loading details…" />
                      ) : detail ? (
                        <>
                          {detail.profile_summary && (
                            <p className="text-xs text-gray-500 italic">{detail.profile_summary}</p>
                          )}
                          {detail.questions.map((q) => (
                            <div key={q.id} className="border border-gray-100 rounded-lg p-3 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-gray-700 flex-1">{q.question_text}</p>
                                {q.score != null && (
                                  <span className={`shrink-0 text-xs font-bold ${q.score >= 7 ? 'text-green-600' : q.score >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {q.score.toFixed(1)}/10
                                  </span>
                                )}
                              </div>
                              {q.feedback && (
                                <p className="text-xs text-gray-500">{q.feedback}</p>
                              )}
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">Failed to load details.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
