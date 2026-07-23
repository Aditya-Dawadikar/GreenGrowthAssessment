import type { BoundingBox } from "@/types/tax-return";

export function BoundingBoxOverlay({ bbox }: { bbox: BoundingBox }) {
  return (
    <div
      className="pointer-events-none absolute animate-pulse rounded-sm border-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
      style={{
        left: `${bbox.x}%`,
        top: `${bbox.y}%`,
        width: `${bbox.width}%`,
        height: `${bbox.height}%`,
      }}
    />
  );
}
