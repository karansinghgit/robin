module.exports = {
  content: ["./src/renderer/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1320",
        mist: "#f4f1e8",
        accent: "#f97316",
        pine: "#235347",
        brass: "#c18d2f",
        rose: "#b85c54"
      },
      boxShadow: {
        panel: "0 24px 80px rgba(11, 19, 32, 0.28)"
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        body: ["'Instrument Sans'", "'Helvetica Neue'", "sans-serif"]
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 220ms ease-out"
      }
    }
  },
  plugins: []
};
