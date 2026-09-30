import type { ReactNode } from "react";

type Block = { heading?: string; lines: string[] };

const HEADING = /^\*\*(.+)\*\*$/;
const BULLET = /^\s*(?:[•·\-*])\s+/;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function parse(content: string): Block[] {
  const chunks = content.replace(/\r/g, "").trim().split(/\n\s*\n/);
  const blocks: Block[] = [];

  chunks.forEach((chunk, idx) => {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;

    const m = lines[0].match(HEADING);
    if (m) {
      // A lone bold first line is the lesson title, which the page H1 already shows.
      if (idx === 0 && lines.length === 1) return;
      blocks.push({ heading: m[1], lines: lines.slice(1) });
    } else {
      blocks.push({ lines });
    }
  });

  return blocks;
}

function renderLines(lines: string[]): ReactNode[] {
  const out: ReactNode[] = [];
  let list: string[] = [];

  const flush = (key: string) => {
    if (!list.length) return;
    out.push(
      <ul key={key} className="list-disc pl-5 space-y-1 marker:text-[var(--primary)]">
        {list.map((item, j) => (
          <li key={j} dangerouslySetInnerHTML={{ __html: inline(item) }} />
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((line, i) => {
    if (BULLET.test(line)) {
      list.push(line.replace(BULLET, ""));
    } else {
      flush(`ul-${i}`);
      out.push(<p key={`p-${i}`} dangerouslySetInnerHTML={{ __html: inline(line) }} />);
    }
  });
  flush("ul-end");

  return out;
}

export function LessonBody({ content }: { content: string }) {
  const blocks = parse(content);

  return (
    <div className="max-w-3xl space-y-6 text-[15px] leading-7 text-[var(--text-secondary)] [&_strong]:font-extrabold [&_strong]:text-[var(--text)] [&_em]:text-[var(--primary)]">
      {blocks.map((b, i) => {
        const isTry = b.heading?.toLowerCase().startsWith("try this");

        return (
          <section
            key={i}
            className={
              isTry
                ? "rounded-2xl border border-[var(--primary-border)] border-l-4 border-l-[var(--primary)] bg-[var(--primary-soft)] p-5"
                : ""
            }
          >
            {b.heading && (
              <h4
                className={`text-base font-extrabold mb-1.5 ${
                  isTry ? "text-[var(--primary)]" : "text-[var(--text)]"
                }`}
              >
                {b.heading}
              </h4>
            )}
            <div className="space-y-2">{renderLines(b.lines)}</div>
          </section>
        );
      })}
    </div>
  );
}