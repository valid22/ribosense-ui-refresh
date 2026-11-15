"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowLeft,
  ChevronDown,
  Crosshair,
  Download,
  Minus,
  Plus,
  ZoomIn,
} from "lucide-react";
import { ResearchCredits } from "@/components/research-credits";
import {
  exportHitsBed,
  exportHitsCsv,
  exportHitsGff3,
  exportHitsJson,
  exportSvgElement,
} from "@/lib/export";
import type { AnnotationResult, PipelineEvent, StrandHit } from "@/lib/types";
import { cn, formatProb } from "@/lib/utils";

const BASE_FILL: Record<string, string> = {
  A: "#2dd4bf",
  T: "#fb923c",
  G: "#38bdf8",
  C: "#fbbf24",
  N: "#64748b",
};

const ZOOM_STEPS = [10, 14, 18, 22, 28, 36, 48] as const;
const DEFAULT_ZOOM_IDX = 3; // 22

type Props = {
  result: AnnotationResult | null;
  previewName?: string;
  previewSeq?: string;
  pipeline: PipelineEvent;
  busy: boolean;
  scanCursor: number;
  onBack: () => void;
};

/**
 * Horizontal paired-helix theater.
 * Actual bases sit on a soft helical ribbon; pan with drag/wheel; zoom with controls.
 */
