"use client";

interface Props {
  active: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

interface IconProps {
  className?: string;
}

/* ─────────────────────────────────────────
   ICONS
───────────────────────────────────────── */

function HomeIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function PathIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="5" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M6 7v3c0 2 2 4 5 4h2c3 0 5 2 5 4v0" />
      <path d="M13 14V9c0-2-1.5-4-4-4" />
    </svg>
  );
}

function ConceptsIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="7" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M8 7h7.5" />
      <path d="m7.5 8.5 3.2 7.2" />
      <path d="m16.5 8-3.2 7.6" />
    </svg>
  );
}

function ProgressIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-3 3 2 6-7" />
      <path d="M16 7h3v3" />
    </svg>
  );
}

function InsightsIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M8.5 14.5a6 6 0 1 1 7 0" />
      <path d="M12 8v4" />
      <path d="M10.5 12h3" />
    </svg>
  );
}

function EvaluationIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6" />
      <path d="M10 3v5l-4.5 8.5A3 3 0 0 0 8.2 21h7.6a3 3 0 0 0 2.7-4.5L14 8V3" />
      <path d="M8 15h8" />
      <path d="M10 18h4" />
    </svg>
  );
}

function BrainIcon({ className = "" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 4.5a3 3 0 0 0-5.3 2A3.5 3.5 0 0 0 4 13a3.5 3.5 0 0 0 2.5 5.7A3 3 0 0 0 12 17V7a3 3 0 0 0-2.5-2.5Z" />
      <path d="M14.5 4.5a3 3 0 0 1 5.3 2A3.5 3.5 0 0 1 20 13a3.5 3.5 0 0 1-2.5 5.7A3 3 0 0 1 12 17V7a3 3 0 0 1 2.5-2.5Z" />
      <path d="M8 9h2" />
      <path d="M14 9h2" />
      <path d="M8 13h2" />
      <path d="M14 13h2" />
    </svg>
  );
}

function ChevronIcon({
  direction = "left",
  className = "",
}: IconProps & { direction?: "left" | "right" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <path d="m15 18-6-6 6-6" />
      ) : (
        <path d="m9 18 6-6-6-6" />
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────── */

const items = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "learning-path", label: "Learning Path", icon: PathIcon },
  { id: "progress", label: "Progress", icon: ProgressIcon },
  { id: "concepts", label: "Concepts", icon: ConceptsIcon },
  { id: "insights", label: "Insights", icon: InsightsIcon },
  { id: "evaluation", label: "Evaluation", icon: EvaluationIcon },
];

/* ─────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────── */

