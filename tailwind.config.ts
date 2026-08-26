import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4a7c6f",
        "primary-dark": "#355950",
        "primary-tint": "#e9efee",
      },
    },
  },
  plugins: [],
};

export default config;
