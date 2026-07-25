import { Minus, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CONFIDENCE_TIER_DOT } from "@/lib/confidence";
import { useTaxReturn } from "@/state/tax-return-store";

const STEP = 1;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function ThresholdPopover() {
  const { confidenceThresholds, setConfidenceThresholds } = useTaxReturn();
  const highPct = Math.round(confidenceThresholds.high * 100);
  const mediumPct = Math.round(confidenceThresholds.medium * 100);

  // High and Medium are kept at least 1 point apart so the Low bucket (everything
  // below Medium) never collapses to zero width.
  function stepHigh(delta: number) {
    const next = Math.max(clampPercent(highPct + delta), mediumPct + 1);
    setConfidenceThresholds({ ...confidenceThresholds, high: next / 100 });
  }

  function stepMedium(delta: number) {
    const next = Math.min(clampPercent(mediumPct + delta), highPct - 1);
    setConfidenceThresholds({ ...confidenceThresholds, medium: next / 100 });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 px-3 text-xs">
          <SlidersHorizontal className="size-3" />
          Thresholds
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-xs" align="end">
        <p className="mb-2 font-medium text-slate-700">Confidence thresholds</p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", CONFIDENCE_TIER_DOT.high)} />
            <Label className="flex-1 text-xs font-normal text-slate-600">High ≥</Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="Decrease high threshold"
                disabled={highPct <= mediumPct + 1}
                onClick={() => stepHigh(-STEP)}
              >
                <Minus className="size-3" />
              </Button>
              <span className="w-9 text-center font-mono tabular-nums text-slate-700">{highPct}%</span>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="Increase high threshold"
                disabled={highPct >= 100}
                onClick={() => stepHigh(STEP)}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", CONFIDENCE_TIER_DOT.medium)} />
            <Label className="flex-1 text-xs font-normal text-slate-600">Medium ≥</Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="Decrease medium threshold"
                disabled={mediumPct <= 0}
                onClick={() => stepMedium(-STEP)}
              >
                <Minus className="size-3" />
              </Button>
              <span className="w-9 text-center font-mono tabular-nums text-slate-700">{mediumPct}%</span>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="Increase medium threshold"
                disabled={mediumPct >= highPct - 1}
                onClick={() => stepMedium(STEP)}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>

          {/* Low has no threshold of its own — it's everything under Medium's
              floor — so its stepper drives the same confidenceThresholds.medium
              value as the Medium row above. Exposing it here means adjusting
              Low never requires reading Medium's value and doing the math. */}
          <div className="flex items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", CONFIDENCE_TIER_DOT.low)} />
            <Label className="flex-1 text-xs font-normal text-slate-600">Low &lt;</Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="Decrease low threshold"
                disabled={mediumPct <= 0}
                onClick={() => stepMedium(-STEP)}
              >
                <Minus className="size-3" />
              </Button>
              <span className="w-9 text-center font-mono tabular-nums text-slate-700">{mediumPct}%</span>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="Increase low threshold"
                disabled={mediumPct >= highPct - 1}
                onClick={() => stepMedium(STEP)}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
