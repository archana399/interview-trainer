/**
 * api/client.ts — Axios instance and typed API call helpers.
 */

import axios from 'axios'
import type {
  ResumeUploadResponse,
  ProfileAnalyzeRequest,
  ProfileAnalyzeResponse,
  InterviewStartResponse,
  InterviewAnswerResponse,
  InterviewEndResponse,
  HistoryListResponse,
  SessionDetail,
} from '../types'

// Use a relative base URL so requests go to the same origin as the page.
// The Vite dev server proxy (vite.config.ts) forwards /api/* to the backend.
// This means the backend port only needs to be configured in one place
// (vite.config.ts), and changing it there fixes all API calls at once.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

// ── Resume ─────────────────────────────────────────────────────────────────────

export const uploadResume = async (file: File): Promise<ResumeUploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  // Do NOT set Content-Type manually — the browser must set it automatically
  // so that the multipart boundary parameter is included. Manually setting
  // 'multipart/form-data' without a boundary causes HTTP 400 on the server.
  const { data } = await api.post<ResumeUploadResponse>('/api/resume/upload', formData, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

export const deleteResume = async (sessionId: string): Promise<void> => {
  await api.delete(`/api/resume/${sessionId}`)
}

// ── Profile ────────────────────────────────────────────────────────────────────

export const analyzeProfile = async (
  payload: ProfileAnalyzeRequest
): Promise<ProfileAnalyzeResponse> => {
  const { data } = await api.post<ProfileAnalyzeResponse>('/api/profile/analyze', payload)
  return data
}

// ── Interview ──────────────────────────────────────────────────────────────────

export const startInterview = async (sessionId: string): Promise<InterviewStartResponse> => {
  const { data } = await api.post<InterviewStartResponse>('/api/interview/start', {
    session_id: sessionId,
  })
  return data
}

export const submitAnswer = async (
  sessionId: string,
  questionId: string,
  answerText: string
): Promise<InterviewAnswerResponse> => {
  const { data } = await api.post<InterviewAnswerResponse>('/api/interview/answer', {
    session_id: sessionId,
    question_id: questionId,
    answer_text: answerText,
  })
  return data
}

export const endInterview = async (sessionId: string): Promise<InterviewEndResponse> => {
  const { data } = await api.post<InterviewEndResponse>('/api/interview/end', {
    session_id: sessionId,
  })
  return data
}

// ── History ────────────────────────────────────────────────────────────────────

export const fetchHistory = async (
  limit = 20,
  offset = 0
): Promise<HistoryListResponse> => {
  const { data } = await api.get<HistoryListResponse>('/api/history', {
    params: { limit, offset },
  })
  return data
}

export const fetchSession = async (sessionId: string): Promise<SessionDetail> => {
  const { data } = await api.get<SessionDetail>(`/api/history/${sessionId}`)
  return data
}

export default api
