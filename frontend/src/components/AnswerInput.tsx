/**
 * components/AnswerInput.tsx — Controlled textarea with char count and submit button.
 * Disables after submission and during loading.
 */

import { useState, ChangeEvent } from 'react'

interface AnswerInputProps {
  onSubmit: (answer: string) => void
  disabled?: boolean
  loading?: boolean
}

const MAX_CHARS = 1500

export default function AnswerInput({ onSubmit, disabled = false, loading = false }: AnswerInputProps) {
  const [value, setValue] = useState('')

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setValue(e.target.value)
    }
  }

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }

  const isDisabled = disabled || loading
  const charCount = value.length

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={handleChange}
        disabled={isDisabled}
        placeholder="Type your answer here…"
        rows={5}
        className={`
          w-full rounded-xl border px-4 py-3 text-sm text-gray-800 resize-none
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors
          ${isDisabled ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}
        `}
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${charCount > MAX_CHARS * 0.9 ? 'text-amber-600' : 'text-gray-400'}`}>
          {charCount} / {MAX_CHARS}
        </span>
        <button
          onClick={handleSubmit}
          disabled={isDisabled || !value.trim()}
          className={`
            px-5 py-2 rounded-lg text-sm font-medium transition-colors
            ${isDisabled || !value.trim()
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'}
          `}
        >
          {loading ? 'Evaluating…' : 'Submit Answer'}
        </button>
      </div>
    </div>
  )
}
