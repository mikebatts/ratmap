import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hot dog yellow — the universal NYC street-food signal.
        hotdog: "#F5C518",
        cream: "#FAF7F0",
        ink: "#1A1A1A",
        // Category colors (see brief Section 4).
        cat: {
          sighting: "#E03131", // red
          fail: "#F08C00", // orange
          pass: "#868E96", // gray
          baiting: "#1971C2", // blue
          other: "#F5C518", // yellow
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
