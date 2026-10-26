/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Google Sans Flex"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      fontSize: {
        'page-title': ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }], // 24px, 600
        'section-title': ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }], // 18px, 600
        'card-title': ['1rem', { lineHeight: '1.35', fontWeight: '600' }], // 16px, 600
        'body-text': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }], // 14px, 400
        'secondary-text': ['0.8125rem', { lineHeight: '1.45', fontWeight: '400' }], // 13px, 400
        'table-text': ['0.84375rem', { lineHeight: '1.45', fontWeight: '400' }], // 13.5px, 400
        'table-header': ['0.78125rem', { lineHeight: '1.35', fontWeight: '600' }], // 12.5px, 600
        'form-label': ['0.8125rem', { lineHeight: '1.35', fontWeight: '500' }], // 13px, 500
        'input-text': ['0.875rem', { lineHeight: '1.45', fontWeight: '400' }], // 14px, 400
        'btn-text': ['0.84375rem', { lineHeight: '1.35', fontWeight: '500' }], // 13.5px, 500
        'helper-text': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }], // 12px, 400
        'kpi-number': ['1.75rem', { lineHeight: '1.2', fontWeight: '600' }], // 28px, 600
        'financial-amount': ['1.375rem', { lineHeight: '1.25', fontWeight: '600' }], // 22px, 600
        'nav-text': ['0.84375rem', { lineHeight: '1.4', fontWeight: '500' }], // 13.5px, 500
        'badge-text': ['0.71875rem', { lineHeight: '1.3', fontWeight: '500' }], // 11.5px, 500
      },
      colors: {
        canvas: "#F4F7F9",
        brand: {
          50: "var(--primary-light)",
          100: "var(--primary-light)",
          200: "var(--primary-border)",
          DEFAULT: "var(--primary)",
          500: "var(--primary)",
          600: "var(--primary-hover)",
          700: "var(--primary-active)",
        },
        indigo: {
          50: "var(--primary-light)",
          100: "var(--primary-light)",
          200: "var(--primary-border)",
          300: "var(--primary-border)",
          400: "var(--primary)",
          DEFAULT: "var(--primary)",
          500: "var(--primary)",
          600: "var(--primary)",
          700: "var(--primary-hover)",
          800: "var(--primary-active)",
          900: "var(--primary-text)",
          950: "var(--primary-text)",
        },
        sky: {
          50: "var(--primary-light)",
          100: "var(--primary-light)",
          200: "var(--primary-border)",
          300: "var(--primary-border)",
          400: "var(--primary)",
          DEFAULT: "var(--primary)",
          500: "var(--primary)",
          600: "var(--primary)",
          700: "var(--primary-hover)",
          800: "var(--primary-active)",
          900: "var(--primary-text)",
          950: "var(--primary-text)",
        },
        blue: {
          50: "var(--primary-light)",
          100: "var(--primary-light)",
          200: "var(--primary-border)",
          300: "var(--primary-border)",
          400: "var(--primary)",
          DEFAULT: "var(--primary)",
          500: "var(--primary)",
          600: "var(--primary)",
          700: "var(--primary-hover)",
          800: "var(--primary-active)",
          900: "var(--primary-text)",
          950: "var(--primary-text)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "var(--primary-ring)",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
          light: "var(--primary-light)",
          border: "var(--primary-border)",
          text: "var(--primary-text)",
          foreground: "rgb(var(--primary-foreground-rgb, 15 23 42) / <alpha-value>)",
          ring: "var(--primary-ring)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 6px 12px -2px rgba(0, 0, 0, 0.02)',
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 4px 12px 0 rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
}
