/**
 * Shared TypeScript interfaces mirroring all backend API schemas.
 */

// ── Resume ────────────────────────────────────────────────────────────────────

export interface ResumeUploadResponse {
  session_id: string
  candidate_name: string | null
  extracted_skills: string[]
  years_experience: string | null
  education: string | null
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface ProfileAnalyzeRequest {
  session_id: string
  target_role: string
  interview_type: 'technical' | 'hr' | 'mixed'
}

export interface ProfileAnalyzeResponse {
  profile_summary: string
  suggested_topics: string[]
}

// ── Interview ─────────────────────────────────────────────────────────────────

export interface QuestionOut {
  id: string
  text: string
  type: string
}

export interface InterviewStartResponse {
  interview_id: string
  first_question: QuestionOut
}

export interface InterviewAnswerResponse {
  score: number
  feedback: string
  improvement: string
  next_question: QuestionOut | null
  session_result: InterviewEndResponse | null
}

export interface QuestionWithAnswer {
  id: string
  question_text: string
  question_type: string
  question_order: number
  answer_text: string | null
  score: number | null
  feedback: string | null
  improvement: string | null
}

export interface InterviewEndResponse {
  overall_score: number
  summary: string
  all_questions_with_answers: QuestionWithAnswer[]
}

// ── History ───────────────────────────────────────────────────────────────────

export interface SessionSummary {
  id: string
  created_at: string
  target_role: string | null
  overall_score: number | null
  status: string
}

export interface HistoryListResponse {
  sessions: SessionSummary[]
}

export interface SessionDetail {
  id: string
  created_at: string
  candidate_name: string | null
  target_role: string | null
  interview_type: string | null
  extracted_skills: string[] | null
  profile_summary: string | null
  overall_score: number | null
  status: string
  questions: QuestionWithAnswer[]
}

// ── Error ─────────────────────────────────────────────────────────────────────

export interface ApiError {
  error: boolean
  message: string
  code: string
}

// ── Session context ───────────────────────────────────────────────────────────

export interface SessionState {
  session_id: string | null
  profile: ResumeUploadResponse | null
  interview_id: string | null
  feedback: InterviewEndResponse | null
}
