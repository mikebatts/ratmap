import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic, theme-aware tokens (driven by CSS vars in globals.css).
        // Use these everywhere so light/dark swap from a single source.
        surface: "rgb(var(--glass) / <alpha-value>)",
        content: "rgb(var(--content) / <alpha-value>)",
        "content-muted": "rgb(var(--content-muted) / <alpha-value>)",
        hairline: "rgb(var(--border) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-contrast": "rgb(var(--accent-contrast) / <alpha-value>)",
        canvas: "rgb(var(--bg) / <alpha-value>)",

        // Legacy brand constants (kept for back-compat / the OG image).
        hotdog: "#F5C518",
        cream: "#FAF7F0",
        ink: "#1A1A1A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      ringColor: {
        DEFAULT: "rgb(var(--ring) / 1)",
      },
    },
  },
  plugins: [],
};

export default config;
