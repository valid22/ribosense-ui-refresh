"use client";

import { useState } from "react";
import { IntakeView } from "@/components/intake-view";
import { StrandTheater } from "@/components/strand-theater";
import { useAnnotation } from "@/hooks/use-annotation";
import { log } from "@/lib/debug";
import type { SequenceRecord } from "@/lib/types";

type View = "intake" | "theater";

export function Observatory() {
  const {
    modelReady,
    modelError,
    results,
    pipeline,
    busy,
    annotate,
    scanCursor,
  } = useAnnotation();

  const [view, setView] = useState<View>("intake");
  const [pending, setPending] = useState<SequenceRecord | null>(null);

  async function handleSubmit(seqs: SequenceRecord[]) {
    setPending(seqs[0] || null);
    setView("theater");
    log("intake → theater", { ids: seqs.map((s) => s.id) });
    try {
      await annotate(seqs);
    } catch (e) {
      log("annotate failed after navigation", e);
    }
  }

  if (view === "intake") {
    return (
      <IntakeView
        busy={busy}
        modelReady={modelReady}
        modelError={modelError}
        onSubmit={(seqs) => void handleSubmit(seqs)}
      />
    );
  }

  return (
    <StrandTheater
      result={results[0] || null}
      previewName={pending?.name}
      previewSeq={pending?.seq}
      pipeline={pipeline}
      busy={busy}
      scanCursor={scanCursor}
      onBack={() => setView("intake")}
    />
  );
}
