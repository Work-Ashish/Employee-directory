import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./features/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font)', 'system-ui', 'sans-serif'],
                mono: ['var(--mono)', 'monospace'],
            },
            colors: {
                bg: { DEFAULT: 'var(--bg)', '2': 'var(--bg2)', '3': 'var(--bg3)' },
                surface: { DEFAULT: 'var(--surface)', '2': 'var(--surface2)', '3': 'var(--surface3)' },
                'glass-bg': 'var(--glass-bg)',
                border: { DEFAULT: 'var(--border)', '2': 'var(--border2)' },
                accent: { DEFAULT: 'var(--accent)', '2': 'var(--accent2)', '3': 'var(--accent3)' },
                glow: 'var(--glow)',
                text: { DEFAULT: 'var(--text)', '2': 'var(--text2)', '3': 'var(--text3)', '4': 'var(--text4)' },
                success: { DEFAULT: 'var(--green)', dim: 'var(--green-dim)' },
                warning: { DEFAULT: 'var(--amber)', dim: 'var(--amber-dim)' },
                danger: { DEFAULT: 'var(--red)', dim: 'var(--red-dim)' },
                info: { DEFAULT: 'var(--blue)', dim: 'var(--blue-dim)' },
                purple: { DEFAULT: 'var(--purple)', dim: 'var(--purple-dim)' },
                pink: { DEFAULT: 'var(--pink)', dim: 'var(--pink-dim)' },
                cyan: 'var(--cyan)',
                // Keep old aliases for backwards compat
                background: 'var(--bg)',
                foreground: 'var(--text)',
            },
            borderRadius: {
                'xs': '4px',
                'sm': '6px',
                DEFAULT: '8px',
                'md': '10px',
                'lg': '14px',
                'xl': '16px',
                '2xl': '20px',
                '3xl': '24px',
            },
            fontSize: {
                'xs': ['11px', { lineHeight: '16px' }],
                'sm': ['12.5px', { lineHeight: '18px' }],
                'base': ['13.5px', { lineHeight: '20px' }],
                'md': ['14px', { lineHeight: '22px' }],
                'lg': ['16px', { lineHeight: '24px' }],
                'xl': ['20px', { lineHeight: '28px' }],
                '2xl': ['26px', { lineHeight: '32px' }],
                '3xl': ['34px', { lineHeight: '40px' }],
            },
            spacing: {
                'sidebar': '260px',
                'topbar': '60px',
            },
            boxShadow: {
                'xs': 'var(--shadow-sm)',
                'sm': 'var(--shadow-sm)',
                DEFAULT: 'var(--shadow)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
                'glow': '0 0 0 3px var(--glow)',
                'glow-success': '0 0 0 3px var(--green-dim)',
                'glow-danger': '0 0 0 3px var(--red-dim)',
                'glow-warning': '0 0 0 3px var(--amber-dim)',
            },
            animation: {
                'count-up': 'countUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
                'fade-row': 'fadeRow 0.3s both',
                'page-in': 'pageIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'fade-slide': 'fadeSlide 0.4s both',
                'scale-in': 'scaleIn 0.2s both',
                'slide-up': 'hero-slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'pulse-dot': 'pulse-dot 2s infinite',
                'spin-slow': 'spin 2s linear infinite',
            },
            keyframes: {
                scaleIn: {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
            },
        },
    },
    plugins: [],
};
export default config;
