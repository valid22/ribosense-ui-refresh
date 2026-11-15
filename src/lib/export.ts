import { classLabel } from "./labels";
import type { AnnotationResult } from "./types";

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map(String)
        .map((v) => v.replaceAll('"', '""'))
        .map((v) => `"${v}"`)
        .join(","),
    )
    .join("\r\n");
}

export function exportHitsCsv(results: AnnotationResult[]) {
  const headers = [
    "Sequence ID",
    "Sequence Name",
    "Hit #",
    "Start (1-based)",
    "End (1-based inclusive)",
    "Length (bp)",
    "Family",
    "Class Index",
    "Detector Probability",
    "Detector %",
    "Classifier Probability",
    "Classifier %",
  ];

  const values: string[][] = [];
  for (const r of results) {
    if (!r.hits?.length) {
      values.push([
        r.id,
        r.name,
        "",
        "",
        "",
        "",
        "",
        "",
        String(r.detectorModelClassification?.probability ?? ""),
        r.detectorModelClassification
          ? (r.detectorModelClassification.probability * 100).toFixed(2)
          : "",
        "",
        "",
      ]);
      continue;
    }
    r.hits.forEach((hit, i) => {
      values.push([
        r.id,
        r.name,
        String(i + 1),
        String(hit.start + 1),
        String(hit.end),
        String(hit.end - hit.start),
        hit.label || classLabel(hit.classIndex),
        String(hit.classIndex),
        String(hit.detectorProbability),
        (hit.detectorProbability * 100).toFixed(2),
        String(hit.classifierProbability),
        (hit.classifierProbability * 100).toFixed(2),
      ]);
    });
  }

  downloadBlob(
    `RiboSense-hits-${stamp()}.csv`,
    new Blob([toCsv([headers, ...values])], {
      type: "text/csv;charset=utf-8;",
    }),
  );
}

/** BED6 tracks — score encodes classifier % (0–1000). */
export function exportHitsBed(results: AnnotationResult[]) {
  const lines = [
    `# RiboSense riboswitch hits · ${stamp()}`,
    `# chrom  start  end  name  score  strand`,
  ];
  for (const r of results) {
    const chrom = r.id.replace(/\s+/g, "_") || "seq";
    for (const hit of r.hits || []) {
      const score = Math.round(
        Math.min(1000, Math.max(0, hit.classifierProbability * 1000)),
      );
      const name = (hit.label || classLabel(hit.classIndex)).replace(
        /\s+/g,
        "_",
      );
      lines.push(
        `${chrom}\t${hit.start}\t${hit.end}\t${name}\t${score}\t+`,
      );
    }
  }
  downloadBlob(
    `RiboSense-hits-${stamp()}.bed`,
    new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8;" }),
  );
}

/** GFF3 with detector/classifier probabilities in attributes. */
export function exportHitsGff3(results: AnnotationResult[]) {
  const lines = [
    "##gff-version 3",
    `# RiboSense riboswitch annotation · ${stamp()}`,
  ];
  for (const r of results) {
    const seqid = r.id.replace(/\s+/g, "_") || "seq";
    (r.hits || []).forEach((hit, i) => {
      const family = hit.label || classLabel(hit.classIndex);
      const attrs = [
        `ID=${seqid}.ribo.${i + 1}`,
        `Name=${escapeGff(family)}`,
        `family=${escapeGff(family)}`,
        `class_index=${hit.classIndex}`,
        `detector_prob=${hit.detectorProbability.toFixed(6)}`,
        `classifier_prob=${hit.classifierProbability.toFixed(6)}`,
        `detector_pct=${(hit.detectorProbability * 100).toFixed(2)}`,
        `classifier_pct=${(hit.classifierProbability * 100).toFixed(2)}`,
      ].join(";");
      lines.push(
        [
          seqid,
          "RiboSense",
          "riboswitch",
          hit.start + 1,
          hit.end,
          hit.classifierProbability.toFixed(4),
          "+",
          ".",
          attrs,
        ].join("\t"),
      );
    });
  }
  downloadBlob(
    `RiboSense-hits-${stamp()}.gff3`,
    new Blob([lines.join("\n") + "\n"], {
      type: "text/plain;charset=utf-8;",
    }),
  );
}

function escapeGff(s: string) {
  return s.replace(/[;=,&]/g, (c) => encodeURIComponent(c));
}

export function exportHitsJson(results: AnnotationResult[]) {
  const payload = {
    tool: "RiboSense",
    exportedAt: new Date().toISOString(),
    pipeline: "detector → classifier (31 riboswitch families)",
    results: results.map((r) => ({
      id: r.id,
      name: r.name,
      length: r.seq.length,
      windowsScanned: r.windowsScanned,
      hits: (r.hits || []).map((h) => ({
        start: h.start + 1,
        end: h.end,
        length: h.end - h.start,
        family: h.label || classLabel(h.classIndex),
        classIndex: h.classIndex,
        detectorProbability: h.detectorProbability,
        detectorPercent: Number((h.detectorProbability * 100).toFixed(2)),
        classifierProbability: h.classifierProbability,
        classifierPercent: Number((h.classifierProbability * 100).toFixed(2)),
      })),
    })),
  };
  downloadBlob(
    `RiboSense-hits-${stamp()}.json`,
    new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    }),
  );
}

export function exportSvgElement(svg: SVGSVGElement | null, basename: string) {
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  const xml = new XMLSerializer().serializeToString(clone);
  downloadBlob(
    `${basename}-${stamp()}.svg`,
    new Blob([xml], { type: "image/svg+xml;charset=utf-8;" }),
  );
}

/** Keep legacy name used elsewhere. */
export function downloadPredictionCsv(results: AnnotationResult[]) {
  exportHitsCsv(results);
}
