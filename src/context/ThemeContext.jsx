import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

const ACCENT_OPTIONS = [
  { id: "yellow", label: "Yellow", swatch: "#eab308" },
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
  { id: "orange", label: "Orange", swatch: "#f97316" },
  { id: "lime", label: "Lime", swatch: "#84cc16" },
  { id: "emerald", label: "Emerald", swatch: "#10b981" },
  { id: "teal", label: "Teal", swatch: "#14b8a6" },
  { id: "sky", label: "Sky", swatch: "#0ea5e9" },
  { id: "blue", label: "Blue", swatch: "#3b82f6" },
  { id: "indigo", label: "Indigo", swatch: "#6366f1" },
  { id: "pink", label: "Pink", swatch: "#ec4899" },
  { id: "rose", label: "Rose", swatch: "#f43f5e" },
];

const INTENSITY_MIN = 0;
const INTENSITY_MAX = 1000;

const ACCENT_PALETTES = {
  yellow:  { 200: "#fef08a", 300: "#fde047", 400: "#facc15", 500: "#eab308", 600: "#ca8a04", 700: "#a16207", 800: "#854d0e" },
  amber:   { 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309", 800: "#92400e" },
  orange:  { 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c", 800: "#9a3412" },
  lime:    { 200: "#d9f99d", 300: "#bef264", 400: "#a3e635", 500: "#84cc16", 600: "#65a30d", 700: "#4d7c0f", 800: "#3f6212" },
  emerald: { 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46" },
  teal:    { 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e", 800: "#115e59" },
  sky:     { 200: "#bae6fd", 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1", 800: "#075985" },
  blue:    { 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af" },
  indigo:  { 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3" },
  pink:    { 200: "#fbcfe8", 300: "#f9a8d4", 400: "#f472b6", 500: "#ec4899", 600: "#db2777", 700: "#be185d", 800: "#9d174d" },
  rose:    { 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c", 800: "#9f1239" },
};

function hexToRgbString(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `${r}, ${g}, ${b}`;
}

function getShade(palette, shade) {
  return palette[shade] ?? palette[600];
}

function prevShade(level, step = 100) {
  return Math.max(200, level - step);
}

function nextShade(level, step = 100) {
  return Math.min(800, level + step);
}

function normalizeAccent(value) {
  return ACCENT_OPTIONS.some((opt) => opt.id === value) ? value : "yellow";
}

function normalizeLevel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 666;
  return Math.min(INTENSITY_MAX, Math.max(INTENSITY_MIN, Math.round(n)));
}

function mapIntensityToShadeLevel(intensity) {
  const clamped = normalizeLevel(intensity);
  const idx = Math.round((clamped / 1000) * 3);
  return 400 + idx * 100;
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(
    () => localStorage.getItem("ac_theme") !== "light"
  );
  const [accent, setAccent] = useState(() =>
    normalizeAccent(localStorage.getItem("ac_accent"))
  );
  const [accentLevel, setAccentLevel] = useState(() =>
    normalizeLevel(localStorage.getItem("ac_accent_level"))
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    localStorage.setItem("ac_theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const nextAccent = normalizeAccent(accent);
    const nextLevel = normalizeLevel(accentLevel);
    const shadeLevel = mapIntensityToShadeLevel(nextLevel);
    const root = document.documentElement;
    const palette = ACCENT_PALETTES[nextAccent] ?? ACCENT_PALETTES.yellow;

    const shade300 = getShade(palette, prevShade(shadeLevel, 200));
    const shade400 = getShade(palette, prevShade(shadeLevel, 100));
    const shade500 = getShade(palette, shadeLevel);
    const shade600 = getShade(palette, nextShade(shadeLevel, 100));

    root.dataset.accent = nextAccent;
    root.style.setProperty("--accent-300", shade300);
    root.style.setProperty("--accent-400", shade400);
    root.style.setProperty("--accent-500", shade500);
    root.style.setProperty("--accent-600", shade600);
    root.style.setProperty("--accent-rgb", hexToRgbString(shade500));

    localStorage.setItem("ac_accent", nextAccent);
    localStorage.setItem("ac_accent_level", String(nextLevel));
  }, [accent, accentLevel]);

  return (
    <ThemeContext.Provider
      value={{
        dark,
        toggle: () => setDark((d) => !d),
        accent,
        setAccent: (value) => setAccent(normalizeAccent(value)),
        accentLevel,
        setAccentLevel: (value) => setAccentLevel(normalizeLevel(value)),
        accentOptions: ACCENT_OPTIONS,
        accentLevels: [0, 250, 500, 750, 1000],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
