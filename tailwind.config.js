/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        feather: "#58cc02",
        mask: "#89e219",
        macaw: "#1cb0f6",
        cardinal: "#ff4b4b",
        bee: "#ffc800",
        fox: "#ff9600",
        beetle: "#ce82ff",
        humpback: "#2b70c9",
        eel: "#4b4b4b",
        wolf: "#777777",
        hare: "#AFAFAF",
        swan: "#E5E5E5",
        polar: "#F7F7F7",
        snow: "#FFFFFF",
      },
      fontFamily: {
        nunito: ["Nunito_400Regular"],
        "nunito-medium": ["Nunito_500Medium"],
        "nunito-semibold": ["Nunito_600SemiBold"],
        "nunito-bold": ["Nunito_700Bold"],
        "nunito-extrabold": ["Nunito_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
