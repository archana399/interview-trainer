/**
 * context/SessionContext.tsx — React context storing active interview session state.
 */

import React, { createContext, useContext, useState } from 'react'
import type { SessionState, ResumeUploadResponse, InterviewEndResponse } from '../types'

interface SessionContextValue {
  state: SessionState
  setSessionId: (id: string) => void
  setProfile: (profile: ResumeUploadResponse) => void
  setInterviewId: (id: string) => void
  setFeedback: (feedback: InterviewEndResponse) => void
  clearSession: () => void
}

const defaultState: SessionState = {
  session_id: null,
  profile: null,
  interview_id: null,
  feedback: null,
}

const SessionContext = createContext<SessionContextValue | null>(null)

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SessionState>(defaultState)

  const setSessionId = (id: string) =>
    setState((prev) => ({ ...prev, session_id: id }))

  const setProfile = (profile: ResumeUploadResponse) =>
    setState((prev) => ({ ...prev, profile }))

  const setInterviewId = (id: string) =>
    setState((prev) => ({ ...prev, interview_id: id }))

  const setFeedback = (feedback: InterviewEndResponse) =>
    setState((prev) => ({ ...prev, feedback }))

  const clearSession = () => setState(defaultState)

  return (
    <SessionContext.Provider
      value={{ state, setSessionId, setProfile, setInterviewId, setFeedback, clearSession }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
