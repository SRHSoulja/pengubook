'use client'

import { useState, useRef } from 'react'

interface ReactionButtonProps {
  emoji: string
  count: number
  isActive: boolean
  onClick: () => void
  label: string
}

export default function ReactionButton({ emoji, count, isActive, onClick, label }: ReactionButtonProps) {
  const [showFloatingEmoji, setShowFloatingEmoji] = useState(false)
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; color: string }>>([])
  const buttonRef = useRef<HTMLButtonElement>(null)

  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      // Light tap vibration
      navigator.vibrate(10)
    }
  }

  const createConfetti = () => {
    const colors = ['#00E177', '#FFB92E', '#00D4FF', '#FF6B6B', '#A78BFA']
    const newConfetti = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)]
    }))
    setConfetti(newConfetti)

    setTimeout(() => {
      setConfetti([])
    }, 3000)
  }

  const handleClick = () => {
    triggerHapticFeedback()

    if (!isActive) {
      // Trigger floating emoji animation
      setShowFloatingEmoji(true)
      setTimeout(() => setShowFloatingEmoji(false), 1000)

      // Trigger confetti on first reaction
      if (count === 0) {
        createConfetti()
      }
    }

    onClick()
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`reaction-button ${isActive ? 'active' : ''}`}
        aria-label={label}
        aria-pressed={isActive}
      >
        <span className={`reaction-icon text-lg ${isActive ? 'heart-beat' : ''}`}>
          {emoji}
        </span>
        {count > 0 && (
          <span className="font-semibold">{count > 999 ? '999+' : count}</span>
        )}
      </button>

      {/* Floating Emoji */}
      {showFloatingEmoji && (
        <span
          className="absolute left-1/2 -translate-x-1/2 text-3xl float-up"
          style={{ top: '-20px' }}
        >
          {emoji}
        </span>
      )}

      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti"
          style={{
            left: `${piece.x}%`,
            top: buttonRef.current ? `${buttonRef.current.offsetTop}px` : '0',
            backgroundColor: piece.color,
            animationDelay: `${Math.random() * 0.3}s`
          }}
        />
      ))}
    </div>
  )
}
