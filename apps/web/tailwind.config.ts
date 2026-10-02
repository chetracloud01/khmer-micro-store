import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./mock/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        khmer: ["var(--font-kantumruy)", "Kantumruy Pro", "Noto Sans Khmer", "system-ui", "sans-serif"],
      },
      spacing: {
        touch: "44px",
      },
      borderRadius: {
        DEFAULT: "12px",
      },
      colors: {
        brand: "rgb(var(--color-brand) / <alpha-value>)",
        "on-brand": "rgb(var(--color-on-brand) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        fg: "rgb(var(--color-fg) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        khqr: {
          DEFAULT: "rgb(var(--color-khqr) / <alpha-value>)",
          surface: "rgb(var(--color-khqr-surface) / <alpha-value>)",
          ink: "rgb(var(--color-khqr-ink) / <alpha-value>)",
        },
        nav: {
          bg: "rgb(var(--color-nav-bg) / <alpha-value>)",
          fg: "rgb(var(--color-nav-fg) / <alpha-value>)",
          muted: "rgb(var(--color-nav-muted) / <alpha-value>)",
          border: "rgb(var(--color-nav-border) / <alpha-value>)",
        },
      },
      keyframes: {
        "page-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        "drawer-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "none" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // A small pop when something lands in the cart.
        bump: {
          "0%, 100%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.04)" },
        },
        "sheet-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        bump: "bump 300ms ease-out",
        "sheet-in": "sheet-in 220ms ease-out both",
        "page-in": "page-in 220ms ease-out both",
        "drawer-in": "drawer-in 250ms ease-out both",
        "fade-in": "fade-in 200ms ease-out both",
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)",
        raised: "0 4px 12px rgb(15 23 42 / 0.08), 0 1px 3px rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
