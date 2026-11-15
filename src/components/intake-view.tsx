"use client";

import { motion } from "framer-motion";
import { FileUp, Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { ModelArchitecture } from "@/components/model-architecture";
import { ResearchCredits } from "@/components/research-credits";
import { log, error as logError } from "@/lib/debug";
import {
  SAMPLE_SEQUENCES,
  isDnaSequence,
  normalizeSequence,
} from "@/lib/sequence";
import type { SequenceRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Dedicated intake screen — sequence entry + model briefing.
 * The strand theater opens after a run is requested.
 */
export function IntakeView({
  busy,
  modelReady,
  modelError,
  onSubmit,
}: {
  busy: boolean;
  modelReady: boolean;
  modelError: string;
  onSubmit: (seqs: SequenceRecord[]) => void;
}) {
  const [mode, setMode] = useState<"demo" | "paste" | "file">("demo");
  const [paste, setPaste] = useState("");
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState("");
  const [available, setAvailable] = useState<SequenceRecord[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const selected = available.filter((s) => picked[s.id]);

  async function loadFile(file: File | null) {
    if (!file) return;
    try {
      const { parseSequenceFile } = await import("@/lib/parse-file");
      const records = await parseSequenceFile(file);
      setAvailable(records);
      setFilename(file.name);
      setPicked(
        Object.fromEntries(
          records.slice(0, Math.min(3, records.length)).map((r) => [r.id, true]),
        ),
      );
      setMode("file");
      setNotice(null);
      log("intake parsed", records.length);
    } catch (e) {
      logError("intake parse", e);
      setNotice(e instanceof Error ? e.message : "Parse failed");
    }
  }

  function submit() {
    setNotice(null);
    if (mode === "demo") return;
    if (mode === "file") {
      if (!selected.length) {
        setNotice("Select at least one sequence.");
        return;
      }
      onSubmit(selected);
      return;
    }
    const seq = normalizeSequence(paste);
    if (!seq) {
      setNotice("Paste a DNA/RNA sequence first.");
      return;
    }
    if (!isDnaSequence(seq)) {
      setNotice("Only A/T/G/C/N bases are accepted (U is mapped to T).");
      return;
    }
    onSubmit([{ id: "pasted-strand", name: "Pasted strand", seq }]);
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(94,234,212,0.12),transparent_45%),radial-gradient(ellipse_at_90%_20%,rgba(56,189,248,0.08),transparent_40%),linear-gradient(165deg,#061014,#0a1518_40%,#071010)]" />
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(94,234,212,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(94,234,212,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="grain absolute inset-0" />
      </div>

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-8">
        <div>
          <p className="font-display text-2xl tracking-tight">RiboSense</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
            riboswitch detection · classification
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              modelReady
                ? "bg-[var(--signal)] shadow-[0_0_10px_var(--signal)]"
                : modelError
                  ? "bg-[var(--warn)]"
                  : "animate-pulse bg-teal-300",
            )}
          />
          {modelReady ? "models ready" : modelError ? "fault" : "loading models"}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-teal-300/80">
            genomic riboswitch observatory
          </p>
          <h1 className="font-display mt-3 text-4xl leading-[1.05] tracking-tight text-[var(--ink)] sm:text-5xl">
            Find riboswitch domains in your sequence
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--ink-dim)] sm:text-lg">
            Load DNA (or RNA with U→T), then watch a detector scan for
            riboswitch-like windows and a classifier assign one of 31 ligand
            families — with probabilities on every hit.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.55 }}
          className="mt-10 max-w-3xl overflow-hidden rounded-[1.75rem] border border-teal-500/20 bg-[rgba(6,16,18,0.85)] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void loadFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <div
            className={cn(
              "border-b border-[var(--line)] px-5 py-4",
              dragging && "bg-teal-500/10",
            )}
          >
            <div className="mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-teal-300/70">
                step 01 · load strand
              </p>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                Then open the strand theater to see detected domains locked on
                the helix.
              </p>
            </div>
            <div className="flex gap-2">
              {(
                [
                  ["demo", "Demo"],
                  ["paste", "Paste"],
                  ["file", "File"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                    mode === id
                      ? "bg-teal-300 text-[#041014]"
                      : "bg-white/5 text-[var(--ink-dim)] hover:text-[var(--ink)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-5">
            {mode === "demo" && (
              <div className="grid gap-2">
                {SAMPLE_SEQUENCES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={busy || !modelReady || Boolean(modelError)}
                    onClick={() => onSubmit([s])}
                    className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-teal-300/35 hover:bg-teal-300/5 disabled:opacity-40"
                  >
                    <span className="mt-0.5 font-mono text-[10px] text-teal-300/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                        <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                        {s.name}
                      </span>
                      <span className="mt-1 block font-mono text-[11px] text-[var(--ink-faint)]">
                        {s.seq.length} bp
                        {s.id === "multi-hit-strand"
                          ? " · multi-family demo"
                          : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {mode === "paste" && (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    rows={7}
                    placeholder="ATGC… DNA preferred; RNA U is mapped to T"
                    className="w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm leading-relaxed outline-none focus:border-teal-300/40"
                  />
                  {paste && (
                    <button
                      type="button"
                      className="absolute right-3 top-3 rounded-lg bg-black/50 p-1.5 text-[var(--ink-faint)]"
                      onClick={() => setPaste("")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy || !modelReady || Boolean(modelError)}
                  onClick={submit}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-300 text-sm font-semibold text-[#041014] disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Detect &amp; classify on strand
                </button>
              </div>
            )}

            {mode === "file" && (
              <div className="space-y-3">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-black/25 px-4 py-10 text-sm text-[var(--ink-dim)] hover:border-teal-300/40">
                  <FileUp className="h-5 w-5 text-teal-300" />
                  {filename || "Drop FASTA / GenBank / SBOL"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".fasta,.fa,.gb,.gnk,.sbol,.txt"
                    onChange={(e) => void loadFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {available.length > 0 && (
                  <>
                    <ul className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-white/10 p-2">
                      {available.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setPicked((p) => ({ ...p, [s.id]: !p[s.id] }))
                            }
                            className={cn(
                              "flex w-full justify-between rounded-lg px-2.5 py-2 text-left text-sm",
                              picked[s.id]
                                ? "bg-teal-300/15 text-[var(--ink)]"
                                : "text-[var(--ink-dim)]",
                            )}
                          >
                            <span className="truncate">{s.id}</span>
                            <span className="font-mono text-[10px]">
                              {s.seq.length}bp
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      disabled={busy || !modelReady || Boolean(modelError)}
                      onClick={submit}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-300 text-sm font-semibold text-[#041014] disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Annotate {selected.length} strand
                      {selected.length === 1 ? "" : "s"}
                    </button>
                  </>
                )}
              </div>
            )}

            {(notice || modelError) && (
              <p className="mt-4 text-sm text-[var(--warn)]">
                {notice || modelError}
              </p>
            )}
          </div>
        </motion.div>

        <ModelArchitecture />

        <ResearchCredits className="mt-12 max-w-3xl" />
      </main>
    </div>
  );
}
