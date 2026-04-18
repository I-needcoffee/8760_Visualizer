import { useMemo } from 'react';
import type { HoverHintDef } from './TutorialHoverPopover';
import { TutorialHoverPopoverLayer } from './TutorialHoverPopover';

export function TutorialHeaderHints({
  theme,
  showCompareToggle,
}: {
  theme: 'light' | 'dark';
  showCompareToggle: boolean;
}) {
  const defs: HoverHintDef[] = useMemo(
    () => [
      { id: 'tutorial-nav-back', title: 'Back', body: 'Return to the map to pick a different location.' },
      {
        id: 'tutorial-nav-files',
        title: 'Active files',
        body: 'Pills show loaded EPW files. In single mode, tap a pill to choose which file feeds the dashboard.',
      },
      { id: 'tutorial-nav-add', title: 'Add', body: 'Load another weather file for comparison or extra context.' },
      ...(showCompareToggle
        ? [
            {
              id: 'tutorial-nav-viewmode',
              title: 'Single / Compare',
              body: 'Switch between a single-site dashboard and a two-site comparison workspace.',
            } as HoverHintDef,
          ]
        : []),
      {
        id: 'tutorial-nav-layouts',
        title: 'Layouts',
        body: 'Change how many cards you see. The right-most icon is this guided, one-card view.',
      },
      { id: 'tutorial-nav-reorder', title: 'Reorder', body: 'Drag cards to new positions, then turn reorder off when you are done.' },
      { id: 'tutorial-nav-summary', title: 'Summary', body: 'Open overall averages for the filtered months and hours.' },
      { id: 'tutorial-nav-export', title: 'Export', body: 'Capture the dashboard as PDF or JPEG for reports.' },
      { id: 'tutorial-nav-settings', title: 'Settings', body: 'Global filters, units, theme, and custom color ramps.' },
    ],
    [showCompareToggle]
  );

  return (
    <TutorialHoverPopoverLayer defs={defs} theme={theme} zIndex={100} rebindKey={showCompareToggle ? 'cmp' : 'single'} />
  );
}
