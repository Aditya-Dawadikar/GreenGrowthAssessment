export type ConfidenceTier = "high" | "medium" | "low";

export interface ConfidenceThresholds {
  high: number;
  medium: number;
}

export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  high: 0.85,
  medium: 0.65,
};

export function confidenceTier(
  confidence: number,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
): ConfidenceTier {
  if (confidence >= thresholds.high) return "high";
  if (confidence >= thresholds.medium) return "medium";
  return "low";
}

export const CONFIDENCE_TIER_LABEL: Record<ConfidenceTier, string> = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence — Needs Review",
};

/** Ground-truth input tints, per THEME.md's confidence triage palette. */
export const CONFIDENCE_TIER_CLASSES: Record<ConfidenceTier, string> = {
  high: "bg-emerald-50/80 border-emerald-200 text-emerald-900",
  medium: "bg-amber-50/80 border-amber-200 text-amber-900",
  low: "bg-rose-50/80 border-rose-200 text-rose-900",
};

export const CONFIDENCE_TIER_DOT: Record<ConfidenceTier, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-rose-500",
};
