/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pengu Official Brand Colors
        pengu: {
          green: '#00E177', // Primary brand color - Pengu green
          orange: '#FFB92E', // Accent color - Pengu orange (beak & feet)
          // Generated shades for the green
          50: '#e6fff4',
          100: '#b3ffe0',
          200: '#80ffcc',
          300: '#4dffb8',
          400: '#1affa4',
          500: '#00E177', // Main green
          600: '#00b35f',
          700: '#008647',
          800: '#00592f',
          900: '#002b17',
        },
        // Web3 Inspired Color Palette
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Crypto-inspired accent colors
        neon: {
          cyan: '#00ffff',
          purple: '#8a2be2',
          pink: '#ff1493',
          green: '#00ff41',
          yellow: '#ffff00',
          blue: '#0080ff',
        },
        // Custom gradients as colors
        'gradient-start': '#0f0f23',
        'gradient-mid': '#1a1a3e',
        'gradient-end': '#2d1b69',
        // Glass morphism variations
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.15)',
          dark: 'rgba(0, 0, 0, 0.1)',
        },
        // MySpace-style colors
        myspace: {
          blue: '#00aaff',
          orange: '#ff6600',
          red: '#ff0033',
          green: '#00cc00',
          purple: '#9933ff',
        }
      },
      fontFamily: {
        'display': ['Space Grotesk', 'Inter', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
        'web3': ['Orbitron', 'Space Grotesk', 'sans-serif'],
      },
      animation: {
        'blob': 'blob 7s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
        'neon-flicker': 'neon-flicker 1.5s ease-in-out infinite alternate',
        'slide-up': 'slide-up 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'typewriter': 'typewriter 4s steps(40) infinite',
      },
      keyframes: {
        glow: {
          '0%': {
            boxShadow: '0 0 5px theme(colors.cyan.400), 0 0 10px theme(colors.cyan.400), 0 0 15px theme(colors.cyan.400)'
          },
          '100%': {
            boxShadow: '0 0 10px theme(colors.cyan.400), 0 0 20px theme(colors.cyan.400), 0 0 30px theme(colors.cyan.400)'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        'neon-flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'typewriter': {
          '0%': { width: '0%' },
          '50%': { width: '100%' },
          '100%': { width: '0%' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'web3-grid': `
          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
        'aurora': `
          linear-gradient(45deg,
            rgba(0, 255, 255, 0.1) 0%,
            rgba(138, 43, 226, 0.1) 25%,
            rgba(255, 20, 147, 0.1) 50%,
            rgba(0, 255, 65, 0.1) 75%,
            rgba(255, 255, 0, 0.1) 100%
          )
        `,
      },
      backdropBlur: {
        'xs': '2px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      boxShadow: {
        'neon-sm': '0 0 5px currentColor',
        'neon': '0 0 10px currentColor, 0 0 20px currentColor',
        'neon-lg': '0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor',
        'glass': '0 8px 32px rgba(31, 38, 135, 0.37)',
        'glass-lg': '0 25px 50px rgba(31, 38, 135, 0.5)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      }
    },
  },
  plugins: [],
}