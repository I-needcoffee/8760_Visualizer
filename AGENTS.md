# Project Documentation: Static Preset Architecture

## The "Preset Grid" System
ClimateCompare has moved from a dynamic, drag-and-drop grid to a stable, preset-based layout system. This ensures a jitter-free experience and predictable scaling across all screen sizes.

### Core Layout Components:
1. **`SingleModeLayout.tsx`**: 
   - Handles the single-city dashboard view.
   - **Modes**:
     - `hero-left`: A large full-height card on the left with a 3x2 grid on the right.
     - `grid-4x2`: A uniform 4x2 grid of 8 cards.
     - `focus-deep`: A 2-column layout for detailed chart analysis.
   - **Pagination**: If more cards are added than a preset can hold, they cleanly overflow into a new "page" (a vertical continuation of the grid).

2. **`ComparisonModeLayout.tsx`**:
   - Handles the 2-city comparison view.
   - **Left Column**: A full-height Difference Chart (Baseline vs comparison).
   - **Right Column**: A horizontal scroller of "Category Columns". Each column stacks the Baseline and Comparison charts vertically for a specific chart type.

## Visual Design Standards
- **Standardized Proportions**: Desktop layouts target a 16:9 overall container aspect ratio.
- **ChartHeader Component**: Every chart card uses the `ChartHeader` component to ensure consistent titles, dropdowns, and removal buttons.
- **Export Mode**: A specialized UI state that strips away borders, shadows, and navigation chrome to prepare the dashboard for high-quality PDF/JPEG export.
- **Bar Charts**: Rendered with 60% opacity for a softer look, drawing from minimum to maximum values rather than from zero.

## State Management
- **`slots`**: An array of `ChartConfig` objects determining the order and type of charts in single-city mode.
- **`comparisonSlots`**: An array of `ChartConfig` objects for the comparison-mode columns.
- **Persistent Selection**: Chart type selections and variable choices are handled via unified `handleChangeType` and `handleRemoveChart` callbacks.

## Roadmap & Progress
**Completed:**
- [x] Removed `react-grid-layout` and `ScaledWrapper.tsx` redundancy.
- [x] Standardized all chart components (SunPath, DataExplorer, etc.) with `ChartHeader`.
- [x] Implemented `SingleModeLayout` presets and pagination.
- [x] Implemented `ComparisonModeLayout` with Difference/Stacked columns.
- [x] Fixed "Maximum update depth exceeded" errors by moving to static CSS grids.
- [x] Optimized export functionality for fixed-aspect-ratio containers.
- [x] Future Weather data support via zip loading and IndexedDB caching.

**Next Steps:**
- [ ] Refine the "Empty Slot" styling to be less intrusive.
- [ ] Implement a "Reset Layout" button for users to return to defaults.
- [ ] Expand Comparative view to support more than 2 files (if requested in future).
