'use client'

interface CommunityRulesProps {
  rules: string[]
  className?: string
}

export default function CommunityRules({ rules, className = '' }: CommunityRulesProps) {
  if (!rules || rules.length === 0) {
    return (
      <div className={`glass-card p-6 ${className}`}>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
          <span>📋</span>
          <span>Community Rules</span>
        </h3>
        <div className="text-center py-4">
          <div className="text-4xl mb-2">📜</div>
          <p className="text-gray-300">No rules have been set for this community yet.</p>
          <p className="text-gray-500 text-sm mt-1">Be respectful and follow general community guidelines.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`glass-card p-6 ${className}`}>
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
        <span>📋</span>
        <span>Community Rules</span>
      </h3>

      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-black/20 rounded-lg border border-white/10">
            <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            <p className="text-gray-300 leading-relaxed">{rule}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-600/10 border border-yellow-500/20 rounded-lg">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-400 flex-shrink-0">⚠️</span>
          <div className="text-sm">
            <p className="text-yellow-400 font-medium mb-1">Important Notice</p>
            <p className="text-gray-300">
              Violation of community rules may result in warnings, temporary suspension, or permanent removal
              from the community. Please read and follow all rules to maintain a positive environment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}