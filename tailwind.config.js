/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // Classes emitted inside LLM-generated v-html spreadsheet matrices.
  safelist: [
    'fv-spreadsheet-matrix',
    'w-full',
    'border-collapse',
    'text-sm',
    'border',
    'border-slate-200',
    'bg-slate-50',
    'px-4',
    'py-3',
    'py-2.5',
    'text-left',
    'text-xs',
    'font-semibold',
    'uppercase',
    'tracking-wider',
    'text-slate-500',
    'text-slate-700',
    'align-top',
    'odd:bg-white',
    'even:bg-slate-50',
    'hover:bg-orange-50/40',
    'transition-colors',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1800px",
      },
    },
    extend: {
      fontFamily: {
        primary: ['Afacad', 'sans-serif'],
        dashboard: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'heading': ['1.5rem', {
          fontWeight: '500',
        }],
      },
      colors: {
        'heading-dark': '#353839',
        'primary-btn': '#F47D2F',
        'rich-black': '#121212',
        'rich-orange': '#F47D2F',
        'card-dark': '#1A1A1A',
        'card-border': '#2A2A2A',
        'surface': '#F9F9F9',
        'muted': '#A0A0A0',
        'sidebar-dark': '#161616',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'sidebar': '2px 0 8px rgba(0,0,0,0.04)',
        'sidebar-dark': '2px 0 12px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        'card': '14px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
}