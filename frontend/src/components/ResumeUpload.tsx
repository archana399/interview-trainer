/**
 * components/ResumeUpload.tsx — Drag-and-drop or file-picker PDF upload.
 * Validates type (PDF only) and size (<10MB) before calling the API.
 */

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { uploadResume } from '../api/client'
import type { ResumeUploadResponse } from '../types'
import LoadingSpinner from './LoadingSpinner'

interface ResumeUploadProps {
  onSuccess: (data: ResumeUploadResponse) => void
}

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export default function ResumeUpload({ onSuccess }: ResumeUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum size is 10 MB.')
      return
    }
    setLoading(true)
    try {
      const data = await uploadResume(file)
      onSuccess(data)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg =
        (typeof detail === 'object' ? detail?.message : null) ||
        (typeof detail === 'string' ? detail : null) ||
        err?.response?.data?.message ||
        'Upload failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
          transition-colors duration-150
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'}
          ${loading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onFileChange}
        />
        {loading ? (
          <LoadingSpinner message="Uploading and analyzing your resume…" />
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-700 font-medium">Drop your resume PDF here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse — PDF only, max 10 MB</p>
          </>
        )}
      </div>
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
