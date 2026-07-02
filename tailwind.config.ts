import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        wft: {
          navy: "#0b1f3a",
          blue: "#1e5eff",
          sky: "#e8f0ff"
        }
      }
    }
  },
  plugins: []
};

export default config;
