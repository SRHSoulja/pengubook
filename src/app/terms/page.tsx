'use client'

import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
          <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-gray-300 mb-8">Last updated: January 2025</p>

          <div className="space-y-6 text-gray-200">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using PeBloq ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
                If you do not agree to these Terms of Service, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. Description of Service</h2>
              <p>
                PeBloq is a social platform with Web3 wallet integration that allows users to connect, share content,
                and interact with each other. The Service may include community features, messaging, and token-based interactions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. User Accounts</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You may register using a Web3 wallet or OAuth providers (Discord, Twitter/X)</li>
                <li>You are responsible for maintaining the security of your account</li>
                <li>You must not share your account credentials with others</li>
                <li>You must be at least 13 years old to use this Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. User Conduct</h2>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Post content that is illegal, harmful, threatening, abusive, harassing, or offensive</li>
                <li>Impersonate any person or entity</li>
                <li>Spam, scam, or engage in fraudulent activities</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
                <li>Interfere with or disrupt the Service or servers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. Content</h2>
              <p className="mb-2">
                You retain ownership of content you post on PeBloq. By posting content, you grant PeBloq a worldwide,
                non-exclusive, royalty-free license to use, reproduce, and display your content in connection with the Service.
              </p>
              <p>
                We reserve the right to remove any content that violates these Terms or is otherwise objectionable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Web3 and Blockchain</h2>
              <p>
                PeBloq integrates with blockchain technologies and Web3 wallets. You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                <li>Blockchain transactions are irreversible</li>
                <li>You are responsible for managing your wallet and private keys</li>
                <li>PeBloq is not responsible for any loss of tokens or assets</li>
                <li>Gas fees and network costs are your responsibility</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. Moderation</h2>
              <p>
                We employ both automated systems and human moderation to maintain community standards.
                Violations may result in content removal, account suspension, or permanent ban.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DO NOT GUARANTEE THAT THE SERVICE
                WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">9. Limitation of Liability</h2>
              <p>
                PeBloq shall not be liable for any indirect, incidental, special, consequential, or punitive damages
                resulting from your use of or inability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of significant changes
                by posting a notice on the Service. Continued use after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">11. Termination</h2>
              <p>
                We may terminate or suspend your account at any time, without prior notice, for conduct that we believe
                violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">12. Contact</h2>
              <p>
                For questions about these Terms, please contact us through the platform.
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
