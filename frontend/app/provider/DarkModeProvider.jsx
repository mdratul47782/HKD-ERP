// frontend/app/provider/DarkModeProvider.jsx

"use client";

import { createContext, useContext, useEffect, useState } from "react";

const DarkModeContext = createContext({ dark: false, toggleDark: () => {} });

export function useDarkMode() {
  return useContext(DarkModeContext);
}

export default function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    if (stored === "true") {
      setDark(true);
      document.documentElement.classList.add("dark");
    } else if (stored === null) {
      // Default to system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        setDark(true);
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggleDark = () => {
    setDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("darkMode", "true");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("darkMode", "false");
      }
      return next;
    });
  };

  return (
    <DarkModeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}