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
        google: {
          blue: '#1a73e8',
          grey: '#5f6368',
          border: '#dadce0',
          surface: '#f8f9fa',
        },
      },
    },
  },
  plugins: [],
};

export default config;

