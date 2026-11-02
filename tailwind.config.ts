import type { Config } from 'tailwindcss';

/**
 * 设计令牌与独立站模板同源（HSL 变量集中换肤，见 src/styles.css）。
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          dark: 'hsl(var(--brand-dark) / <alpha-value>)',
          light: 'hsl(var(--brand-light) / <alpha-value>)',
          tint: 'hsl(var(--brand-tint) / <alpha-value>)',
        },
        ink: 'hsl(var(--ink) / <alpha-value>)',
        paper: 'hsl(var(--paper) / <alpha-value>)',
        line: 'hsl(var(--line) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
          '"Helvetica Neue"', 'Arial', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
export default config;
