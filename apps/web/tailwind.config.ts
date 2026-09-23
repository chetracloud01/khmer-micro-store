import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./mock/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        khmer: ["Kantumruy Pro", "Noto Sans Khmer", "system-ui", "sans-serif"],
      },
      spacing: {
        touch: "44px",
      },
      borderRadius: {
        DEFAULT: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
