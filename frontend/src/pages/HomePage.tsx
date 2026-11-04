/**
 * pages/HomePage.tsx — Entry point: upload resume PDF to begin a session.
 */

import { useNavigate } from 'react-router-dom'
import ResumeUpload from '../components/ResumeUpload'
import { useSession } from '../context/SessionContext'
import type { ResumeUploadResponse } from '../types'

export default function HomePage() {
  const navigate = useNavigate()
  const { setSessionId, setProfile } = useSession()

  const handleUploadSuccess = (data: ResumeUploadResponse) => {
    setSessionId(data.session_id)
    setProfile(data)
    navigate('/profile')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            AI Interview Trainer
          </h1>
          <p className="text-gray-500 text-base">
            Upload your resume to start a personalised AI-powered mock interview
            grounded by IBM Granite.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['Resume-aware questions', 'RAG-grounded feedback', 'IBM Granite AI', 'Progress tracking'].map((f) => (
            <span
              key={f}
              className="text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1"
            >
              {f}
            </span>
          ))}
        </div>

        {/* Upload widget */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-5">
            Step 1 — Upload your resume
          </h2>
          <ResumeUpload onSuccess={handleUploadSuccess} />
        </div>

        <p className="text-center text-xs text-gray-400">
          Your resume is processed locally and used only for this session.
        </p>
      </div>
    </div>
  )
}
