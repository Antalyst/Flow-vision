
module.exports = {
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
      },
     fontSize: {
        'heading': ['1.5rem', {
          fontWeight: '500', 
        }],
      },
      colors: {
        'heading-dark': '#1D1D1D',
        'primary-btn':'#F77934'
      }
    },
  },
}