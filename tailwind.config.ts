import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#fbf7e8",
        "paper-deep": "#f0e7cf",
        ink: "#26334d",
        "ink-soft": "#526178",
        line: "#27354f",
        accent: "#f4b93f",
        "accent-strong": "#da8b1d",
        danger: "#b94a52",
        butter: "#fff1a8",
        blush: "#ffd6df",
        sky: "#cfefff",
        mint: "#d9f6d5",
        lavender: "#e6dcff"
      },
      boxShadow: {
        sketch: "6px 7px 0 rgba(38, 51, 77, 0.88)",
        "sketch-sm": "3px 4px 0 rgba(38, 51, 77, 0.8)"
      },
      fontFamily: {
        hand: ["Segoe Print", "Comic Sans MS", "Kaiti SC", "KaiTi", "cursive"],
        body: ["Comic Sans MS", "Segoe UI", "Microsoft YaHei UI", "system-ui", "sans-serif"]
      },
      keyframes: {
        breatheSketch: {
          "0%, 100%": { transform: "scale(0.88)", opacity: "0.82" },
          "50%": { transform: "scale(1.08)", opacity: "1" }
        }
      },
      animation: {
        breathe: "breatheSketch 8s ease-in-out infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
