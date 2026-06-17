/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgba(var(--background), <alpha-value>)',
        sidebar: 'rgba(var(--sidebar), <alpha-value>)',
        'sidebar-border': 'rgba(var(--sidebar-border), <alpha-value>)',
        card: 'rgba(var(--card), <alpha-value>)',
        text: 'rgba(var(--text), <alpha-value>)',
        primary: {
          DEFAULT: 'rgba(var(--primary), <alpha-value>)',
          foreground: 'rgba(var(--primary-foreground), <alpha-value>)',
          hover: 'rgba(var(--primary-hover), <alpha-value>)'
        },
        secondary: {
          DEFAULT: 'rgba(var(--secondary), <alpha-value>)',
          foreground: 'rgba(var(--secondary-foreground), <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgba(var(--accent), <alpha-value>)', 
          foreground: 'rgba(var(--accent-foreground), <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgba(var(--muted), <alpha-value>)',
          foreground: 'rgba(var(--muted-foreground), <alpha-value>)', 
        },
        border: 'rgba(var(--border), <alpha-value>)', 
        success: 'rgba(var(--success), <alpha-value>)',
        warning: 'rgba(var(--warning), <alpha-value>)',
        danger: 'rgba(var(--danger), <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, rgba(var(--primary), 1), rgba(var(--secondary), 1))',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'premium': '0 20px 40px -10px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02)',
        'premium-hover': '0 30px 60px -12px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.03)',
      }
    },
  },
  plugins: [],
}
