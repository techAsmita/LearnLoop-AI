"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("learnloop-theme");

    if (saved === "dark" || saved === "light") {
      setTheme(saved);

      document.documentElement.classList.toggle(
        "dark",
        saved === "dark"
      );
    } else {
      document.documentElement.classList.remove("dark");
    }

    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme =
      theme === "light" ? "dark" : "light";

    setTheme(next);

    document.documentElement.classList.toggle(
      "dark",
      next === "dark"
    );

    window.localStorage.setItem(
      "learnloop-theme",
      next
    );
  };

  const tooltipText =
    theme === "light"
      ? "Switch to dark theme"
      : "Switch to light theme";

  if (!mounted) {
    return (
      <div className="relative group">
        <button
          type="button"
          aria-label="Toggle theme"
          className="
            flex
            items-center
            justify-center
            w-11
            h-11
            rounded-xl
            border
            border-[var(--border)]
            bg-[var(--surface)]
            text-[var(--text-secondary)]
          "
        >
          <svg
            className="w-[19px] h-[19px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={tooltipText}
        className="
          flex
          items-center
          justify-center
          w-11
          h-11
          rounded-xl
          border
          border-[var(--border)]
          bg-[var(--surface)]
          text-[var(--text-secondary)]
          hover:text-[var(--primary)]
          hover:border-[var(--primary-border)]
                    hover:bg-[var(--primary-soft)]
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-[var(--primary-border)]
          transition-all
          duration-200
        "
      >
        {theme === "light" ? (
          <svg
            className="w-[19px] h-[19px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        ) : (
          <svg
            className="w-[19px] h-[19px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z" />
          </svg>
        )}
      </button>

      {/* CUSTOM TOOLTIP */}
      <div
        className="
          pointer-events-none
          absolute
          top-[calc(100%+10px)]
          left-1/2
          -translate-x-1/2
          translate-y-[-3px]
          opacity-0
          group-hover:opacity-100
          group-hover:translate-y-0
          transition-all
          duration-150
          z-50
        "
      >
        <div
          className="
            whitespace-nowrap
            rounded-lg
            bg-[#17172b]
            px-3
            py-2
            text-[11px]
            font-semibold
            text-white
            shadow-xl
          "
        >
          {tooltipText}
        </div>
      </div>
    </div>
  );
}