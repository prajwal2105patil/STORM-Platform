import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy:  "#1A3A5C",
        teal:  "#0D6B8E",
        steel: "#2E75B6",
      },
    },
  },
  plugins: [],
};

export default config;
