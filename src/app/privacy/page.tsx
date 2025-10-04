'use client'

import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-300 mb-8">Last updated: January 2025</p>

          <div className="space-y-6 text-gray-200">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Introduction</h2>
              <p>
                PeBloq ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account information (username, display name, bio)</li>
                <li>Profile information (avatar, banner, social links)</li>
                <li>Content you create (posts, comments, messages)</li>
                <li>Communications with us and other users</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">2.2 Wallet Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your wallet address (public)</li>
                <li>Transaction history related to platform activities</li>
                <li>Token holdings (as relevant to platform features)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">2.3 OAuth Information</h3>
              <p className="ml-4">When you connect via Discord or Twitter/X:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Username and display name</li>
                <li>Profile picture</li>
                <li>User ID from the OAuth provider</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">2.4 Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Device and browser information</li>
                <li>IP address</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. How We Use Your Information</h2>
              <p className="mb-2">We use your information to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Create and manage your account</li>
                <li>Enable social features and interactions</li>
                <li>Process blockchain transactions</li>
                <li>Communicate with you about the Service</li>
                <li>Enforce our Terms of Service</li>
                <li>Prevent fraud and abuse</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. Information Sharing</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.1 Public Information</h3>
              <p className="ml-4">
                Your profile information, posts, and comments are public by default. Your wallet address may be
                visible to other users in certain contexts.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.2 Third-Party Services</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>OAuth providers (Discord, Twitter/X) for authentication</li>
                <li>Blockchain networks for Web3 functionality</li>
                <li>Analytics services to understand usage patterns</li>
                <li>Infrastructure providers (hosting, CDN, database)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.3 Legal Requirements</h3>
              <p className="ml-4">
                We may disclose your information if required by law or in response to valid requests by public authorities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. Blockchain and Web3</h2>
              <p>
                Blockchain transactions are public and permanent. Your wallet address and associated transactions
                are visible on the blockchain. We have no control over blockchain data once recorded.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Data Security</h2>
              <p>
                We implement reasonable security measures to protect your information. However, no method of transmission
                over the Internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide the Service.
                You may request account deletion, though some information may be retained for legal or legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Your Rights</h2>
              <p className="mb-2">Depending on your location, you may have rights to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Object to processing of your information</li>
                <li>Request data portability</li>
                <li>Withdraw consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">9. Cookies</h2>
              <p>
                We use cookies and similar technologies to maintain sessions, remember preferences, and analyze usage.
                You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">10. Children's Privacy</h2>
              <p>
                The Service is not intended for children under 13. We do not knowingly collect information from children under 13.
                If you believe we have collected such information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">11. International Users</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. By using the Service,
                you consent to such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">12. Third-Party Links</h2>
              <p>
                The Service may contain links to third-party websites. We are not responsible for the privacy practices
                of these websites. We encourage you to review their privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">13. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes by posting
                a notice on the Service. Your continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">14. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our privacy practices, please contact us through the platform.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <Link
              href="/"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
