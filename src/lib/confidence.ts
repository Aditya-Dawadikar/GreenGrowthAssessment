export type ConfidenceTier = "high" | "medium" | "low";

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.65) return "medium";
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
