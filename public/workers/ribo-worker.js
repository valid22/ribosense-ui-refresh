/* eslint-disable no-undef */
/**
 * Off-main-thread RiboSense inference.
 * Sliding-window detector → classifier cascade so one long strand can carry
 * multiple riboswitch hits without freezing the UI thread.
 */
importScripts(
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js",
);

const DETECTOR_LEN = 256;
const CLASSIFIER_LEN = 250;
const DEFAULT_STRIDE = 20;
/** Multi-scale windows: short aptamers (~100bp) are diluted inside a raw 250bp
 *  genomic cut, so we also scan tighter windows and let the model left-pad. */
const WINDOW_SIZES = [110, 140, 180, 220, 250];

/** @type {{ detector: import('@tensorflow/tfjs').LayersModel | null, classifier: import('@tensorflow/tfjs').LayersModel | null }} */
const models = { detector: null, classifier: null };

const AMBIGUOUS = {
  R: "G",
  Y: "T",
  M: "A",
  K: "G",
  S: "G",
  W: "A",
  H: "A",
  B: "G",
  V: "G",
  D: "G",
};

const LABELS = {
  1: "Glycine Riboswitch",
  2: "Cyclic di-GMP-II riboswitch",
  3: "ZMP/ZTP riboswitch",
  4: "TPP riboswitch (THI element)",
  5: "S-adenosyl-L-homocysteine riboswitch",
  6: "SAM-I/IV variant riboswitch",
  7: "SAM riboswitch (S box leader)",
  8: "Cobalamin riboswitch",
  9: "Molybdenum Cofactor riboswitch",
  10: "SAM/SAH Riboswitch",
  11: "Abocbl Riboswitch",
  12: "nhaA-I RNA",
  13: "Fluroride riboswitch",
  14: "Purine Riboswitch",
  15: "glmS glucosamine-6-phosphate activated ribozyme",
  16: "Glutamine riboswitch",
  17: "raiA RNA",
  18: "sul RNA",
  19: "yKoK leader",
  20: "Lysine Riboswitch",
  21: "DUF1646 RNA",
  22: "Abocbl variant RNA",
  23: "ydaO/yuaA leader",
  24: "S-adenosyl methionine (SAM) riboswitch",
  25: "SMK box translational riboswitch (SAM-III)",
  26: "yybP-ykoY manganese riboswitch",
  27: "NiCo riboswitch",
  28: "Guanidine-I Riboswitch",
  29: "PreQ1 Riboswitch",
  30: "FMN Riboswitch",
  31: "THF riboswitch",
  32: "SAM riboswitch (alpha-proteobacteria)",
};

const FAMILY_COLORS = [
  "#c8f542",
  "#7dffb3",
  "#6ec8ff",
  "#f0d35a",
  "#ff8b5c",
  "#d4a1ff",
  "#5eead4",
  "#fb7185",
  "#a3e635",
  "#38bdf8",
  "#fbbf24",
  "#f472b6",
  "#34d399",
  "#818cf8",
  "#fb923c",
];

function log(...args) {
  console.log("[RiboWorker]", ...args);
}

function characterMapping(x) {
  let out = String(x).toUpperCase().replace(/U/g, "T");
  for (const [k, v] of Object.entries(AMBIGUOUS)) {
    out = out.split(k).join(v);
  }
  return out.split("");
}

function tokenize(letter) {
  const mapping = { a: 1, t: 2, g: 3, c: 4, n: 5 };
  return mapping[letter.toLowerCase()] ?? 0;
}

function letterToIndex(letter) {
  const i = "ATGCN".indexOf(letter);
  return i >= 0 ? i : 0;
}

function padSequences(a, m) {
  if (a.length > m) return a.slice(-m);
  return [...Array(m - a.length).fill(0), ...a];
}

function processSequence(seq, forClassifier) {
  const chars = characterMapping(seq);
  const tokens = forClassifier
    ? chars.map(letterToIndex)
    : chars.map(tokenize);
  return padSequences(tokens, forClassifier ? CLASSIFIER_LEN : DETECTOR_LEN);
}

function argMax(arr) {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
  return best;
}

function hashColor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FAMILY_COLORS[h % FAMILY_COLORS.length];
}

function classLabel(predictionIndex) {
  return LABELS[predictionIndex + 1] || `Class ${predictionIndex}`;
}

