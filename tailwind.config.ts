import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif']
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        border: 'hsl(var(--border))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        success: 'hsl(var(--success))',
        danger: 'hsl(var(--danger))'
      },
      boxShadow: {
        glow: '0 0 0 1px hsl(var(--border)), 0 18px 60px rgba(1, 8, 20, 0.28)'
      },
      backgroundImage: {
        aurora:
          'radial-gradient(circle at top left, rgba(18, 194, 185, 0.16), transparent 30%), radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 28%), linear-gradient(180deg, rgba(7, 16, 29, 0.96), rgba(4, 9, 17, 1))'
      }
    }
  },
  plugins: []
};

export default config;
