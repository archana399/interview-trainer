/**
 * components/LoadingSpinner.tsx — Tailwind-animated spinner for async operations.
 */

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ message, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-gray-200 border-t-blue-600 ${sizeClasses[size]}`}
      />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  )
}
