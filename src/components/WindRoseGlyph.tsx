import * as React from 'react';
import type { LucideProps } from 'lucide-react';

/** Narrow apex (bottom-left) → broad base toward top-right (cone / “wind from” cue). */
const OX = 2.35;
const OY = 21.55;
/** Base midpoint nudged inward so a wider base stays inside the 24×24 viewBox. */
const BASE_CX = 19.85;
const BASE_CY = 3.9;
/** Half-width of base segment, perpendicular to O→base center (short edge of the cone). */
const BASE_HALF = 5.0;

const vx = BASE_CX - OX;
const vy = BASE_CY - OY;
const len = Math.hypot(vx, vy) || 1;
/** Unit perpendicular to axis (opens the base). */
const px = (-vy / len) * BASE_HALF;
const py = (vx / len) * BASE_HALF;

const CONE_PATH = `M ${OX} ${OY} L ${BASE_CX + px} ${BASE_CY + py} L ${BASE_CX - px} ${BASE_CY - py} Z`;

/** Single elongated triangle: apex bottom-left, base near top-right. */
export const WindRoseGlyph = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      <path d={CONE_PATH} fill="none" stroke="currentColor" />
    </svg>
  )
);

WindRoseGlyph.displayName = 'WindRoseGlyph';
