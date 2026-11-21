/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F8FAFC",
        border: "#E2E8F0",
        ink: "#0F172A",
        primary: "#4F46E5",
        paid: "#10B981",
        pending: "#F59E0B",
        overdue: "#EF4444",
      },
    },
  },
  plugins: [],
};