async function loadModels() {
  if (models.detector && models.classifier) {
    self.postMessage({ type: "ready" });
    return;
  }
  try {
    log("loading detector");
    models.detector = await tf.loadLayersModel(
      "/models/detector-js/model.json",
    );
    log("loading classifier");
    models.classifier = await tf.loadLayersModel(
      "/models/classifier-js/model.json",
    );
    log("models ready");
    self.postMessage({ type: "ready" });
  } catch (e) {
    console.error(e);
    self.postMessage({
      type: "error",
      data: e && e.message ? e.message : "Unable to load models in worker",
    });
  }
}

function buildWindows(seq, stride) {
  const len = seq.length;
  if (len === 0) return [];

  // Whole strand as one window (matches single-aptamer demos).
  const windows = [{ start: 0, end: len, seq, size: len }];
  const seen = new Set([`0:${len}`]);

  const sizes = WINDOW_SIZES.filter((s) => s < len);
  if (sizes.length === 0) return windows;

  for (const win of sizes) {
    for (let start = 0; start + win <= len; start += stride) {
      const end = start + win;
      const key = `${start}:${end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      windows.push({
        start,
        end,
        seq: seq.slice(start, end),
        size: win,
      });
    }
    const lastStart = len - win;
    const key = `${lastStart}:${len}`;
    if (!seen.has(key)) {
      seen.add(key);
      windows.push({
        start: lastStart,
        end: len,
        seq: seq.slice(lastStart, len),
        size: win,
      });
    }
  }
  return windows;
}

function overlapBp(a, b) {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function iou(a, b) {
  const ov = overlapBp(a, b);
  if (ov <= 0) return 0;
  const union = a.end - a.start + (b.end - b.start) - ov;
  return union > 0 ? ov / union : 0;
}

/**
 * Confidence filter + greedy IoU NMS across families.
 * Multi-scale windows create many overlapping proposals; keep strong,
 * spatially distinct locks so one locus does not spawn five labels.
 */
function mergeHits(rawHits) {
  if (!rawHits.length) return [];

  const strong = rawHits.filter(
    (h) =>
      h.detectorProbability >= 0.9 && h.classifierProbability >= 0.95,
  );
  const pool = (strong.length ? strong : rawHits).slice().sort(
    (a, b) =>
      b.classifierProbability - a.classifierProbability ||
      a.start - b.start,
  );

  const kept = [];
  for (const hit of pool) {
    const conflict = kept.find((k) => {
      if (k.classIndex === hit.classIndex) {
        return overlapBp(k, hit) > 0 || hit.start <= k.end + 15;
      }
      return iou(k, hit) >= 0.25;
    });
    if (conflict) {
      if (conflict.classIndex === hit.classIndex) {
        conflict.start = Math.min(conflict.start, hit.start);
        conflict.end = Math.max(conflict.end, hit.end);
        if (hit.classifierProbability > conflict.classifierProbability) {
          conflict.classifierProbability = hit.classifierProbability;
          conflict.detectorProbability = hit.detectorProbability;
        }
      }
      continue;
    }
    kept.push({ ...hit });
  }

  kept.sort((a, b) => a.start - b.start);
  return kept.map((h, i) => ({
    ...h,
    id: `hit-${i + 1}`,
    label: classLabel(h.classIndex),
    color: hashColor(classLabel(h.classIndex)),
  }));
}

async function predictBatch(model, seqs, forClassifier) {
  const input = tf.tensor2d(seqs.map((s) => processSequence(s, forClassifier)));
  const out = model.predict(input);
  const data = await out.array();
  input.dispose();
  out.dispose();
  return data;
}

async function annotateSequence(record, options = {}) {
  const stride = options.stride || DEFAULT_STRIDE;
  const seq = characterMapping(record.seq).join("");
  const windows = buildWindows(seq, stride);

  self.postMessage({
    type: "progress",
    stage: "detecting",
    message: "Scanning windows on the strand…",
    progress: 12,
    detail: `${windows.length} windows · stride ${stride}`,
    cursor: 0,
    seqLen: seq.length,
  });

  const BATCH = 16;
  const detectorScores = [];
  for (let i = 0; i < windows.length; i += BATCH) {
    const chunk = windows.slice(i, i + BATCH);
    const preds = await predictBatch(
      models.detector,
      chunk.map((w) => w.seq),
      false,
    );
    for (let j = 0; j < preds.length; j++) {
      const pred = argMax(preds[j]);
      detectorScores.push({
        ...chunk[j],
        detectorPrediction: pred,
        detectorProbability: preds[j][pred],
      });
    }
    const done = Math.min(i + BATCH, windows.length);
    self.postMessage({
      type: "progress",
      stage: "detecting",
      message: "Detector sweeping the strand…",
      progress: 12 + (done / windows.length) * 48,
      detail: `window ${done}/${windows.length}`,
      cursor: chunk[chunk.length - 1].end,
      seqLen: seq.length,
    });
    // yield so the event loop can flush progress messages
    await new Promise((r) => setTimeout(r, 0));
  }

  const positives = detectorScores.filter((w) => w.detectorPrediction === 1);
  self.postMessage({
    type: "progress",
    stage: "classifying",
    message:
      positives.length > 0
        ? `Classifying ${positives.length} candidate region${positives.length === 1 ? "" : "s"}…`
        : "No detector positives in this strand",
    progress: 65,
    detail: `${positives.length} of ${windows.length} windows`,
    cursor: seq.length,
    seqLen: seq.length,
  });

  const rawHits = [];
  for (let i = 0; i < positives.length; i += BATCH) {
    const chunk = positives.slice(i, i + BATCH);
    const preds = await predictBatch(
      models.classifier,
      chunk.map((w) => w.seq),
      true,
    );
    for (let j = 0; j < preds.length; j++) {
      const pred = argMax(preds[j]);
      rawHits.push({
        start: chunk[j].start,
        end: chunk[j].end,
        classIndex: pred,
        detectorProbability: chunk[j].detectorProbability,
        classifierProbability: preds[j][pred],
      });
    }
    const done = Math.min(i + BATCH, positives.length);
    self.postMessage({
      type: "progress",
      stage: "classifying",
      message: "Assigning riboswitch families…",
      progress: 65 + (positives.length ? (done / positives.length) * 25 : 25),
      detail: `${done}/${positives.length || 0}`,
      cursor: chunk.length ? chunk[chunk.length - 1].end : seq.length,
      seqLen: seq.length,
    });
    await new Promise((r) => setTimeout(r, 0));
  }

  self.postMessage({
    type: "progress",
    stage: "annotating",
    message: "Merging overlapping hits onto the strand…",
    progress: 94,
    seqLen: seq.length,
    cursor: seq.length,
  });

  const hits = mergeHits(rawHits);
  const top = hits
    .slice()
    .sort((a, b) => b.classifierProbability - a.classifierProbability)[0];

  return {
    id: record.id,
    name: record.name,
    seq,
    hits,
    windowsScanned: windows.length,
    detectorModelClassification: {
      prediction: hits.length > 0 ? 1 : 0,
      probability: top
        ? top.detectorProbability
        : detectorScores[0]
          ? detectorScores[0].detectorProbability
          : 0,
    },
    classifierModelClassification: top
      ? {
          prediction: top.classIndex,
          probability: top.classifierProbability,
        }
      : undefined,
  };
}

loadModels();

self.addEventListener("message", async (e) => {
  const { type, data, options } = e.data || {};
  try {
    if (type === "load") {
      await loadModels();
      return;
    }
    if (type === "annotate") {
      if (!models.detector || !models.classifier) {
        await loadModels();
      }
      if (!models.detector || !models.classifier) {
        throw new Error("Models unavailable in worker");
      }
      const sequences = Array.isArray(data) ? data : [data];
      const results = [];
      for (let i = 0; i < sequences.length; i++) {
        self.postMessage({
          type: "progress",
          stage: "preparing",
          message: `Preparing strand ${i + 1}/${sequences.length}…`,
          progress: 5,
          detail: sequences[i].id,
        });
        results.push(await annotateSequence(sequences[i], options));
      }
      self.postMessage({
        type: "progress",
        stage: "done",
        message:
          results.reduce((n, r) => n + r.hits.length, 0) > 0
            ? "Annotations locked on the strand"
            : "Signal quiet across scanned windows",
        progress: 100,
      });
      self.postMessage({ type: "result", data: results });
    }
  } catch (err) {
    console.error(err);
    self.postMessage({
      type: "error",
      data: err && err.message ? err.message : "Worker annotation failed",
    });
  }
});
