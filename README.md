# RiboSense

Browser observatory for **detecting and classifying genomic riboswitches**.

1. **Intake** — load DNA/RNA (U→T), review the detector→classifier pipeline, pick a demo or upload FASTA/GenBank/SBOL.
2. **Strand theater** — paired helix ribbon with zoom, genomic scrubber, probability-forward hit tiles, and export (CSV / BED / GFF3 / JSON / SVG).

Inference runs locally in a Web Worker (multi-scale sliding windows + NMS so one strand can carry multiple family hits).

## Research credit

**Systems CompBio Lab · SASTRA Deemed University**

Siva Sankaran V, Narasimhan K, Ganesan M, Palaniappan A. *RiboSense: web-based pipeline for annotating genomic riboswitches.* [manuscript submitted].

Models from [APalaniaLab/RiboSense](https://github.com/APalaniaLab/RiboSense). Related: [Riboflow](https://doi.org/10.3389/fbioe.2020.00808).

## Run

```bash
npm install
npm run dev
```

Port **3847**.

## Try

Intake → Demo → **Multi-hit strand**. Wait for domain brackets (TPP / Purine / FMN), zoom with +/- or ⌘/Ctrl+wheel, jump from prediction tiles, export hits.

## Stack

Next.js · React · Tailwind · TensorFlow models (Python-trained; TF.js port in a worker) · bio-parsers
