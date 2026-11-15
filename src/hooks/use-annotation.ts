"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { error as logError, log } from "@/lib/debug";
import type {
  AnnotationResult,
  PipelineEvent,
  SequenceRecord,
} from "@/lib/types";

export function useAnnotation() {
  const workerRef = useRef<Worker | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState("");
  const [results, setResults] = useState<AnnotationResult[]>([]);
  const [scanCursor, setScanCursor] = useState(0);
  const [scanLen, setScanLen] = useState(0);
  const [pipeline, setPipeline] = useState<PipelineEvent>({
    stage: "idle",
    message: "Load a sequence to begin",
    progress: 0,
  });
  const [busy, setBusy] = useState(false);

  const pendingRef = useRef<{
    resolve: (r: AnnotationResult[]) => void;
    reject: (e: Error) => void;
  } | null>(null);

  useEffect(() => {
    log("spawning inference worker");
    setPipeline({
      stage: "loading-models",
      message: "Warming models in a background worker…",
      progress: 6,
    });

    const worker = new Worker(
      `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/workers/ribo-worker.js?v=strand-theater-4`,
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as {
        type: string;
        data?: unknown;
        stage?: PipelineEvent["stage"];
        message?: string;
        progress?: number;
        detail?: string;
        cursor?: number;
        seqLen?: number;
      };

      if (msg.type === "ready") {
        setModelReady(true);
        setModelError("");
        setPipeline({
          stage: "idle",
          message: "Models ready in worker · continue from intake",
          progress: 0,
        });
        log("worker ready");
        return;
      }

      if (msg.type === "error") {
        const err = String(msg.data || "Worker error");
        logError("worker error", err);
        setModelError(err);
        setModelReady(false);
        setBusy(false);
        setPipeline({ stage: "error", message: err, progress: 0 });
        pendingRef.current?.reject(new Error(err));
        pendingRef.current = null;
        return;
      }

      if (msg.type === "progress") {
        setPipeline({
          stage: msg.stage || "detecting",
          message: msg.message || "Working…",
          progress: msg.progress ?? 0,
          detail: msg.detail,
        });
        if (typeof msg.cursor === "number") setScanCursor(msg.cursor);
        if (typeof msg.seqLen === "number") setScanLen(msg.seqLen);
        return;
      }

      if (msg.type === "result") {
        const data = msg.data as AnnotationResult[];
        setResults(data);
        setBusy(false);
        setScanCursor(0);
        log("worker result", {
          strands: data.length,
          hits: data.reduce((n, r) => n + (r.hits?.length || 0), 0),
        });
        pendingRef.current?.resolve(data);
        pendingRef.current = null;
      }
    };

    worker.onerror = (err) => {
      const message = err.message || "Worker failed to start";
      logError("worker onerror", message);
      setModelError(message);
      setPipeline({ stage: "error", message, progress: 0 });
      setBusy(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const annotate = useCallback(async (sequences: SequenceRecord[]) => {
    if (!workerRef.current) throw new Error("Inference worker unavailable");
    if (sequences.length === 0) throw new Error("No sequences selected");

    setBusy(true);
    setResults([]);
    setScanCursor(0);
    setScanLen(sequences[0]?.seq.length || 0);
    log("annotate via worker", {
      count: sequences.length,
      lengths: sequences.map((s) => s.seq.length),
    });

    return new Promise<AnnotationResult[]>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      workerRef.current!.postMessage({
        type: "annotate",
        data: sequences,
        options: { stride: 25 },
      });
    });
  }, []);

  return {
    modelReady,
    modelError,
    results,
    setResults,
    pipeline,
    busy,
    annotate,
    scanCursor,
    scanLen,
  };
}
