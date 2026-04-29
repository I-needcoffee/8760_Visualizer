/** Prefer category for compact export titles; use the variable name when category is missing or generic. */
export function exportCaptionShort(category: string | undefined, fullName: string): string {
  const c = category?.trim();
  return !c || c === 'Other' ? fullName : c;
}

/** Export card title lines: same short/long pattern as `ExportHeaderCaption`, with display unit appended. */
export function exportCaptionLinesWithUnit(
  category: string | undefined,
  variableName: string,
  displayUnit: string
): { short: string; long: string } {
  const u = displayUnit?.trim();
  const suffix = u ? ` (${u})` : '';
  return {
    short: `${exportCaptionShort(category, variableName)}${suffix}`,
    long: `${variableName}${suffix}`,
  };
}

/** Export subtitle: full variable name when header is ≥240px wide; compact line uses category unless it is generic (then the variable name). */
export function ExportHeaderCaption({
  lines,
}: {
  lines: readonly { short: string; long: string }[];
}) {
  return (
    <div className="min-w-0 flex-1 text-left">
      {lines.map((line, i) => (
        <p
          key={i}
          className="text-[10px] font-medium leading-none text-gray-700 truncate min-w-0"
          title={line.long !== line.short ? line.long : undefined}
        >
          {line.short}
        </p>
      ))}
    </div>
  );
}
