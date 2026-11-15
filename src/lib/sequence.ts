import type { SequenceRecord } from "./types";

const AMBIGUOUS: Record<string, string> = {
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

export function normalizeSequence(raw: string) {
  return raw
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/U/g, "T")
    .split("")
    .map((ch) => AMBIGUOUS[ch] ?? ch)
    .join("");
}

export function isDnaSequence(seq: string) {
  return /^[ATGCN]+$/i.test(seq) && seq.length > 0;
}

export function clipForDisplay(seq: string, max = 250) {
  return seq.length > max ? seq.slice(0, max) : seq;
}

const TPP =
  "GCCATCTCAACGGGGTGCTGGCTGTTTAAAACAGCCTTGCTGAGAGTAAACCCGCCGAACCTGATCCGGCTAATACCGGCGTAGGGATTTGAGCTGCTAACTATT";
const PURINE =
  "TATATAAAATATAAACTCACTCGTATATGCTCAGAAATATGGTCTGAGAGTCTCTACCAAGATACCGTAAATATCTTGACTATGAGTGAAATTATTATACCA";
const FMN =
  "TATAATCTTCAGGGCGGGGTGAAATTCCCCACCGGCGGTATAGCCCGCGAGCTGCGTGTTCAGCATGATTCAGTGAAATTCTGAAGCCGACAGTAAAGTCTGGATGGGAGAAGATAGAA";
const FLANK = "ATGC".repeat(20);
/** Long low-signal spacer so adjacent aptamers stay separable under multi-scale windows. */
const GAP = "A".repeat(200);

/**
 * Real Rfam aptamers (DNA). The multi-hit strand concatenates three families
 * with flanks/gaps so sliding-window inference can lock multiple annotations.
 */
export const SAMPLE_SEQUENCES: SequenceRecord[] = [
  {
    id: "multi-hit-strand",
    name: "Multi-hit strand · TPP + Purine + FMN",
    seq: `${FLANK}${TPP}${GAP}${PURINE}${GAP}${FMN}${FLANK}`,
  },
  {
    id: "rfam-tpp",
    name: "Single · Rfam TPP (RF00059)",
    seq: TPP,
  },
  {
    id: "rfam-purine",
    name: "Single · Rfam Purine (RF00167)",
    seq: PURINE,
  },
  {
    id: "demo-negative",
    name: "Negative control",
    seq: "ATGC".repeat(80),
  },
];
