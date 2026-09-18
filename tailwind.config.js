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
        // Bumped up from Tailwind's defaults app-wide — the original scale (12px
        // body text, etc.) was too small for the client base, many of whom are
        // 50-60+. Every text-xs/sm/base/... usage across the app inherits this.
        fontSize: {
          heading: ['1.5rem', {
            fontWeight: '500',
          }],
          xs:   ['0.875rem', { lineHeight: '1.25rem' }],  // was 0.75rem / 12px
          sm:   ['1rem',     { lineHeight: '1.5rem'  }],  // was 0.875rem / 14px
          base: ['1.125rem', { lineHeight: '1.75rem' }],  // was 1rem / 16px
          lg:   ['1.25rem',  { lineHeight: '1.75rem' }],  // was 1.125rem / 18px
          xl:   ['1.375rem', { lineHeight: '2rem'    }],  // was 1.25rem / 20px
          '2xl':['1.75rem',  { lineHeight: '2.25rem' }],  // was 1.5rem / 24px
          '3xl':['2.125rem', { lineHeight: '2.5rem'  }],  // was 1.875rem / 30px
          '4xl':['2.5rem',   { lineHeight: '2.75rem' }],  // was 2.25rem / 36px
        },
        colors: {
          // --- THE ONYX PALETTE (Dark Context Foundations) ---
          'onyx-black': '#121212', // App Canvas & Dashboard background
          'onyx-sidebar': '#161616', // Navigation Sidebar fill
          'onyx-card': '#1A1A1A', // Component Containers & Cards
          'onyx-border': '#2A2A2A', // High-end minimalist layout borders

          // --- THE CANDY ORANGE PALETTE (Active High-Contrast Accents) ---
          'candy-orange': '#EE4D2D', // Core Primary interactive buttons & glowing badges (Shopee-style red-orange)
          'candy-hover': '#D6431F', // Rich active hover click states

          // --- THE WHITE PALETTE (Clean Readable Data Elements) ---
          'white-pure': '#FEFEFE', // Card/surface fills & dark-mode text — softened off pure white
          'white-surface': '#F6F6F7', // App canvas background — lets white-pure cards lift off the page
          'white-muted': '#79797e', // Subtitle information text descriptors

          // --- SEMANTIC STATUS COLORS ---
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
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
