# Project Documentation: Layout Stability & Smart Height

## The "Smart Height" System
The application uses a dynamic height adjustment system to ensure that charts (which may change size based on their content, legends, or scaling) always fit perfectly within their `react-grid-layout` cards.

### Core Components:
1. **`ScaledWrapper.tsx`**: 
   - Uses `ResizeObserver` to detect the actual height of the content.
   - Calculates a "needed height" based on the current scale.
   - Reports this height back to the parent via `onHeightChange`.
   - **Stability Logic**: It uses a 25px threshold. It only reports a height change if the new height differs from the last reported height by at least 25px. This prevents "bouncing" between grid rows (which are 10px high).

2. **`App.tsx` (`handleChartHeightChange`)**:
   - Receives height updates from `ScaledWrapper`.
   - **Stability Logic**:
     - **Drag/Resize Lock**: If the user is currently dragging or resizing (`isDraggingRef.current`), all automatic height updates are ignored.
     - **Debounce & Threshold**: It waits 1000ms before applying small changes. It only updates the grid layout if the change is at least 1 grid row.
     - **Infinite Loop Prevention**: Uses `lastLayoutsRef` to compare the next layout with the current one before calling `setLayouts`. It also respects `minH` (minimum height) from the layout item to prevent `react-grid-layout` from overriding the height and causing an infinite loop ("Maximum update depth exceeded" error).

## Visual Design Notes
- **Bar Charts**: Opacity is set to 0.6 (60%) to provide a softer look while keeping the average indicator dots at 100% opacity for clarity. Bar charts now draw from the minimum to the maximum selected values, rather than from 0 to the average value. The Y-axis also adapts to the minimum value instead of being forced to start at 0.
- **Export Mode**: A specialized state that strips away UI chrome (borders, shadows, buttons) to prepare the dashboard for high-quality image or PDF export.

## Roadmap & Current Status
**Completed:**
- [x] Bar chart opacity set to 60%.
- [x] Bar chart draws from min to max instead of 0 to value.
- [x] Bar chart Y-axis adapts to the minimum value instead of starting at 0.
- [x] Export Mode UI implemented (hides borders, shadows, buttons, toggles).
- [x] Export to PDF and JPEG functionality added.
- [x] Fixed "Maximum update depth exceeded" error by respecting `minH` in `handleChartHeightChange`.
- [x] Fixed card cropping by using `Math.ceil` and a 1-row threshold in `handleChartHeightChange`.
- [x] Fixed scrollbar oscillation loop by increasing the width change threshold in `ScaledWrapper`'s `ResizeObserver` to 20px.
- [x] Add Future Weather toggle to MapSelector.
- [x] Support loading FTMY_EPWs.zip (Future Weather Data) directly in the browser using JSZip (since Zenodo blocks server-side downloads).
- [x] Parse EPW headers from the ZIP to display future weather locations on the map with a distinct color/icon.
- [x] Implement comparison mode between current and future weather data (quick flip toggle in the top bar).
- [x] **Smart Preloading**: Added IndexedDB caching for the 115MB ZIP file so users only upload once.
- [x] **Sample Data**: Added a "Try with Sample Data" option to demonstrate future projections instantly.

- [x] **Difference Mode**: Added a "Diff" button to visualize quantitative differences between primary and comparison datasets in the Data Explorer.
- [x] **Smart Comparison Defaults**: Future weather files now automatically attempt to load a historical baseline from the same location for instant comparison.
- [x] **Map Auto-Zoom**: The map now automatically centers and zooms to the current location when selecting a comparison dataset.
- [x] **Improved Sample Data**: Fixed sample data loading issues by providing robust, full-year EPW templates.
- [x] **Map Stability**: Fixed "Initializing Map" hang caused by incorrect coordinate property names.
- [x] **EPW Parser Robustness**: Added support for concatenated EPW files (multiple LOCATION blocks) and improved data line detection.

**Pending / Next Steps (Multi-File Comparison Restructure):**
- [x] **State Refactoring**: Update state management to support an array of `selectedFiles` rather than just `epwData` and `compareEpwData`.
- [x] **Multi-File Column Layout**: When multiple files are selected (and not in difference mode), render a grid where each file gets its own column of comparative chart types.
- [x] **Global Settings Sync**: Ensure global settings (filters, time isolation) apply across all selected files in the multi-column view.
- [x] **Difference Mode UI**: Create a new full-screen window for "View Differences".
- [x] **Difference File Selection**: Allow users to select two specific files (Baseline and Comparison) from their selected files (or add from map).
- [x] **Difference Layout**: Split the screen: Left 1/3 contains two vertical columns of typical cards (Baseline on left, Comparison on right). Right 2/3 contains a large Data Explorer card in "show differences" mode.
- [x] **Variable Selection for Difference**: Add UI to easily select which category/variable the Data Explorer is showing differences for, updating calculations and legends accordingly.
