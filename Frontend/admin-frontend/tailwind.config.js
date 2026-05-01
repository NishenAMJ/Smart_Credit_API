/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#007AFF",
        background: "#F5F6FA",
        surface: "#FFFFFF",
        "text-primary": "#1A1A1A",
        "text-secondary": "#6B7280",
        border: "#F3F4F6",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        xxl: "24px",
      },
      borderRadius: {
        small: "8px",
        medium: "10px",
        large: "12px",
      },
      fontSize: {
        label:    ["12px", { fontWeight: "500" }],
        body:     ["15px", { fontWeight: "400" }],
        subtitle: ["18px", { fontWeight: "600" }],
        heading:  ["20px", { fontWeight: "700" }],
      },
      boxShadow: {
        light: "0 2px 4px rgba(0, 0, 0, 0.1)",
        card:  "0 2px 8px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

