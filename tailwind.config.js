/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Every value is a semantic token from app/globals.css, so light and
           dark swap automatically and no component needs a dark: variant for
           a plain surface, border or label. */
        canvas: 'var(--background)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        glass: 'var(--surface-glass)',
        inset: 'var(--surface-inset)',
        ink: 'var(--foreground)',
        'ink-2': 'var(--foreground-2)',
        muted: 'var(--muted)',
        'muted-2': 'var(--muted-2)',
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        /* Brand is the dynamic business accent, set inline per profile. */
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          text: 'var(--brand-text)',
          soft: 'var(--brand-soft)',
          'soft-2': 'var(--brand-soft-2)',
          'soft-border': 'var(--brand-soft-border)',
          deep: 'var(--brand-deep)',
        },
        'on-brand': 'var(--on-brand)',
        ring: 'var(--ring)',
        success: {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
          border: 'var(--success-border)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
          border: 'var(--warning-border)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
          border: 'var(--danger-border)',
        },
        info: {
          DEFAULT: 'var(--info)',
          soft: 'var(--info-soft)',
          border: 'var(--info-border)',
        },
        overlay: 'var(--overlay)',
        /* Opaque image/lightbox backdrop. Kept as its own token because Tailwind
         * cannot apply an opacity modifier to a bare `var()` colour. */
        scrim: 'var(--scrim)',
      },
      fontFamily: {
        sans: [
          'var(--font-geist-sans)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'var(--font-geist-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        tile: 'var(--radius-tile)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      maxWidth: {
        shell: '1120px',
        card: '440px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-up': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'cf-fadeIn 200ms var(--ease-out) both',
        'scale-up': 'cf-scaleUp 200ms var(--ease-out) both',
        rise: 'cf-rise 260ms var(--ease-out) both',
      },
    },
  },
  plugins: [],
}
