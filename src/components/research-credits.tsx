import { RESEARCH } from "@/lib/credits";
import { cn } from "@/lib/utils";

export function ResearchCredits({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className={cn("font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]", className)}>
        Models &amp; research · {RESEARCH.lab} · {RESEARCH.university} ·{" "}
        <a
          href={RESEARCH.github}
          target="_blank"
          rel="noreferrer"
          className="text-teal-300/80 underline-offset-2 hover:underline"
        >
          APalaniaLab/RiboSense
        </a>
      </p>
    );
  }

  return (
    <footer
      className={cn(
        "rounded-2xl border border-white/10 bg-black/25 px-5 py-4",
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-teal-300/70">
        research credit
      </p>
      <p className="mt-2 text-sm text-[var(--ink)]">
        {RESEARCH.lab} · {RESEARCH.university}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--ink-dim)]">
        {RESEARCH.authors.join(", ")}. {RESEARCH.citation}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-faint)]">
        Related method: {RESEARCH.related}
      </p>
      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
        <a
          href={RESEARCH.github}
          target="_blank"
          rel="noreferrer"
          className="text-teal-300/80 hover:text-teal-200"
        >
          GitHub
        </a>
        <a
          href={RESEARCH.site}
          target="_blank"
          rel="noreferrer"
          className="text-teal-300/80 hover:text-teal-200"
        >
          Original tool
        </a>
        <a
          href={RESEARCH.relatedDoi}
          target="_blank"
          rel="noreferrer"
          className="text-teal-300/80 hover:text-teal-200"
        >
          Riboflow DOI
        </a>
      </div>
    </footer>
  );
}
