/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Monospace is the default for the "glass cockpit" numeric readouts.
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        // EFIS-inspired palette.
        cockpit: {
          bg: "#0a0f14",
          panel: "#111922",
          panelLight: "#18222e",
          border: "#243140",
          amber: "#ffb000",
          green: "#15ff6a",
          cyan: "#36d6ff",
          magenta: "#ff5fd2",
          muted: "#7c8a99",
        },
      },
    },
  },
  plugins: [],
};
