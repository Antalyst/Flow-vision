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
      'px-4',
      'py-3',
      'py-2.5',
      'text-left',
      'text-xs',
      'font-semibold',
      'uppercase',
      'tracking-wider',
      'align-top',
      'transition-colors',
    ],
    theme: {
      container: {
        center: true,
        padding: '2rem',
        screens: {
          '2xl': '1800px',
        },
      },
      extend: {
        fontFamily: {
          primary: ['Afacad', 'sans-serif'],
          dashboard: ['Inter', 'system-ui', 'sans-serif'],
        },
        fontSize: {
          heading: ['1.5rem', {
            fontWeight: '500',
          }],
        },
        colors: {
          // --- THE ONYX PALETTE (Dark Context Foundations) ---
          'onyx-black': '#121212', // App Canvas & Dashboard background
          'onyx-sidebar': '#161616', // Navigation Sidebar fill
          'onyx-card': '#1A1A1A', // Component Containers & Cards
          'onyx-border': '#2A2A2A', // High-end minimalist layout borders

          // --- THE CANDY ORANGE PALETTE (Active High-Contrast Accents) ---
          'candy-orange': '#F47D2F', // Core Primary interactive buttons & glowing badges
          'candy-hover': '#D96518', // Rich active hover click states

          // --- THE WHITE PALETTE (Clean Readable Data Elements) ---
          'white-pure': '#FFFFFF', // Primary readable text and high-contrast titles
          'white-surface': '#F9F9F9', // Light readable content zones
          'white-muted': '#A0A0A0', // Subtitle information text descriptors
        },
        boxShadow: {
          card: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
          'card-hover': '0 8px 24px rgba(244,125,47,0.1)', // Subtle Candy Orange glowing drop shadow on hover
          'sidebar-dark': '2px 0 12px rgba(0,0,0,0.5)',
        },
        borderRadius: {
          card: '14px',
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
