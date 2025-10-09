'use client'

interface UploadProgressProps {
  fileName: string
  progress: number // 0-100
  isComplete?: boolean
  error?: string
  onCancel?: () => void
}

export default function UploadProgress({
  fileName,
  progress,
  isComplete = false,
  error,
  onCancel
}: UploadProgressProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            error
              ? 'bg-red-500/20 text-red-400'
              : isComplete
                ? 'bg-pengu-green/20 text-pengu-green'
                : 'bg-blue-500/20 text-blue-400'
          }`}>
            {error ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : isComplete ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {fileName}
            </p>
            <p className="text-xs text-gray-300">
              {error
                ? error
                : isComplete
                  ? 'Upload complete'
                  : `Uploading... ${Math.round(progress)}%`
              }
            </p>
          </div>
        </div>

        {/* Cancel button */}
        {!isComplete && !error && onCancel && (
          <button
            onClick={onCancel}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Cancel upload"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {!error && !isComplete && (
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pengu-green to-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>
        </div>
      )}

      {/* Success animation or error state */}
      {isComplete && (
        <div className="flex items-center space-x-2 text-pengu-green">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">Ready to post</span>
        </div>
      )}
    </div>
  )
}
