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
        // Light BMW Motorsport theme
        primary: {
          DEFAULT: '#F8F9FA',
          50: '#FFFFFF',
          100: '#F8F9FA',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#ADB5BD',
        },
        accent: {
          DEFAULT: '#003882',
          light: '#00A1E4',
          50: 'rgba(0,56,130,0.05)',
          100: 'rgba(0,56,130,0.1)',
          200: 'rgba(0,56,130,0.2)',
          500: '#003882',
          600: '#002B66',
          700: '#001E4D',
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
          DEFAULT: '#E2001A',
          50: 'rgba(226,0,26,0.1)',
          500: '#E2001A',
          600: '#C20016',
        },
        card: '#FFFFFF',
        border: '#E2E8F0',
        'text-primary': '#1A202C',
        'text-secondary': '#4A5568',
        'text-muted': '#718096',
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
        card: '0 4px 24px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.1)',
        accent: '0 0 20px rgba(0,56,130,0.15)',
        glow: '0 0 40px rgba(0,56,130,0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)',
        'gradient-accent': 'linear-gradient(135deg, #00A1E4 0%, #003882 100%)',
        'gradient-hero': 'linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 50%, #F8F9FA 100%)',
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
