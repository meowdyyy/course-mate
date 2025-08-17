/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f9f9f9',
          100: '#f0f0f0',
          200: '#e0e0e0',
          300: '#c8c8c8',
          400: '#a0a0a0',
          500: '#808080',
          600: '#4d4d4d',
          700: '#333333',
          800: '#1a1a1a',
          900: '#000000',
        },
        secondary: {
          50: '#ffffff',
          100: '#f8f8f8',
          200: '#eeeeee',
          300: '#dddddd',
          400: '#bbbbbb',
          500: '#999999',
          600: '#777777',
          700: '#555555',
          800: '#2e2e2e',
          900: '#111111',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
