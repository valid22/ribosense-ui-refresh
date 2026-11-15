# RiboSense

Browser observatory for **detecting and classifying genomic riboswitches**.

1. **Intake** — load DNA/RNA (U→T), review the detector→classifier pipeline, pick a demo or upload FASTA/GenBank/SBOL.
2. **Strand theater** — paired helix ribbon with zoom, genomic scrubber, probability-forward hit tiles, and export (CSV / BED / GFF3 / JSON / SVG).

Inference runs locally in a Web Worker (multi-scale sliding windows + NMS so one strand can carry multiple family hits).

## Research credit

**Systems CompBio Lab · SASTRA Deemed University**

Siva Sankaran V, Narasimhan K, Ganesan M, Palaniappan A. *RiboSense: web-based pipeline for annotating genomic riboswitches.* [manuscript submitted].

Models from [APalaniaLab/RiboSense](https://github.com/APalaniaLab/RiboSense). Related: [Riboflow](https://doi.org/10.3389/fbioe.2020.00808).

## Live demo

**GitHub Pages:** [https://valid22.github.io/ribosense-ui-refresh/](https://valid22.github.io/ribosense-ui-refresh/)

## Run

```bash
npm install
npm run dev
```

Port **3847**. With the default `basePath`, open `http://localhost:3847/ribosense-ui-refresh/` (override with `BASE_PATH=` for a root-mounted dev build).

## Static build (GitHub Pages)

```bash
npm ci
npm run build
```

The export is written to `out/`. Pushes to `main` deploy via `.github/workflows/deploy-pages.yml`. Set `BASE_PATH` when building for a subpath other than `/ribosense-ui-refresh`.

## Try

Intake → Demo → **Multi-hit strand**. Wait for domain brackets (TPP / Purine / FMN), zoom with +/- or ⌘/Ctrl+wheel, jump from prediction tiles, export hits.

## Stack

Next.js · React · Tailwind · TensorFlow models (Python-trained; TF.js port in a worker) · bio-parsers
