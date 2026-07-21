import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0f6e56",
        "primary-dark": "#085041",
        "primary-tint": "#e1f5ee",
      },
    },
  },
  plugins: [],
};

export default config;
