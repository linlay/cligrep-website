import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import zh from "./zh.json";
import type { Language } from "../types";

function detectBrowserLanguage(): Language {
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const candidate of candidates) {
    const normalized = String(candidate ?? "").trim().toLowerCase();
    if (normalized.startsWith("zh")) {
      return "zh";
    }
    if (normalized.startsWith("en")) {
      return "en";
    }
  }
  return "en";
}

const savedLang = localStorage.getItem("cligrep-lang") as Language | null;
const initialLanguage: Language = savedLang === "en" || savedLang === "zh"
  ? savedLang
  : detectBrowserLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
