/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Unbounded", "sans-serif"],
        body: ["Chivo", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        background: "#050508",
        foreground: "#ffffff",
        surface: "#0c0d14",
        cyan: { DEFAULT: "#00f0ff" },
        pink: { DEFAULT: "#ff0055" },
        violet: { DEFAULT: "#7000ff" },
        success: "#39ff14",
        warning: "#ffea00",
        danger: "#ff0055",
        muted: { DEFAULT: "#0c0d14", foreground: "#a0aec0" },
        primary: { DEFAULT: "#00f0ff", foreground: "#050508" },
        secondary: { DEFAULT: "#ff0055", foreground: "#ffffff" },
        accent: { DEFAULT: "#7000ff", foreground: "#ffffff" },
        card: { DEFAULT: "#0c0d14", foreground: "#ffffff" },
        popover: { DEFAULT: "#0c0d14", foreground: "#ffffff" },
        destructive: { DEFAULT: "#ff003c", foreground: "#ffffff" },
        input: "#0c0d14",
        ring: "#00f0ff",
        border: "rgba(0, 240, 255, 0.18)",
      },
      borderRadius: { lg: "0", md: "0", sm: "0" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
