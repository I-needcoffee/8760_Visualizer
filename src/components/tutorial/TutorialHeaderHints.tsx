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
        body: 'The active layout is on the right; one alternate peeks beside it. Hover or focus this control to reveal the rest.',
      },
      {
        id: 'tutorial-nav-hover-hints',
        title: 'Directions',
        body: 'Turn hover directions on or off for this layout (desktop only).',
      },
      {
        id: 'tutorial-slot-reorder-handle',
        title: 'Reorder cards',
        body: 'Hover a chart card to reveal the grab handle in the bottom-right corner, then drag it onto another card to swap positions.',
      },
      {
        id: 'tutorial-nav-export',
        title: 'Export',
        body: 'Capture the dashboard as PDF or JPEG for reports.',
      },
      {
        id: 'tutorial-nav-settings',
        title: 'Settings',
        body: 'Move the pointer here to slide out Export on the left. Click for global filters, units, theme, and custom color ramps.',
      },
    ],
    [showCompareToggle]
  );

  return (
    <TutorialHoverPopoverLayer defs={defs} theme={theme} zIndex={100} rebindKey={showCompareToggle ? 'cmp' : 'single'} />
  );
}
