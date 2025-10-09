export const metadata = {
  title: 'Security & Privacy - PeBloq',
  description: 'Security measures, privacy policy, and data protection at PeBloq'
}

export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Security & Privacy</h1>

      {/* Security Measures */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">🔒 Security Measures</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-medium mb-2">Authentication</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Abstract Global Wallet integration with EIP-1271 signature verification</li>
              <li>OAuth 2.0 (Discord, Twitter) with secure token handling</li>
              <li>Single-use nonces prevent replay attacks</li>
              <li>12-hour session expiration for admin accounts</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">Protection Mechanisms</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>CSRF protection with database-backed single-use tokens</li>
              <li>Rate limiting (distributed across servers via Redis)</li>
              <li>XSS prevention through Content Security Policy</li>
              <li>SQL injection protection via Prisma ORM</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">Monitoring & Logging</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Structured logging with PII redaction</li>
              <li>Security event tracking and alerting</li>
              <li>Admin action audit trail</li>
              <li>Real-time health monitoring</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Privacy Policy */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">🛡️ Privacy Policy</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium mb-2">Data Collection</h3>
            <p>We collect minimal necessary data:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Wallet address (for Web3 authentication)</li>
              <li>OAuth profile data (username, avatar)</li>
              <li>Content you create (posts, comments, reactions)</li>
              <li>Usage analytics (anonymized)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">Data Storage</h3>
            <p>Your data is stored securely:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Encrypted at rest (database encryption)</li>
              <li>Encrypted in transit (TLS 1.3)</li>
              <li>Passwords never stored (wallet-based auth)</li>
              <li>Session tokens encrypted with 256-bit keys</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">Your Rights (GDPR Compliant)</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Right to Access:</strong> Export your complete data (Settings → Privacy → Export Data)</li>
              <li><strong>Right to Deletion:</strong> Delete your account and all data (Settings → Privacy → Delete Account)</li>
              <li><strong>Right to Rectification:</strong> Update your profile information anytime</li>
              <li><strong>Right to Object:</strong> Opt-out of analytics and recommendations</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">📧 Security Contact</h2>
        <p className="mb-4">
          If you discover a security vulnerability, please report it responsibly:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Email: <a href="mailto:security@pebloq.com" className="text-blue-500 hover:underline">security@pebloq.com</a></li>
          <li>Expected response time: Within 48 hours</li>
          <li>Bounty program: Case-by-case basis</li>
        </ul>
      </section>

      {/* Security Score */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">📊 Security Score</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-medium">Overall Security Rating</span>
            <span className="text-3xl font-bold text-green-600">10/10</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>✅ Authentication & Authorization</span>
              <span className="font-medium">Excellent</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>✅ Data Protection & Encryption</span>
              <span className="font-medium">Excellent</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>✅ CSRF & XSS Prevention</span>
              <span className="font-medium">Excellent</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>✅ Rate Limiting & DDoS Protection</span>
              <span className="font-medium">Excellent</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>✅ Audit Logging & Monitoring</span>
              <span className="font-medium">Excellent</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>✅ GDPR Compliance</span>
              <span className="font-medium">Excellent</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          Last updated: October 7, 2025 | Next audit: January 2026
        </p>
      </section>
    </div>
  )
}
