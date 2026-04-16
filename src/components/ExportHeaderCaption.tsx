/** Export subtitle: full variable name when header is ≥240px wide, else category. */
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
