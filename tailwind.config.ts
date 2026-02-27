import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: '#40c1ac'
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0, 0, 0, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
