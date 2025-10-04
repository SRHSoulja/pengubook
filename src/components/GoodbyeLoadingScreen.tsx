'use client'

import { useEffect, useState } from 'react'

interface GoodbyeLoadingScreenProps {
  message?: string
}

export default function GoodbyeLoadingScreen({ message = 'Leaving the Colony' }: GoodbyeLoadingScreenProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 animate-gradient">
      <div className="text-center space-y-8">
        {/* Waving Penguin Icon */}
        <div className="relative">
          <div className="text-9xl animate-wave-goodbye">
            👋
          </div>
          <img
            src="https://gmgnrepeat.com/icons/pengulogo1.png"
            alt="Pengu"
            className="w-32 h-32 mx-auto mt-4 animate-fade-out opacity-80"
          />
        </div>

        {/* GOODBYE Text */}
        <div className="space-y-4">
          <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 animate-text-shine">
            GOODBYE
          </h1>
          <p className="text-2xl text-blue-200 font-medium animate-pulse">
            {message}{dots}
          </p>
        </div>

        {/* Floating Snowflakes/Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              ❄️
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto mt-12">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-progress-bar"></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes wave-goodbye {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
        }

        @keyframes fade-out {
          0% { opacity: 0.8; }
          100% { opacity: 0.2; }
        }

        @keyframes text-shine {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes float-up {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes progress-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-wave-goodbye {
          animation: wave-goodbye 2s ease-in-out infinite;
        }

        .animate-fade-out {
          animation: fade-out 2s ease-in-out infinite;
        }

        .animate-text-shine {
          background-size: 200% auto;
          animation: text-shine 3s linear infinite;
        }

        .animate-float-up {
          animation: float-up linear infinite;
        }

        .animate-progress-bar {
          animation: progress-bar 2s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 5s ease infinite;
        }
      `}</style>
    </div>
  )
}
