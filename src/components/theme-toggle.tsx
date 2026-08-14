"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("tema", next ? "oscuro" : "claro");
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-muted"
    >
      {dark ? "☀️ Modo claro" : "🌙 Modo oscuro"}
    </button>
  );
}
