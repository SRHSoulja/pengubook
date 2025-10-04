'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-black/30 backdrop-blur-lg border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="text-4xl">🐧</div>
              <span className="text-2xl font-bold text-white">PeBloq</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              A Web3-powered social platform connecting communities through blockchain technology.
            </p>
            <p className="text-gray-400 text-xs">
              © {new Date().getFullYear()} PeBloq. All rights reserved.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-cyan-400 text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-cyan-400 text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    const event = new CustomEvent('open-cookie-settings')
                    window.dispatchEvent(event)
                  }}
                  className="text-gray-300 hover:text-cyan-400 text-sm transition-colors"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>

          {/* Support & Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support & Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-cyan-400 text-sm transition-colors flex items-center gap-2">
                  <span>📬</span>
                  <span>Contact Support</span>
                </Link>
              </li>
              <li>
                <Link href="/tip-platform" className="text-gray-300 hover:text-cyan-400 text-sm transition-colors flex items-center gap-2">
                  <span>💰</span>
                  <span>Tip the Platform</span>
                </Link>
              </li>
              <li>
                <Link href="/wall-of-thanks" className="text-gray-300 hover:text-cyan-400 text-sm transition-colors flex items-center gap-2">
                  <span>🙏</span>
                  <span>Wall of Thanks</span>
                </Link>
              </li>
              <li>
                <a href="https://988lifeline.org" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-cyan-400 text-sm transition-colors flex items-center gap-2">
                  <span>💙</span>
                  <span>Mental Health Support</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-gray-400">
              <span>Powered by Abstract Global Wallet</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Built with Next.js</span>
              <span className="hidden md:inline">•</span>
              <a
                href="https://gmgnrepeat.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-cyan-400 transition-colors"
              >
                Created by GMGNRepeat
              </a>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-400">All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
