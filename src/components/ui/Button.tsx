'use client'

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'

/**
 * Unified Button Component with Pengu Brand Colors
 *
 * Provides consistent button styling across the platform with official
 * Pengu brand colors (#00E177 green, #FFB92E orange) and various variants.
 *
 * Features:
 * - Multiple color variants (primary, secondary, success, warning, danger, ghost)
 * - Multiple size options (sm, md, lg, xl)
 * - Loading state with spinner
 * - Icon support (leading and trailing)
 * - Full TypeScript support
 * - WCAG 2.1 compliant (44x44px minimum touch target)
 * - Responsive and accessible
 */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'glass'
  /** Button size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Show loading spinner */
  loading?: boolean
  /** Icon to show before text */
  iconLeft?: ReactNode
  /** Icon to show after text */
  iconRight?: ReactNode
  /** Full width button */
  fullWidth?: boolean
  /** Additional CSS classes */
  className?: string
  /** Button content */
  children?: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles - always applied
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'

    // Variant styles - Pengu brand colors
    const variantStyles = {
      primary: 'bg-gradient-to-r from-pengu-green to-pengu-600 hover:from-pengu-400 hover:to-pengu-700 text-white shadow-lg hover:shadow-xl hover:shadow-pengu-green/20 focus:ring-pengu-green',
      secondary: 'glass-card text-white hover:bg-white/15 hover:border-white/30 shadow-md hover:shadow-lg',
      success: 'bg-green-500/20 text-green-300 border-2 border-green-500/50 hover:bg-green-500/30 hover:border-green-500/70 focus:ring-green-500',
      warning: 'bg-gradient-to-r from-pengu-orange to-yellow-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl hover:shadow-pengu-orange/20 focus:ring-pengu-orange',
      danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl hover:shadow-red-500/20 focus:ring-red-500',
      ghost: 'bg-transparent border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30 focus:ring-white',
      glass: 'bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/15 hover:border-white/30 shadow-md hover:shadow-lg'
    }

    // Size styles - WCAG 2.1 compliant (minimum 44x44px)
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm min-h-[44px]', // 44px minimum touch target
      md: 'px-6 py-3 text-base min-h-[44px]',
      lg: 'px-8 py-4 text-lg min-h-[48px]',
      xl: 'px-10 py-5 text-xl min-h-[56px]'
    }

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : ''

    // Combine all styles
    const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={combinedStyles}
        {...props}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
            {children}
            {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button

/**
 * Icon-only Button variant for compact layouts
 * Automatically ensures 44x44px minimum touch target (WCAG 2.1)
 */
export interface IconButtonProps extends Omit<ButtonProps, 'iconLeft' | 'iconRight' | 'children'> {
  /** Icon to display */
  icon: ReactNode
  /** Accessible label for screen readers */
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'ghost',
      size = 'md',
      className = '',
      ...props
    },
    ref
  ) => {
    // Icon button specific styles - square with equal padding
    const iconSizeStyles = {
      sm: 'p-2.5 min-w-[44px] min-h-[44px]', // 44px minimum
      md: 'p-3 min-w-[44px] min-h-[44px]',
      lg: 'p-4 min-w-[48px] min-h-[48px]',
      xl: 'p-5 min-w-[56px] min-h-[56px]'
    }

    return (
      <Button
        ref={ref}
        variant={variant}
        className={`${iconSizeStyles[size]} ${className}`.replace(/ px-\d+| py-\d+/g, '')}
        {...props}
      >
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'
