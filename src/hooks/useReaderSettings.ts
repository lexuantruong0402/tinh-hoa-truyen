import { useState } from "react";
import { Theme, FontType } from "@/src/types";

export function useReaderSettings() {
  const [theme, setTheme] = useState<Theme>("sepia");
  const [fontSize, setFontSize] = useState(20);
  const [fontType, setFontType] = useState<FontType>("serif");

  const decreaseFontSize = () => setFontSize(Math.max(12, fontSize - 2));
  const increaseFontSize = () => setFontSize(Math.min(32, fontSize + 2));

  const themes: Record<Theme, string> = {
    light: "bg-white text-slate-800 border-gray-200",
    dark: "bg-slate-900 text-slate-300 border-slate-800",
    sepia: "bg-[#FCF9F1] text-slate-800 border-amber-200/50",
  };

  return {
    theme,
    setTheme,
    fontSize,
    fontType,
    setFontType,
    decreaseFontSize,
    increaseFontSize,
    themes,
  };
}