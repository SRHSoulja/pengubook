import { useEffect } from 'react'

/**
 * Custom hook for keyboard navigation in modals and dropdowns
 *
 * @param isOpen - Whether the modal/dropdown is open
 * @param onClose - Callback to close the modal/dropdown
 * @param options - Additional keyboard shortcuts
 */
export function useKeyboardNavigation(
  isOpen: boolean,
  onClose: () => void,
  options?: {
    onEnter?: () => void
    onArrowUp?: () => void
    onArrowDown?: () => void
  }
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'Enter':
          if (options?.onEnter) {
            e.preventDefault()
            options.onEnter()
          }
          break
        case 'ArrowUp':
          if (options?.onArrowUp) {
            e.preventDefault()
            options.onArrowUp()
          }
          break
        case 'ArrowDown':
          if (options?.onArrowDown) {
            e.preventDefault()
            options.onArrowDown()
          }
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, options])
}

/**
 * Custom hook for focus trapping in modals
 * Keeps focus within the modal when tabbing
 *
 * @param isOpen - Whether the modal is open
 * @param modalRef - Ref to the modal container element
 */
export function useFocusTrap(isOpen: boolean, modalRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element when modal opens
    firstElement?.focus()

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    modal.addEventListener('keydown', handleTabKey as EventListener)
    return () => modal.removeEventListener('keydown', handleTabKey as EventListener)
  }, [isOpen, modalRef])
}