export function StrandTheater({
  result,
  previewName,
  previewSeq,
  pipeline,
  busy,
  scanCursor,
  onBack,
}: Props) {
  const seq = result?.seq || previewSeq || "";
  const hits = result?.hits || [];
  const name = result?.name || previewName || "Strand";

  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [offset, setOffset] = useState(0);
  const [viewportW, setViewportW] = useState(900);
  const [focusHit, setFocusHit] = useState<string | null>(null);
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);
  const [exportOpen, setExportOpen] = useState(false);
  const dragRef = useRef<{ x: number; origin: number } | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const bpWidth = ZOOM_STEPS[zoomIdx];
  const padX = 80;
  const contentW = Math.max(viewportW, seq.length * bpWidth + padX * 2);
  const maxOffset = Math.max(0, contentW - viewportW);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportW(el.clientWidth));
    ro.observe(el);
    setViewportW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setOffset(0);
    setFocusHit(null);
  }, [seq]);

  useEffect(() => {
    if (!exportOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  const clampOffset = useCallback(
    (v: number) => Math.min(maxOffset, Math.max(0, v)),
    [maxOffset],
  );

  const panBy = useCallback(
    (dx: number) => setOffset((o) => clampOffset(o - dx)),
    [clampOffset],
  );

  /** Keep the same genomic center when zooming. */
  const setZoomKeepingCenter = useCallback(
    (nextIdx: number) => {
      const clamped = Math.min(ZOOM_STEPS.length - 1, Math.max(0, nextIdx));
      const oldBp = ZOOM_STEPS[zoomIdx];
      const newBp = ZOOM_STEPS[clamped];
      const centerBp = (offset + viewportW / 2 - padX) / oldBp;
      const nextContent = Math.max(
        viewportW,
        seq.length * newBp + padX * 2,
      );
      const nextMax = Math.max(0, nextContent - viewportW);
      const nextOffset = Math.min(
        nextMax,
        Math.max(0, centerBp * newBp + padX - viewportW / 2),
      );
      setZoomIdx(clamped);
      setOffset(nextOffset);
    },
    [zoomIdx, offset, viewportW, seq.length],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setZoomKeepingCenter(zoomIdx + (e.deltaY < 0 ? 1 : -1));
        return;
      }
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      panBy(-delta);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [panBy, setZoomKeepingCenter, zoomIdx]);

  const jumpToHit = (hit: StrandHit) => {
    setFocusHit(hit.id);
    const center = padX + ((hit.start + hit.end) / 2) * bpWidth;
    setOffset(clampOffset(center - viewportW / 2));
  };

  useEffect(() => {
    if (!busy || !seq.length) return;
    const center = padX + scanCursor * bpWidth;
    setOffset(clampOffset(center - viewportW / 2));
  }, [busy, scanCursor, seq.length, viewportW, clampOffset, bpWidth]);

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, origin: offset };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    setOffset(clampOffset(dragRef.current.origin - dx));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const scrubProgress = maxOffset === 0 ? 0 : offset / maxOffset;
  const bases = useMemo(() => seq.split(""), [seq]);

  const runExport = (kind: "csv" | "bed" | "gff3" | "json" | "svg") => {
    setExportOpen(false);
    if (!result) return;
    if (kind === "csv") exportHitsCsv([result]);
    else if (kind === "bed") exportHitsBed([result]);
    else if (kind === "gff3") exportHitsGff3([result]);
    else if (kind === "json") exportHitsJson([result]);
    else exportSvgElement(svgRef.current, "RiboSense-strand");
  };

  const viewRange = (() => {
    if (!seq.length) return "view — / 0";
    const startBp = Math.min(
      seq.length,
      Math.max(1, Math.floor((offset - padX) / bpWidth) + 1),
    );
    const endBp = Math.min(
      seq.length,
      Math.max(
        startBp,
        Math.floor((offset + viewportW - padX) / bpWidth),
      ),
    );
    return `view ${startBp}–${endBp} / ${seq.length}`;
  })();

  return (
    <div className="relative flex min-h-screen flex-col bg-[#050a0c] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(45,212,191,0.08),transparent_50%),linear-gradient(180deg,#050a0c,#071316_55%,#050a0c)]" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(45,212,191,0.12)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <header className="mx-auto flex w-full max-w-[1500px] items-start justify-between gap-4 px-5 pt-5 sm:px-8">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-[var(--ink-dim)] hover:border-teal-300/30 hover:text-[var(--ink)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Intake
          </button>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-teal-300/70">
              riboswitch annotation · strand theater
            </p>
            <h1 className="font-display mt-1 text-2xl tracking-tight sm:text-3xl">
              {name}
            </h1>
            <p className="mt-1 font-mono text-[11px] text-[var(--ink-faint)]">
              {seq.length} bp · {hits.length} riboswitch hit
              {hits.length === 1 ? "" : "s"} · detector → classifier
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="max-w-sm text-right">
            <p className="text-sm text-[var(--ink)]">{pipeline.message}</p>
            <p className="mt-1 font-mono text-[10px] text-[var(--ink-faint)]">
              {Math.round(pipeline.progress)}%
              {pipeline.detail ? ` · ${pipeline.detail}` : ""}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-300 to-sky-400 transition-[width] duration-300"
                style={{ width: `${pipeline.progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ZoomControls
              zoomIdx={zoomIdx}
              bpWidth={bpWidth}
              onZoom={setZoomKeepingCenter}
            />
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                disabled={!result || busy}
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-[var(--ink-dim)] hover:border-teal-300/30 hover:text-[var(--ink)] disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0a1416] shadow-xl">
                  {(
                    [
                      ["csv", "CSV table"],
                      ["bed", "BED track"],
                      ["gff3", "GFF3 annotation"],
                      ["json", "JSON report"],
                      ["svg", "Strand SVG"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className="block w-full px-3.5 py-2.5 text-left text-xs text-[var(--ink-dim)] hover:bg-teal-300/10 hover:text-[var(--ink)]"
                      onClick={() => runExport(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-4 flex w-full max-w-[1500px] flex-wrap items-center gap-3 px-5 sm:px-8">
        {(["A", "T", "G", "C"] as const).map((b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[11px]"
          >
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: BASE_FILL[b] }}
            />
            {b}
          </span>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        <span className="text-xs text-[var(--ink-faint)]">
          Color wash + bracket = detected riboswitch · % = classifier
          confidence · dim complement = paired helix
        </span>
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-[1500px] flex-1 px-5 sm:px-8">
        <div
          ref={viewportRef}
          className="relative h-[min(62vh,640px)] cursor-grab overflow-hidden rounded-[1.75rem] border border-teal-500/15 bg-[rgba(4,12,14,0.9)] active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,10,12,0.85),transparent_8%,transparent_92%,rgba(5,10,12,0.85))]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-teal-500/5 to-transparent" />

          <div
            className="absolute top-0 h-full will-change-transform"
            style={{
              width: contentW,
              transform: `translate3d(${-offset}px, 0, 0)`,
            }}
          >
            <StrandRibbon
              svgRef={svgRef}
              bases={bases}
              hits={hits}
              bpWidth={bpWidth}
              padX={padX}
              height={560}
              focusHit={focusHit}
              busy={busy}
              scanCursor={scanCursor}
            />
          </div>

          {!seq && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--ink-dim)]">
              No sequence loaded
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            <span>genomic scrubber · ⌘/Ctrl+wheel to zoom</span>
            <span>
              {viewRange} · {bpWidth}px/bp
            </span>
          </div>
          <Scrubber
            width={Math.max(1, viewportW - 32)}
            seqLen={seq.length || 1}
            hits={hits}
            progress={scrubProgress}
            onSeek={(p) => setOffset(clampOffset(p * maxOffset))}
          />
        </div>
      </div>

      <div className="mx-auto mt-5 w-full max-w-[1500px] px-5 pb-8 sm:px-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-teal-300/70">
              prediction dossier
            </p>
            <p className="mt-1 text-sm text-[var(--ink-dim)]">
              Each tile is one detector-positive window classified into a
              riboswitch family.
            </p>
          </div>
        </div>

        {hits.length === 0 && !busy ? (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-[var(--ink-dim)]">
            No riboswitch domains detected on this strand (detector found no
            high-confidence windows).
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hits.map((hit, i) => (
              <PredictionTile
                key={hit.id}
                hit={hit}
                index={i}
                focused={focusHit === hit.id}
                onJump={() => jumpToHit(hit)}
              />
            ))}
          </div>
        )}

        <ResearchCredits className="mt-8" compact />
      </div>
    </div>
  );
}

function ZoomControls({
  zoomIdx,
  bpWidth,
  onZoom,
}: {
  zoomIdx: number;
  bpWidth: number;
  onZoom: (idx: number) => void;
}) {
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5">
      <button
        type="button"
        aria-label="Zoom out"
        disabled={zoomIdx <= 0}
        onClick={() => onZoom(zoomIdx - 1)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--ink-dim)] hover:bg-white/10 hover:text-[var(--ink)] disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="inline-flex min-w-[4.5rem] items-center justify-center gap-1 font-mono text-[10px] text-[var(--ink-faint)]">
        <ZoomIn className="h-3 w-3" />
        {bpWidth}px
      </span>
      <button
        type="button"
        aria-label="Zoom in"
        disabled={zoomIdx >= ZOOM_STEPS.length - 1}
        onClick={() => onZoom(zoomIdx + 1)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--ink-dim)] hover:bg-white/10 hover:text-[var(--ink)] disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PredictionTile({
  hit,
  index,
  focused,
  onJump,
}: {
  hit: StrandHit;
  index: number;
  focused: boolean;
  onJump: () => void;
}) {
  const clsPct = hit.classifierProbability * 100;
  const detPct = hit.detectorProbability * 100;
  const len = hit.end - hit.start;

  return (
    <button
      type="button"
      onClick={onJump}
      className={cn(
        "group rounded-2xl border bg-white/[0.03] p-4 text-left transition",
        focused
          ? "border-teal-300/40"
          : "border-white/10 hover:border-teal-300/30",
      )}
      style={{
        boxShadow: focused ? `inset 0 0 0 1px ${hit.color}` : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
            hit {String(index + 1).padStart(2, "0")} · riboswitch
          </span>
          <p
            className="mt-1.5 font-display text-lg leading-snug"
            style={{ color: hit.color }}
          >
            {hit.label}
          </p>
        </div>
        <div className="text-right">
          <p
            className="font-display text-3xl font-semibold leading-none tracking-tight"
            style={{ color: hit.color }}
          >
            {clsPct.toFixed(1)}
            <span className="text-lg">%</span>
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            classifier
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric
          label="Detector P(ribo)"
          value={`${detPct.toFixed(1)}%`}
          bar={detPct}
          color="#2dd4bf"
        />
        <Metric
          label="Classifier P(family)"
          value={`${clsPct.toFixed(1)}%`}
          bar={clsPct}
          color={hit.color}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 font-mono text-[11px] text-[var(--ink-faint)]">
        <span>
          nt {hit.start + 1}–{hit.end} · {len} bp
        </span>
        <span className="inline-flex items-center gap-1 text-teal-300/80 opacity-80 transition group-hover:opacity-100">
          <Crosshair className="h-3.5 w-3.5" />
          jump
        </span>
      </div>
    </button>
  );
}

function Metric({
  label,
  value,
  bar,
  color,
}: {
  label: string;
  value: string;
  bar: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/25 px-2.5 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</p>
      <div className="mt-1.5 h-1 rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, bar)}%`, background: color }}
        />
      </div>
    </div>
  );
}

const COMPLEMENT: Record<string, string> = {
  A: "T",
  T: "A",
  G: "C",
  C: "G",
  N: "N",
};

function StrandRibbon({
  svgRef,
  bases,
  hits,
  bpWidth,
  padX,
  height,
  focusHit,
  busy,
  scanCursor,
}: {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  bases: string[];
  hits: StrandHit[];
  bpWidth: number;
  padX: number;
  height: number;
  focusHit: string | null;
  busy: boolean;
  scanCursor: number;
}) {
  const midY = height * 0.55;
  const amp = 42;
  const n = Math.max(bases.length, 1);
  const phase = 0.22;
  const showLetters = bpWidth >= 16;
  const senseR = bpWidth >= 28 ? 12 : bpWidth >= 18 ? 10 : bpWidth >= 14 ? 8 : 5.5;
  const compR = Math.max(4, senseR * 0.65);

  const senseAt = (i: number) => {
    const x = padX + i * bpWidth;
    const y = midY + Math.sin(i * phase) * amp;
    return { x, y };
  };

  const complementAt = (i: number) => {
    const x = padX + i * bpWidth;
    const y = midY + Math.sin(i * phase + Math.PI) * amp;
    return { x, y };
  };

  let sensePath = "";
  let complementPath = "";
  for (let i = 0; i < n; i++) {
    const s = senseAt(i);
    const c = complementAt(i);
    sensePath += i === 0 ? `M ${s.x} ${s.y}` : ` L ${s.x} ${s.y}`;
    complementPath += i === 0 ? `M ${c.x} ${c.y}` : ` L ${c.x} ${c.y}`;
  }

  const tickEvery =
    bpWidth >= 28 ? 5 : bpWidth >= 18 ? 10 : bpWidth >= 12 ? 20 : 50;

  return (
    <svg
      ref={svgRef}
      width={padX * 2 + n * bpWidth}
      height={height}
      className="select-none"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#5eead4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="railDim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#64748b" stopOpacity="0.08" />
          <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {Array.from({ length: Math.ceil(n / tickEvery) + 1 }, (_, k) => {
        const i = Math.min(k * tickEvery, n - 1);
        const { x } = senseAt(i);
        return (
          <g key={`g-${i}`}>
            <line
              x1={x}
              y1={24}
              x2={x}
              y2={height - 28}
              stroke="rgba(94,234,212,0.06)"
              strokeWidth={1}
            />
            <text
              x={x}
              y={18}
              textAnchor="middle"
              fill="rgba(232,240,236,0.28)"
              fontSize="9"
              fontFamily="JetBrains Mono, ui-monospace, monospace"
            >
              {i === 0 ? 1 : i}
            </text>
          </g>
        );
      })}

      {hits.map((hit) => {
        const a = senseAt(hit.start);
        const b = senseAt(Math.max(hit.start, hit.end - 1));
        const focused = focusHit === hit.id;
        const top = 70;
        const pct = formatProb(hit.classifierProbability);
        return (
          <g key={hit.id} opacity={focused || !focusHit ? 1 : 0.45}>
            <path
              d={buildHelixWash(hit.start, hit.end, senseAt, complementAt)}
              fill={hit.color}
              opacity={0.16}
            />
            <path
              d={`M ${a.x} ${top + 18} L ${a.x} ${top} L ${b.x} ${top} L ${b.x} ${top + 18}`}
              fill="none"
              stroke={hit.color}
              strokeWidth={focused ? 2.4 : 1.6}
              filter={focused ? "url(#glow)" : undefined}
            />
            <rect
              x={(a.x + b.x) / 2 - 86}
              y={top - 28}
              width={172}
              height={22}
              rx={11}
              fill="rgba(4,12,14,0.92)"
              stroke={hit.color}
              strokeWidth={1}
            />
            <text
              x={(a.x + b.x) / 2}
              y={top - 13}
              textAnchor="middle"
              fill={hit.color}
              fontSize="11"
              fontFamily="Manrope, ui-sans-serif, system-ui"
              fontWeight={600}
            >
              {shortLabel(hit.label)} · {pct}
            </text>
            <text
              x={(a.x + b.x) / 2}
              y={top + 36}
              textAnchor="middle"
              fill="rgba(232,240,236,0.45)"
              fontSize="10"
              fontFamily="JetBrains Mono, ui-monospace, monospace"
            >
              {hit.start + 1}–{hit.end} · det{" "}
              {formatProb(hit.detectorProbability)}
            </text>
          </g>
        );
      })}

      <path
        d={complementPath}
        fill="none"
        stroke="url(#railDim)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />

      <path
        d={sensePath}
        fill="none"
        stroke="url(#rail)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={sensePath}
        fill="none"
        stroke="rgba(94,234,212,0.22)"
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.35}
      />

      {bases.map((base, i) => {
        const s = senseAt(i);
        const c = complementAt(i);
        const pair = COMPLEMENT[base] || "N";
        const covering = hits.find((h) => i >= h.start && i < h.end);
        const unmarked = !covering;
        const inScan = busy && Math.abs(i - scanCursor) < 6;
        const senseFill = covering
          ? covering.color
          : BASE_FILL[base] || BASE_FILL.N;
        const compFill = BASE_FILL[pair] || BASE_FILL.N;
        const senseInFront = Math.cos(i * phase) >= 0;

        const rung = (
          <line
            key={`rung-${i}`}
            x1={s.x}
            y1={s.y}
            x2={c.x}
            y2={c.y}
            stroke={
              covering ? `${covering.color}66` : "rgba(148,163,184,0.28)"
            }
            strokeWidth={1.15}
            strokeDasharray="2.5 3.5"
            opacity={unmarked ? 0.45 : 0.7}
          />
        );

        const compBase = (
          <g
            key={`comp-${i}`}
            transform={`translate(${c.x}, ${c.y})`}
            opacity={0.38}
          >
            <circle r={compR} fill={compFill} />
            {showLetters && (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="#041014"
                fontSize={Math.max(7, compR + 1)}
                fontWeight={700}
                fontFamily="JetBrains Mono, ui-monospace, monospace"
              >
                {pair}
              </text>
            )}
          </g>
        );

        const senseBase = (
          <g key={`sense-${i}`} transform={`translate(${s.x}, ${s.y})`}>
            {inScan && <circle r={senseR + 5} fill="rgba(200,245,66,0.15)" />}
            <circle
              r={covering ? senseR + 1.5 : senseR}
              fill={senseFill}
              opacity={unmarked ? 0.55 : 1}
              filter={covering ? "url(#glow)" : undefined}
            />
            {showLetters && (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="#041014"
                fontSize={Math.max(8, senseR)}
                fontWeight={700}
                fontFamily="JetBrains Mono, ui-monospace, monospace"
              >
                {base}
              </text>
            )}
          </g>
        );

        return (
          <g key={i}>
            {senseInFront ? (
              <>
                {compBase}
                {rung}
                {senseBase}
              </>
            ) : (
              <>
                {senseBase}
                {rung}
                {compBase}
              </>
            )}
          </g>
        );
      })}

      {busy && scanCursor > 0 && (
        <line
          x1={senseAt(scanCursor).x}
          y1={40}
          x2={senseAt(scanCursor).x}
          y2={height - 30}
          stroke="rgba(200,245,66,0.55)"
          strokeWidth={2}
          strokeDasharray="4 6"
        />
      )}
    </svg>
  );
}

