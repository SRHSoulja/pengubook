'use client'

import { useState, useEffect } from 'react'
import WalletConnect from '@/components/WalletConnect'

export default function Home() {
  const [currentTime, setCurrentTime] = useState('')
  const [uptime, setUptime] = useState('')
  const [stats, setStats] = useState({
    totalUsers: 0,
    connectedUsers: 0,
    totalTips: 0,
    totalTipVolume: '0',
    enabledTokens: 0
  })
  const [logs, setLogs] = useState([
    '[OK] Server initialized',
    '[INFO] Wallet system ready',
    '[OK] Database connected'
  ])

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString())
    }

    const fetchServerStats = async () => {
      try {
        const response = await fetch('/api/system/stats')
        const data = await response.json()
        setUptime(data.uptime)
        setStats({
          totalUsers: data.totalUsers || 0,
          connectedUsers: data.connectedUsers || 0,
          totalTips: data.totalTips || 0,
          totalTipVolume: data.totalTipVolume || '0',
          enabledTokens: data.enabledTokens || 0
        })

        // Update logs with real data
        const newLogs = [
          '[OK] Server initialized',
          '[INFO] Wallet system ready',
          '[OK] Database connected',
          `[DATA] ${data.totalUsers} penguins registered`,
          `[TIPS] ${data.totalTips} tips processed`,
          `[TOKENS] ${data.enabledTokens} tokens enabled`
        ]
        setLogs(newLogs)
      } catch (error) {
        console.error('Failed to fetch server stats:', error)
      }
    }

    updateTime()
    fetchServerStats()

    const interval = setInterval(updateTime, 1000)
    const statsInterval = setInterval(fetchServerStats, 10000) // Update server stats every 10 seconds

    return () => {
      clearInterval(interval)
      clearInterval(statsInterval)
    }
  }, [])
  return (
    <main className="min-h-screen bg-black text-green-400 font-mono overflow-hidden">
      {/* Matrix-style background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-900/20 via-transparent to-cyan-900/20" />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, #00ff4115 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, #00ffff15 0%, transparent 50%),
            linear-gradient(90deg, transparent 98%, #00ff4110 100%),
            linear-gradient(0deg, transparent 98%, #00ffff10 100%)
          `,
          backgroundSize: '200px 200px, 300px 300px, 50px 50px, 50px 50px'
        }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col justify-center p-8 max-w-6xl mx-auto">

        {/* Terminal Header */}
        <div className="mb-8">
          <div className="text-xs opacity-60 mb-2">root@pengubook:~$ ./init_colony.sh</div>
          <div className="h-px bg-green-400/30 w-full mb-4" />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-16">

          {/* Left: System Info */}
          <div className="space-y-8">

            {/* Logo/Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">🐧</div>
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-wider">PENGUBOOK</h1>
                  <div className="text-green-400 text-sm">v2.7.4-arctic-mainnet</div>
                </div>
              </div>
              <div className="text-cyan-400 text-lg">
                [CLASSIFIED] Social protocol for crypto-native organisms
              </div>
            </div>

            {/* System Status */}
            <div className="border border-green-400/30 p-6 bg-black/50">
              <div className="text-green-400 font-bold mb-4">[SYSTEM STATUS]</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-75">BLOCKCHAIN_SYNC</span>
                  <span className="text-green-400">[ONLINE]</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-75">NEURAL_NETWORK</span>
                  <span className="text-green-400">[ACTIVE]</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-75">PENGUIN_COLONY</span>
                  <span className="text-cyan-400">[{stats.connectedUsers.toLocaleString()} CONNECTED]</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-75">TIP_PROCESSING</span>
                  <span className="text-yellow-400">[{stats.totalTips} PROCESSED]</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-75">TOKEN_REGISTRY</span>
                  <span className="text-blue-400">[{stats.enabledTokens} ACTIVE]</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="text-green-400 font-bold">[CORE_MODULES]</div>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center space-x-3 p-3 border border-green-400/20 bg-green-400/5">
                  <span className="text-green-400">{'>'}</span>
                  <span className="text-white">instant_tip_protocol.exe</span>
                  <span className="text-green-400 text-xs ml-auto">[LOADED]</span>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-cyan-400/20 bg-cyan-400/5">
                  <span className="text-cyan-400">{'>'}</span>
                  <span className="text-white">quantum_wallet_bridge.so</span>
                  <span className="text-cyan-400 text-xs ml-auto">[SECURE]</span>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-yellow-400/20 bg-yellow-400/5">
                  <span className="text-yellow-400">{'>'}</span>
                  <span className="text-white">arctic_social_matrix.bin</span>
                  <span className="text-yellow-400 text-xs ml-auto">[EXPERIMENTAL]</span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="border border-red-400/30 bg-red-400/10 p-4">
              <div className="text-red-400 font-bold text-sm mb-2">[!] SECURITY_NOTICE</div>
              <div className="text-red-200 text-xs opacity-90">
                This neural interface requires Abstract Global Wallet authentication.
                Unauthorized access to the penguin colony is strictly prohibited.
              </div>
            </div>
          </div>

          {/* Right: Terminal Login */}
          <div className="space-y-6">

            <div className="border border-green-400/30 bg-black/70 p-8">
              <div className="space-y-6">

                {/* Terminal prompt */}
                <div className="space-y-2">
                  <div className="text-green-400 text-sm">
                    <span className="opacity-60">penguin@arctic:~$</span> ./connect_wallet.sh
                  </div>
                  <div className="text-yellow-400 text-sm">
                    Initializing secure quantum tunnel...
                  </div>
                  <div className="text-cyan-400 text-sm mb-4">
                    Ready for Abstract Global Wallet authentication.
                  </div>
                </div>

                <div className="h-px bg-green-400/20 w-full" />

                {/* Login Section */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-6xl mb-4 animate-pulse">🐧</div>
                    <div className="text-white text-xl font-bold">ACCESS_TERMINAL</div>
                    <div className="text-green-400 text-sm opacity-75">Quantum wallet authentication required</div>
                  </div>

                  <WalletConnect />
                </div>

                <div className="h-px bg-green-400/20 w-full" />

                {/* Footer info */}
                <div className="text-xs text-green-400/60 space-y-1">
                  <div>PROTOCOL: Abstract Layer 2</div>
                  <div>ENCRYPTION: Quantum-resistant</div>
                  <div>STATUS: Penguin colony awaiting your arrival...</div>
                </div>
              </div>
            </div>

            {/* Additional terminal info */}
            <div className="text-xs text-green-400/50 space-y-1">
              <div>root@pengubook:/home/colony# tail -f access.log</div>
              {logs.map((log, index) => (
                <div key={index} className={`${
                  log.includes('[INFO]') ? 'text-cyan-400/50' :
                  log.includes('[WARN]') ? 'text-yellow-400/50' :
                  'text-green-400/50'
                }`}>
                  {log}
                </div>
              ))}
              <div className="cursor animate-pulse">_</div>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="mt-12 pt-6 border-t border-green-400/20">
          <div className="flex justify-between items-center text-xs">
            <div className="text-green-400/60">
              POWERED_BY: abstract_protocol | SECURED_BY: quantum_cryptography | BUILT_FOR: arctic_penguins
            </div>
            <div className="text-cyan-400/60">
              uptime: {uptime} | time: {currentTime} | penguins_online: {stats.connectedUsers.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}