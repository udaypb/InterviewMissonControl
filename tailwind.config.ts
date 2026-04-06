import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        panel: "var(--panel)",
        panelAlt: "var(--panel-alt)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        purple: "var(--purple-accent)",
        green: "var(--green-accent)",
        amber: "var(--amber-accent)",
        danger: "var(--danger)"
      },
      boxShadow: {
        panel: "0 10px 30px rgba(0, 0, 0, 0.18)"
      },
      borderRadius: {
        shell: "20px"
      },
      fontFamily: {
        sans: ["Avenir Next", "SF Pro Display", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