function buildHelixWash(
  start: number,
  end: number,
  senseAt: (i: number) => { x: number; y: number },
  complementAt: (i: number) => { x: number; y: number },
) {
  const last = Math.max(start, end - 1);
  let d = "";
  for (let i = start; i <= last; i++) {
    const { x, y } = senseAt(i);
    const pad = 14;
    const c = complementAt(i);
    const top = Math.min(y, c.y) - pad;
    d += i === start ? `M ${x} ${top}` : ` L ${x} ${top}`;
  }
  for (let i = last; i >= start; i--) {
    const { x, y } = senseAt(i);
    const c = complementAt(i);
    const pad = 14;
    const bottom = Math.max(y, c.y) + pad;
    d += ` L ${x} ${bottom}`;
  }
  return d + " Z";
}

function shortLabel(label: string) {
  if (label.length <= 18) return label;
  return `${label.slice(0, 16)}…`;
}

function Scrubber({
  width,
  seqLen,
  hits,
  progress,
  onSeek,
}: {
  width: number;
  seqLen: number;
  hits: StrandHit[];
  progress: number;
  onSeek: (p: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const seekFromEvent = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSeek(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
  };

  return (
    <div
      ref={trackRef}
      className="relative h-10 w-full cursor-pointer rounded-xl bg-[rgba(15,30,34,0.95)]"
      style={{ width }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        seekFromEvent(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        seekFromEvent(e.clientX);
      }}
    >
      {hits.map((h) => (
        <div
          key={h.id}
          className="absolute top-2 bottom-2 rounded-md opacity-80"
          style={{
            left: `${(h.start / seqLen) * 100}%`,
            width: `${Math.max(0.8, ((h.end - h.start) / seqLen) * 100)}%`,
            background: h.color,
            boxShadow: `0 0 12px ${h.color}66`,
          }}
        />
      ))}
      <div
        className="absolute top-1 bottom-1 w-[3px] rounded-full bg-teal-200 shadow-[0_0_12px_rgba(94,234,212,0.8)]"
        style={{ left: `calc(${progress * 100}% - 1px)` }}
      />
    </div>
  );
}
