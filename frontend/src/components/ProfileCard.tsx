/**
 * components/ProfileCard.tsx — Read-only display of parsed candidate profile.
 */

import type { ResumeUploadResponse } from '../types'

interface ProfileCardProps {
  profile: ResumeUploadResponse
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
          {profile.candidate_name ? profile.candidate_name[0].toUpperCase() : '?'}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {profile.candidate_name || 'Candidate'}
          </h2>
          <p className="text-sm text-gray-500">
            {profile.years_experience ? `${profile.years_experience} experience` : 'Experience not detected'}
          </p>
        </div>
      </div>

      {profile.education && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Education</p>
          <p className="text-sm text-gray-700">{profile.education}</p>
        </div>
      )}

      {profile.extracted_skills.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Skills</p>
          <div className="flex flex-wrap gap-2">
            {profile.extracted_skills.map((skill) => (
              <span
                key={skill}
                className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-100"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
