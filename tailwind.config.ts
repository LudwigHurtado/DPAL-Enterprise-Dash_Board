import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Roboto', 'system-ui', 'sans-serif'] },
      colors: {
        g: {
          surface: '#ffffff',
          surface2: '#f1f3f4',
          border: '#dadce0',
          divider: '#e8eaed',
          text: '#202124',
          text2: '#5f6368',
          text3: '#80868b',
          blue: '#1a73e8',
          blueHover: '#1557b0',
          green: '#1e8e3e',
          red: '#d93025',
        },
      },
      boxShadow: {
        'g1': '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 1px rgb(0 0 0 / 0.05)',
        'g2': '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 2px 6px 2px rgb(0 0 0 / 0.08)',
        'card': '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 1px rgb(0 0 0 / 0.05)',
        'md-1': '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 1px rgb(0 0 0 / 0.05)',
        'md-2': '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 2px 6px 2px rgb(0 0 0 / 0.08)',
        'md-3': '0 4px 8px 3px rgb(0 0 0 / 0.07), 0 1px 3px 0 rgb(0 0 0 / 0.05)',
      },
      borderRadius: {
        'panel': '12px',
        'panel-sm': '8px',
        'md-full': '9999px',
        'md-medium': '12px',
        'md-small': '8px',
      },
    },
  },
  plugins: [],
};

export default config;

