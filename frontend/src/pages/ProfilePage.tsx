/**
 * pages/ProfilePage.tsx — Review extracted profile, set target role and interview type.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeProfile } from '../api/client'
import ProfileCard from '../components/ProfileCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { useSession } from '../context/SessionContext'

type InterviewType = 'technical' | 'hr' | 'mixed'

const INTERVIEW_TYPES: { value: InterviewType; label: string; description: string }[] = [
  { value: 'technical', label: 'Technical', description: 'Coding, system design, algorithms' },
  { value: 'hr', label: 'HR', description: 'Culture fit, motivation, soft skills' },
  { value: 'mixed', label: 'Mixed', description: 'Balanced mix of both' },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const { state, setInterviewId } = useSession()

  const [targetRole, setTargetRole] = useState('')
  const [interviewType, setInterviewType] = useState<InterviewType>('mixed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guard: redirect if no session
  useEffect(() => {
    if (!state.session_id || !state.profile) {
      navigate('/', { replace: true })
    }
  }, [state.session_id, state.profile, navigate])

  if (!state.profile) return null

  const handleStart = async () => {
    if (!targetRole.trim()) {
      setError('Please enter a target role.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await analyzeProfile({
        session_id: state.session_id!,
        target_role: targetRole.trim(),
        interview_type: interviewType,
      })
      setInterviewId(state.session_id!)
      navigate('/interview')
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail?.message ||
        err?.response?.data?.message ||
        'Profile analysis failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-500 text-sm">Review your extracted profile, then configure your interview.</p>
        </div>

        <ProfileCard profile={state.profile} />

        {/* Target role */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Software Engineer, Product Manager"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          {/* Interview type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Interview Type</label>
            <div className="grid grid-cols-3 gap-2">
              {INTERVIEW_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setInterviewType(t.value)}
                  disabled={loading}
                  className={`
                    rounded-lg border px-3 py-3 text-left text-xs transition-colors
                    ${interviewType === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}
                  `}
                >
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-gray-500 mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading || !targetRole.trim()}
          className={`
            w-full py-3 rounded-xl font-semibold text-sm transition-colors
            ${loading || !targetRole.trim()
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'}
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" /> Analysing profile…
            </span>
          ) : (
            'Start Interview →'
          )}
        </button>
      </div>
    </div>
  )
}
