import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
            },
            animation: {
                'count-up': 'countUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
                'fade-row': 'fadeRow 0.3s both',
            },
        },
    },
    plugins: [],
};
export default config;
