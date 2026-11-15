export type SequenceRecord = {
  id: string;
  name: string;
  seq: string;
};

export type ModelClassification = {
  prediction: number;
  probability: number;
};

/** One riboswitch hit on a genomic span (1-based coords for display helpers). */
export type StrandHit = {
  id: string;
  start: number; // 0-based inclusive
  end: number; // 0-based exclusive
  label: string;
  classIndex: number;
  detectorProbability: number;
  classifierProbability: number;
  color: string;
};

export type AnnotationResult = {
  id: string;
  name: string;
  seq: string;
  hits: StrandHit[];
  /** Legacy whole-seq summary for CSV compatibility */
  detectorModelClassification: ModelClassification;
  classifierModelClassification?: ModelClassification;
  windowsScanned: number;
};

export type PipelineStage =
  | "idle"
  | "loading-models"
  | "parsing"
  | "preparing"
  | "detecting"
  | "classifying"
  | "annotating"
  | "done"
  | "error";

export type PipelineEvent = {
  stage: PipelineStage;
  message: string;
  progress: number;
  detail?: string;
};

export type WorkerProgress = {
  type: "progress";
  stage: PipelineStage;
  message: string;
  progress: number;
  detail?: string;
  cursor?: number;
  seqLen?: number;
};
