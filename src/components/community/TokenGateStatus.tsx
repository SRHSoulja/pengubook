'use client'

interface TokenAccessData {
  hasAccess: boolean
  isTokenGated: boolean
  tokenGateType?: string
  tokenSymbol?: string
  tokenMinAmount?: string
  userBalance?: string
  ownedTokenIds?: string[]
  error?: string
  message?: string
}

interface TokenGateStatusProps {
  tokenAccess: TokenAccessData | null
  checking: boolean
  onRetryCheck?: () => void
}

export default function TokenGateStatus({
  tokenAccess,
  checking,
  onRetryCheck
}: TokenGateStatusProps) {
  if (!tokenAccess?.isTokenGated) return null

  if (checking) {
    return (
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-white">Checking token requirements...</span>
        </div>
      </div>
    )
  }

  if (tokenAccess.error) {
    return (
      <div className="glass-card p-6 mb-6 border-red-500/30">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h3 className="text-red-400 font-semibold mb-2">Token Gate Error</h3>
            <p className="text-gray-300 mb-4">{tokenAccess.error}</p>
            {onRetryCheck && (
              <button
                onClick={onRetryCheck}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Retry Check
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (tokenAccess.hasAccess) {
    return (
      <div className="glass-card p-6 mb-6 border-green-500/30">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <h3 className="text-green-400 font-semibold mb-2">Token Gate Passed</h3>
            <p className="text-gray-300 mb-4">
              You have the required tokens to access this community.
            </p>

            {/* Token Details */}
            <div className="space-y-2 text-sm">
              {tokenAccess.tokenGateType && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300">Token Type:</span>
                  <span className="text-white font-medium">{tokenAccess.tokenGateType}</span>
                </div>
              )}

              {tokenAccess.tokenSymbol && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300">Token:</span>
                  <span className="text-white font-medium">{tokenAccess.tokenSymbol}</span>
                </div>
              )}

              {tokenAccess.userBalance && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300">Your Balance:</span>
                  <span className="text-green-400 font-medium">{tokenAccess.userBalance}</span>
                </div>
              )}

              {tokenAccess.ownedTokenIds && tokenAccess.ownedTokenIds.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300">Owned Token IDs:</span>
                  <span className="text-white font-medium">
                    {tokenAccess.ownedTokenIds.slice(0, 5).join(', ')}
                    {tokenAccess.ownedTokenIds.length > 5 && ` +${tokenAccess.ownedTokenIds.length - 5} more`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Access denied
  return (
    <div className="glass-card p-6 mb-6 border-red-500/30">
      <div className="flex items-start space-x-3">
        <span className="text-2xl">🔒</span>
        <div className="flex-1">
          <h3 className="text-red-400 font-semibold mb-2">Token Gate Requirement</h3>
          <p className="text-gray-300 mb-4">
            This community requires specific tokens for access. You don't currently have the required tokens.
          </p>

          {/* Requirements */}
          <div className="space-y-3">
            <h4 className="text-white font-medium">Requirements:</h4>

            <div className="bg-black/30 rounded-lg p-4 space-y-2">
              {tokenAccess.tokenGateType && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300">Token Type:</span>
                  <span className="text-white font-medium">{tokenAccess.tokenGateType}</span>
                </div>
              )}

              {tokenAccess.tokenSymbol && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300">Token:</span>
                  <span className="text-white font-medium">{tokenAccess.tokenSymbol}</span>
                </div>
              )}

              {tokenAccess.tokenMinAmount && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300">Minimum Amount:</span>
                  <span className="text-white font-medium">{tokenAccess.tokenMinAmount}</span>
                </div>
              )}

              {tokenAccess.userBalance !== undefined && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300">Your Balance:</span>
                  <span className="text-red-400 font-medium">
                    {tokenAccess.userBalance || '0'}
                  </span>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-300">
              <p>💡 To gain access to this community, you need to acquire the required tokens.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}