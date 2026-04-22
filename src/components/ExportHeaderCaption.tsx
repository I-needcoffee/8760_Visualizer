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
    <div className="@container min-w-0 flex-1 flex flex-col gap-0.5 text-left">
      {lines.map((line, i) =>
        line.short === line.long ? (
          <p
            key={i}
            className="text-[10px] font-medium text-gray-700 leading-snug whitespace-normal break-words min-w-0"
          >
            {line.long}
          </p>
        ) : (
          <div key={i} className="min-w-0">
            <p
              className="text-[10px] font-medium text-gray-700 leading-snug truncate @min-[240px]:hidden"
              title={line.long}
            >
              {line.short}
            </p>
            <p className="text-[10px] font-medium text-gray-700 leading-snug whitespace-normal break-words min-w-0 hidden @min-[240px]:block">
              {line.long}
            </p>
          </div>
        )
      )}
    </div>
  );
}
