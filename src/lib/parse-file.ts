import { anyToJson } from "bio-parsers";
import { normalizeSequence } from "./sequence";
import type { SequenceRecord } from "./types";

export async function parseSequenceFile(file: File): Promise<SequenceRecord[]> {
  if (file.size > 2e7) {
    throw new Error("File is larger than 20MB.");
  }

  const parsed = await anyToJson(file);
  const records: SequenceRecord[] = [];
  const seen = new Set<string>();

  for (const item of parsed) {
    const name = item.parsedSequence?.name || "unnamed";
    let id = String(name).split(/\s+/)[0] || `seq-${records.length + 1}`;
    let unique = id;
    let n = 2;
    while (seen.has(unique)) {
      unique = `${id}-${n++}`;
    }
    seen.add(unique);

    const seq = normalizeSequence(item.parsedSequence?.sequence || "");
    if (!seq) continue;
    records.push({ id: unique, name: String(name), seq });
  }

  if (records.length === 0) {
    throw new Error("No sequences could be parsed from that file.");
  }

  return records;
}
