'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, can't be disabled
    analytics: true,
    functional: true,
    marketing: false
  })

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('pebloq-cookie-consent')
    if (!consent) {
      setShowBanner(true)
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consent)
        setPreferences(saved)
      } catch (e) {
        console.error('Failed to parse cookie consent:', e)
      }
    }

    // Listen for cookie settings button click from footer
    const handleOpenSettings = () => {
      setShowSettings(true)
      setShowBanner(false)
    }
    window.addEventListener('open-cookie-settings', handleOpenSettings)
    return () => window.removeEventListener('open-cookie-settings', handleOpenSettings)
  }, [])

  const savePreferences = (prefs: typeof preferences) => {
    localStorage.setItem('pebloq-cookie-consent', JSON.stringify(prefs))
    setPreferences(prefs)
    setShowBanner(false)
    setShowSettings(false)

    // Apply preferences (you can expand this to actually control cookies)
    if (!prefs.analytics) {
      // Disable analytics tracking
      console.log('Analytics disabled')
    }
    if (!prefs.functional) {
      // Disable functional cookies
      console.log('Functional cookies disabled')
    }
    if (!prefs.marketing) {
      // Disable marketing cookies
      console.log('Marketing cookies disabled')
    }
  }

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      functional: true,
      marketing: true
    })
  }

  const acceptNecessary = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      functional: false,
      marketing: false
    })
  }

  const saveCustomPreferences = () => {
    savePreferences(preferences)
  }

  if (!showBanner && !showSettings) return null

  return (
    <>
      {/* Simple Banner */}
      {showBanner && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/20 z-50 p-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🍪</span>
                  <h3 className="text-white font-bold text-lg">We value your privacy</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.
                  By clicking "Accept All", you consent to our use of cookies.{' '}
                  <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">
                    Learn more
                  </Link>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-medium"
                >
                  Customize
                </button>
                <button
                  onClick={acceptNecessary}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                >
                  Necessary Only
                </button>
                <button
                  onClick={acceptAll}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-colors font-medium"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/20 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🍪</span>
                <h2 className="text-2xl font-bold text-white">Cookie Preferences</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-300 mb-6">
              We use cookies and similar technologies to help personalize content, tailor and measure ads, and provide a better experience.
              You can choose which types of cookies to allow.
            </p>

            <div className="space-y-4 mb-8">
              {/* Necessary Cookies */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Necessary Cookies</h3>
                    <p className="text-gray-400 text-sm">
                      Essential for the website to function properly. These cookies enable core functionality such as security,
                      authentication, and session management. They cannot be disabled.
                    </p>
                  </div>
                  <div className="ml-4">
                    <div className="w-12 h-7 bg-cyan-500 rounded-full flex items-center justify-end px-1 cursor-not-allowed">
                      <div className="w-5 h-5 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Always Active</p>
              </div>

              {/* Analytics Cookies */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Analytics Cookies</h3>
                    <p className="text-gray-400 text-sm">
                      Help us understand how visitors interact with our website by collecting and reporting information anonymously.
                      This helps us improve the user experience.
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => setPreferences({ ...preferences, analytics: !preferences.analytics })}
                      className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                        preferences.analytics ? 'bg-cyan-500 justify-end' : 'bg-gray-600 justify-start'
                      } px-1`}
                    >
                      <div className="w-5 h-5 bg-white rounded-full"></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Functional Cookies</h3>
                    <p className="text-gray-400 text-sm">
                      Enable enhanced functionality and personalization, such as remembering your preferences,
                      language selection, and region settings.
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => setPreferences({ ...preferences, functional: !preferences.functional })}
                      className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                        preferences.functional ? 'bg-cyan-500 justify-end' : 'bg-gray-600 justify-start'
                      } px-1`}
                    >
                      <div className="w-5 h-5 bg-white rounded-full"></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Marketing Cookies</h3>
                    <p className="text-gray-400 text-sm">
                      Used to track visitors across websites to display relevant advertisements and measure campaign effectiveness.
                      Currently not used on PeBloq.
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => setPreferences({ ...preferences, marketing: !preferences.marketing })}
                      className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                        preferences.marketing ? 'bg-cyan-500 justify-end' : 'bg-gray-600 justify-start'
                      } px-1`}
                    >
                      <div className="w-5 h-5 bg-white rounded-full"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={acceptNecessary}
                  className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                >
                  Reject All
                </button>
                <button
                  onClick={saveCustomPreferences}
                  className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-medium"
                >
                  Save Preferences
                </button>
                <button
                  onClick={acceptAll}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-colors font-medium"
                >
                  Accept All
                </button>
              </div>
              <p className="text-center text-gray-400 text-xs mt-4">
                Read our{' '}
                <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">
                  Privacy Policy
                </Link>
                {' '}and{' '}
                <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 underline">
                  Terms of Service
                </Link>
                {' '}for more information.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
