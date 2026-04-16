/** Single-letter time-step marker for compact export headers (H/D/W/M). */
export function aggregationLetter(agg: string): string {
  switch (agg) {
    case 'hour':
      return 'H';
    case 'day':
      return 'D';
    case 'week':
      return 'W';
    case 'month':
      return 'M';
    default:
      return agg ? agg.charAt(0).toUpperCase() : '';
  }
}

export function aggregationTitle(agg: string): string {
  switch (agg) {
    case 'hour':
      return 'Hour';
    case 'day':
      return 'Day';
    case 'week':
      return 'Week';
    case 'month':
      return 'Month';
    default:
      return agg;
  }
}