export function Sidebar({
  active,
  onNavigate,
  collapsed,
  onToggle,
}: Props) {
  return (
    <aside
      className={`desktop-sidebar sidebar fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-[var(--shell-divider)] bg-[var(--sidebar-bg)] transition-all duration-300 ease-out ${
  collapsed ? "w-[76px]" : "w-[238px]"
}`}
    >
      {/* BRAND */}
      <div
       className={`h-[72px] flex items-center ${
  collapsed ? "px-4" : "px-4"
}`}
      >
        <button
          onClick={() => onNavigate("overview")}
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-3"
          } w-full`}
          title={collapsed ? "LearnLoop AI" : undefined}
        >
          <div
  className={`shrink-0 rounded-[16px] bg-gradient-to-br from-[#7169ff] to-[#5148e8] flex items-center justify-center text-white font-extrabold shadow-[0_8px_22px_rgba(99,91,255,0.22)] ${
    collapsed
      ? "w-[52px] h-[52px] text-xl"
      : "w-[44px] h-[44px] text-lg"
  }`}
>
            L
          </div>

          {!collapsed && (
            <div className="text-left min-w-0">
              <p className="whitespace-nowrap font-extrabold text-[18px] leading-none tracking-[-0.03em] text-[var(--text)]">
  LearnLoop{" "}
  <span className="text-[var(--primary)]">
    AI
  </span>
</p>

             <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.16em] font-bold mt-1.5">
  Adaptive Tutor
</p>
            </div>
          )}
        </button>
      </div>

      {/* NAVIGATION */}
      <div
        className={`pt-7 ${
          collapsed ? "px-3" : "px-4"
        }`}
      >
        {!collapsed && (
          <div className="flex items-center justify-between px-3 mb-3">
            <p className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-[0.18em]">
              Workspace
            </p>

            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] opacity-60" />
          </div>
        )}

        <nav className="space-y-1.5">
          {items.map((item) => {
            const selected = active === item.id;
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="relative group"
              >
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`sidebar-item w-full flex items-center ${
                    collapsed
                      ? "justify-center"
                      : "gap-3.5"
                  } px-3 py-3 rounded-xl text-left text-[14px] font-semibold transition-all duration-200 ${
                    selected
                      ? "active bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary-border)] shadow-[0_5px_18px_rgba(99,91,255,0.08)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text)] border border-transparent"
                  }`}
                  aria-label={item.label}
                >
                  <span
                    className={`w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center transition-colors ${
                      selected
                        ? "bg-[var(--surface)] shadow-sm"
                        : "bg-transparent"
                    }`}
                  >
                    <Icon className="w-[19px] h-[19px]" />
                  </span>

                  {!collapsed && (
                    <span className="truncate">
                      {item.label}
                    </span>
                  )}
                </button>

                {/* COLLAPSED TOOLTIP */}
                {collapsed && (
                  <div className="pointer-events-none absolute left-[64px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-150 z-50">
                    <div className="whitespace-nowrap rounded-lg bg-[var(--text)] text-[var(--surface)] text-[11px] font-bold px-3 py-2 shadow-xl border border-[var(--border)]">
                      {item.label}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* LOWER AREA */}
      <div
  className={`mt-auto pt-6 ${
    collapsed ? "px-3 pb-5" : "px-5 pb-6"
  }`}
>
        {/* LEARNER TWIN */}
        {!collapsed ? (
          <div className="rounded-[20px] bg-[var(--surface-soft)] border border-[var(--primary-border)] p-4 shadow-[0_10px_30px_rgba(99,91,255,0.06)]">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-3 text-[var(--primary)]">
              <BrainIcon className="w-[19px] h-[19px]" />
            </div>

            <div className="flex items-center gap-2">
              <p className="text-[13px] font-extrabold text-[var(--text)]">
                Learner Twin
              </p>

              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            </div>

            <p className="text-[10.5px] text-[var(--text-secondary)] leading-[1.65] mt-1.5">
              LearnLoop continuously updates your
              learning model from every attempt.
            </p>
          </div>
        ) : (
          <div className="relative group flex justify-center">
            <button
              onClick={() => onNavigate("progress")}
              className="w-10 h-10 rounded-xl bg-[var(--surface-soft)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)] shadow-sm"
              aria-label="Learner Twin"
            >
              <BrainIcon className="w-[19px] h-[19px]" />
            </button>

            <div className="pointer-events-none absolute left-[56px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 z-50">
              <div className="whitespace-nowrap rounded-lg bg-[var(--text)] text-[var(--surface)] text-[11px] font-bold px-3 py-2 shadow-xl">
                Learner Twin
              </div>
            </div>
          </div>
        )}

        {/* LEARNER IDENTITY */}
        {!collapsed && (
          <div className="flex items-center gap-3 mt-5 px-2">
            <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--primary-soft)] border border-[var(--primary-border)] flex items-center justify-center text-sm font-extrabold text-[var(--primary)]">
              L
            </div>

            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-[var(--text)]">
                Learner
              </p>

              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                AI / ML Explorer
              </p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="relative group flex justify-center mt-4">
            <div className="w-9 h-9 rounded-full bg-[var(--primary-soft)] border border-[var(--primary-border)] flex items-center justify-center text-sm font-extrabold text-[var(--primary)]">
              L
            </div>

            <div className="pointer-events-none absolute left-[52px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 z-50">
              <div className="whitespace-nowrap rounded-lg bg-[var(--text)] text-[var(--surface)] text-[11px] font-bold px-3 py-2 shadow-xl">
                Learner · AI / ML Explorer
              </div>
            </div>
          </div>
        )}

        {/* COLLAPSE BUTTON */}
        <button
          onClick={onToggle}
          className={`mt-4 w-full h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--primary-border)] hover:bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all duration-200 flex items-center ${
            collapsed
              ? "justify-center"
              : "justify-center gap-2"
          }`}
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          <ChevronIcon
            direction={
              collapsed ? "right" : "left"
            }
            className="w-4 h-4"
          />

          {!collapsed && (
            <span className="text-[10px] font-extrabold tracking-wide">
              Collapse
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}