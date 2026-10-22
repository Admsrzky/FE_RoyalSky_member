"use client";

import { useEffect } from "react";

import { Icon } from "./icons";

const THEME_KEY = "rs-theme";
const LIGHT_THEME_COLOR = "#eef5f4";
const DARK_THEME_COLOR = "#05080b";

type Theme = "light" | "dark";

function applyTheme(theme: Theme, persist = false) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  if (persist) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // The toggle still works for this page when storage is unavailable.
    }
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      "content",
      theme === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR,
    );
  }
}

export function ThemeToggle() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");

    function followSystem(event: MediaQueryListEvent) {
      try {
        if (window.localStorage.getItem(THEME_KEY)) return;
      } catch {
        // Fall through and follow the system preference.
      }
      applyTheme(event.matches ? "light" : "dark");
    }

    function syncAcrossTabs(event: StorageEvent) {
      if (event.key !== THEME_KEY) return;
      applyTheme(event.newValue === "light" ? "light" : "dark");
    }

    media.addEventListener?.("change", followSystem);
    window.addEventListener("storage", syncAcrossTabs);

    return () => {
      media.removeEventListener?.("change", followSystem);
      window.removeEventListener("storage", syncAcrossTabs);
    };
  }, []);

  function toggle() {
    const current =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    applyTheme(current === "light" ? "dark" : "light", true);
  }

  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggle}
      aria-label="Ganti mode terang atau gelap"
      title="Ganti mode terang/gelap"
    >
      <Icon name="sun" size={16} className="theme-icon theme-icon-sun" />
      <Icon name="moon" size={16} className="theme-icon theme-icon-moon" />
    </button>
  );
}
