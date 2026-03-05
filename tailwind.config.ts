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
        'g1': '0 1px 2px 0 rgb(60 64 67 / 30%), 0 1px 3px 1px rgb(60 64 67 / 15%)',
      },
    },
  },
  plugins: [],
};

export default config;

