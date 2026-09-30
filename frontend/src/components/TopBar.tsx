"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

interface Props {
  backendConnected: boolean | null;
  mockMode: boolean;
  onHome: () => void;
  sidebarCollapsed: boolean;
}

function SearchIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      className="w-[19px] h-[19px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 12 8-8 8 8" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

export function TopBar({
  backendConnected,
  mockMode,
  onHome,
  sidebarCollapsed,
}: Props) {
  return (
    <header
      className="
        sticky
        top-0
        z-30
        h-[72px]
        bg-[color-mix(in_srgb,var(--bg)_88%,transparent)]
        backdrop-blur-xl
        border-b
border-[var(--shell-divider-soft)]
      "
    >
      <div className="h-full flex items-center justify-between px-5 lg:px-7">
        {/* MOBILE BRAND */}
        <div className="mobile-topbar flex items-center gap-3">
          <button
            onClick={onHome}
            className="
              w-9
              h-9
              rounded-xl
              bg-gradient-to-br
              from-[#7169ff]
              to-[#5148e8]
              text-white
              font-extrabold
              shadow-sm
              flex
              items-center
              justify-center
            "
            aria-label="Go to overview"
          >
            L
          </button>

          <span className="font-extrabold text-sm text-[var(--text)]">
            LearnLoop{" "}
            <span className="text-[var(--primary)]">
              AI
            </span>
          </span>
        </div>

        {/* SEARCH */}
        <div className="hidden lg:block">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <SearchIcon />
            </span>

            <input
              className="
                w-[290px]
                h-10
                rounded-xl
                bg-[var(--surface)]
                border
                border-[var(--border)]
                pl-9
                pr-4
                text-xs
                text-[var(--text-secondary)]
                outline-none
                focus:border-[var(--primary-border)]
                focus:ring-2
                focus:ring-[var(--primary-soft)]
                transition
              "
              placeholder="Search concepts, progress..."
              aria-label="Search concepts and progress"
            />
          </div>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-2.5 h-full">
          {/* CONNECTION STATUS */}
          {backendConnected === true && (
  <div
    className="
      hidden
      sm:flex
      items-center
      justify-center
      gap-2
      h-11
      px-3.5
      rounded-xl
      bg-[color-mix(in_srgb,var(--success)_12%,transparent)]
      border
      border-[color-mix(in_srgb,var(--success)_28%,transparent)]
      text-[#278968]
      dark:text-[var(--success)]
      text-[10px]
      font-bold
      whitespace-nowrap
    "
  >
    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
    {mockMode ? "Backend connected" : "AI connected"}
  </div>
)}

          {backendConnected === false && (
            <div
              className="
                hidden
                sm:flex
                items-center
                justify-center
                gap-2
                h-11
                px-3.5
                rounded-xl
                                bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]
                border
                border-[color-mix(in_srgb,var(--danger)_28%,transparent)]
                text-[#c44f68]
                dark:text-[var(--danger)]
                text-[10px]
                font-bold
                whitespace-nowrap
              "
            >
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
              Offline
            </div>
          )}

          {/* THEME */}
          <div className="flex items-center justify-center h-11">
            <ThemeToggle />
          </div>

                    {/* HOME */}
          <div className="relative group hidden sm:block">
            <button
              type="button"
              onClick={onHome}
              className="
                flex
                items-center
                justify-center
                w-11
                h-11
                rounded-xl
                bg-[var(--surface)]
                border
                border-[var(--border)]
                text-[var(--text-secondary)]
                hover:text-[var(--primary)]
                hover:border-[var(--primary-border)]
                hover:bg-[var(--primary-soft)]
                transition-all
                duration-200
              "
              aria-label="Go to overview"
            >
              <HomeIcon />
            </button>

            {/* HOME TOOLTIP */}
            <div
              className="
                pointer-events-none
                absolute
                top-[calc(100%+10px)]
                left-1/2
                -translate-x-1/2
                opacity-0
                group-hover:opacity-100
                transition-all
                duration-150
                z-50
              "
            >
              <div className="whitespace-nowrap rounded-lg bg-[#17172b] text-white text-[11px] font-bold px-3 py-2 shadow-xl">
                Go to overview
              </div>
            </div>
          </div>

          {/* LEARNER PROFILE */}
          <div className="relative group hidden sm:block">
            <button
              type="button"
              className="
                flex
                items-center
                justify-center
                w-11
                h-11
                rounded-full
                bg-[var(--primary-soft)]
                border
                border-[var(--primary-border)]
                text-sm
                font-bold
                text-[var(--primary)]
                hover:border-[var(--primary-border)]
                hover:shadow-md
                transition-all
                duration-200
              "
              aria-label="Learner profile"
            >
              L
            </button>

            {/* PROFILE TOOLTIP */}
            <div
              className="
                pointer-events-none
                absolute
                top-[calc(100%+10px)]
                right-0
                opacity-0
                group-hover:opacity-100
                transition-all
                duration-150
                z-50
              "
            >
              <div className="whitespace-nowrap rounded-lg bg-[#17172b] text-white text-[11px] font-bold px-3 py-2 shadow-xl">
                Learner profile
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}