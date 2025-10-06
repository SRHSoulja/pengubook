'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Math.random().toString(36).substring(7)
    const newToast: Toast = { id, type, message, duration }

    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const toast = (message: string, type: ToastType = 'info', duration?: number) => {
    toast(message, type, duration)
  }

  const success = (message: string, duration?: number) => toast(message, 'success', duration)
  const error = (message: string, duration?: number) => toast(message, 'error', duration)
  const info = (message: string, duration?: number) => toast(message, 'info', duration)
  const warning = (message: string, duration?: number) => toast(message, 'warning', duration)

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-pengu-green to-green-600 border-pengu-green/50'
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600 border-red-500/50'
      case 'warning':
        return 'bg-gradient-to-r from-pengu-orange to-orange-600 border-pengu-orange/50'
      case 'info':
      default:
        return 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-500/50'
    }
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
      default:
        return 'ℹ'
    }
  }

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, x: 100 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`
                ${getToastStyles(toast.type)}
                border px-6 py-4 rounded-xl shadow-2xl
                text-white font-medium
                min-w-[320px] max-w-md
                pointer-events-auto
                cursor-pointer
                hover:scale-[1.02] transition-transform
              `}
              onClick={() => removeToast(toast.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">
                  {getIcon(toast.type)}
                </span>
                <span className="flex-1">{toast.message}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeToast(toast.id)
                  }}
                  className="text-white/80 hover:text-white transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
