import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './worker/**/*.{js,ts}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark banking theme
        primary: {
          DEFAULT: '#0A0F1E',
          50: '#0D1530',
          100: '#111B3D',
          200: '#152248',
          300: '#1A2B5A',
          400: '#1E3370',
          500: '#234090',
        },
        accent: {
          DEFAULT: '#00D4FF',
          50: 'rgba(0,212,255,0.05)',
          100: 'rgba(0,212,255,0.1)',
          200: 'rgba(0,212,255,0.2)',
          500: '#00D4FF',
          600: '#00BEEB',
          700: '#00A3D6',
        },
        success: {
          DEFAULT: '#00C896',
          50: 'rgba(0,200,150,0.1)',
          500: '#00C896',
          600: '#00B385',
        },
        warning: {
          DEFAULT: '#FFB800',
          50: 'rgba(255,184,0,0.1)',
          500: '#FFB800',
          600: '#E6A600',
        },
        danger: {
          DEFAULT: '#FF4444',
          50: 'rgba(255,68,68,0.1)',
          500: '#FF4444',
          600: '#E63C3C',
        },
        card: '#0D1530',
        border: '#1E2D4A',
        'text-primary': '#E8EDF5',
        'text-secondary': '#8B9BB4',
        'text-muted': '#4A5568',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
        accent: '0 0 20px rgba(0,212,255,0.15)',
        glow: '0 0 40px rgba(0,212,255,0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(135deg, #0D1530 0%, #0A0F1E 100%)',
        'gradient-accent': 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0A0F1E 0%, #0D1530 50%, #0A0F1E 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-accent': 'pulseAccent 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseAccent: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        scan: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '0 100%' },
        },
      },
    },
  },
  plugins: [],
}

export default config
