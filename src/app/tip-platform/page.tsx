'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import TipButton from '@/components/TipButton'
import Link from 'next/link'

// Platform wallet address for receiving tips
const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_TIP_WALLET || '0xcbbd2df1b3cd2ce32438e2d553b49f9ef825c0c2'

export default function TipPlatformPage() {
  const { user, isAuthenticated } = useAuth()
  const [showThankYou, setShowThankYou] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white max-w-md">
            <div className="text-6xl mb-4">🐧</div>
            <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-gray-300 mb-6">Please connect your wallet to support PeBloq</p>
            <Link
              href="/"
              className="inline-block bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="https://gmgnrepeat.com/icons/pengubookicon1.png"
                alt="PeBloq"
                className="w-24 h-24 animate-float"
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Support PeBloq 💙
            </h1>
            <p className="text-xl text-gray-300">
              Help us keep the waddles going strong!
            </p>
          </div>

          {showThankYou ? (
            <div className="bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-white mb-3">Thank You!</h2>
              <p className="text-gray-200 text-lg mb-6">
                Your support means the world to us! You're helping keep PeBloq running and improving for everyone.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowThankYou(false)}
                  className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-colors"
                >
                  Tip Again
                </button>
                <Link
                  href="/wall-of-thanks"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors text-center"
                >
                  View Wall of Thanks
                </Link>
                <Link
                  href="/feed"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-colors text-center"
                >
                  Back to Feed
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Main Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-4">Why Support PeBloq?</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-3xl mb-2">🚀</div>
                      <h3 className="text-white font-semibold mb-2">Development</h3>
                      <p className="text-gray-300 text-sm">
                        Help us build new features and improve the platform
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-3xl mb-2">⚡</div>
                      <h3 className="text-white font-semibold mb-2">Infrastructure</h3>
                      <p className="text-gray-300 text-sm">
                        Keep our servers fast and reliable for all penguins
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-3xl mb-2">🎨</div>
                      <h3 className="text-white font-semibold mb-2">Community</h3>
                      <p className="text-gray-300 text-sm">
                        Support events, contests, and community initiatives
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/20 pt-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-4">Send a Tip to PeBloq</h3>
                    <p className="text-gray-300 mb-6">
                      Any amount helps! Your contribution goes directly to platform development and maintenance.
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <TipButton userId="platform-pebloq-tips" />
                  </div>

                  <p className="text-center text-gray-400 text-xs mt-4">
                    Platform Wallet: {PLATFORM_WALLET.slice(0, 6)}...{PLATFORM_WALLET.slice(-4)}
                  </p>
                </div>
              </div>

              {/* Wall of Thanks Link */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-2xl p-6 mb-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">See Our Supporters</h3>
                <p className="text-gray-300 mb-4">Check out the amazing penguins who keep PeBloq alive!</p>
                <Link
                  href="/wall-of-thanks"
                  className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors font-semibold"
                >
                  🙏 View Wall of Thanks
                </Link>
              </div>

              {/* Other Ways to Support */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Other Ways to Help</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <div className="text-2xl mb-2">📢</div>
                    <h4 className="text-white font-semibold mb-2">Spread the Word</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      Share PeBloq with your friends and communities
                    </p>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out PeBloq - A Web3-powered social platform built on Abstract! Support the platform and join the waddle! 🐧')}&url=${encodeURIComponent('https://pebloq.gmgnrepeat.com/tip-platform')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-[#1DA1F2] text-white px-4 py-2 rounded-lg hover:bg-[#1a8cd8] transition-colors text-sm font-semibold"
                    >
                      𝕏 Share on X/Twitter
                    </a>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <div className="text-2xl mb-2">🐛</div>
                    <h4 className="text-white font-semibold mb-2">Report Bugs</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      Help us improve by reporting issues you find
                    </p>
                    <Link
                      href="/contact"
                      className="inline-block bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm"
                    >
                      Contact Support
                    </Link>
                  </div>
                </div>
              </div>

              {/* Created By */}
              <div className="mt-8 text-center">
                <p className="text-gray-400 text-sm mb-3">PeBloq is created and maintained by</p>
                <a
                  href="https://gmgnrepeat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 group"
                >
                  <img
                    src="https://gmgnrepeat.com/gmgnrepeatlogo.jpeg"
                    alt="GMGNRepeat"
                    className="h-12 w-auto object-contain opacity-75 group-hover:opacity-100 transition-opacity"
                  />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
