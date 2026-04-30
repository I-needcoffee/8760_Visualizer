/**
 * Credit line aligned with Iowa Environmental Mesonet download portal / API disclaimers:
 * — Data provenance & limited QC narrative (METAR archive)
 * — Link to Iowa State IEM (primary site attribution)
 */

export const IEM_HOME = 'https://mesonet.agron.iastate.edu/';
const IEM_DOWNLOAD_ASOS = 'https://mesonet.agron.iastate.edu/request/download.phtml';
const IEM_API = 'https://mesonet.agron.iastate.edu/api/';

type Theme = 'light' | 'dark';

function linkClass(theme: Theme) {
  return theme === 'dark'
    ? 'text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-sky-200'
    : 'text-sky-800 underline decoration-sky-300 underline-offset-2 hover:text-sky-950';
}

/** Long-form disclaimer for modal or export; keep in sync with IEM’s published terms. */
export function WindIemDisclaimerFull({ theme, className = '' }: { theme: Theme; className?: string }) {
  const a = linkClass(theme);
  const p = `text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`;
  return (
    <div className={`space-y-3 ${className}`}>
      <p className={p}>
        Hourly wind speed and direction shown when “IEM ASOS” is selected are obtained from the Iowa Environmental
        Mesonet (
        <a href={IEM_HOME} className={a} target="_blank" rel="noopener noreferrer">
          Iowa State University Agronomy Mesonet — mesonet.agron.iastate.edu
        </a>
        ). The underlying archive is METAR-derived ASOS/AWOS data aggregated by IEM; data lineage and ingestion
        partners (for example NCEI ISD, Unidata IDD, and MADIS in support of METAR ingest) are described on IEM’s ASOS
        documentation. Archive data are provided essentially as-ingested, with <em>very limited quality control</em>, as
        stated by IEM.
      </p>
      <p className={p}>
        For source documentation see{' '}
        <a href={IEM_DOWNLOAD_ASOS} className={a} target="_blank" rel="noopener noreferrer">
          IEM — Download ASOS/METAR
        </a>{' '}
        and{' '}
        <a href={IEM_API} className={a} target="_blank" rel="noopener noreferrer">
          IEM web services / API
        </a>
        . When you share plots or derived products, credit the Iowa Environmental Mesonet and Iowa State University
        as appropriate. This app is not affiliated with Iowa State or IEM.
      </p>
    </div>
  );
}

export function WindIemAttributionFootnote({
  compact,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  const baseCls = `${className} text-[10px] leading-snug italic text-gray-500 dark:text-gray-500`;
  if (compact) {
    return (
      <p className={baseCls}>
        Wind hourly values from{' '}
        <a
          href={IEM_HOME}
          className="underline decoration-gray-400/70 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          Iowa Environmental Mesonet
        </a>{' '}
        (ASOS/METAR; sources per IEM include NWS ingest, NCEI ISD, Unidata IDD, and MADIS as described by IEM). Provided
        as archived with limited QC (
        <a
          href={IEM_DOWNLOAD_ASOS}
          className="underline decoration-gray-400/70 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          IEM download documentation
        </a>
        ). Iowa State University / IEM.
      </p>
    );
  }
  return (
    <p className={baseCls}>
      Hourly wind speed and direction are from the Iowa Environmental Mesonet (
      <a
        href={IEM_HOME}
        className="underline decoration-gray-400/70 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-400"
        target="_blank"
        rel="noopener noreferrer"
      >
        Iowa State University Agronomy Mesonet — mesonet.agron.iastate.edu
      </a>
      ). The underlying archive is METAR-derived ASOS/AWOS hourly data aggregated by IEM; data lineage and ingestion
      partners (including agencies such as NCEI ISD, Unidata IDD, and MADIS in support of METAR ingest) are described
      on IEM&apos;s ASOS documentation pages. Archive data are provided essentially as-ingested with{' '}
      <em>very limited quality control</em>, per IEM; see details on{' '}
      <a
        href={IEM_DOWNLOAD_ASOS}
        className="underline decoration-gray-400/70 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-400"
        target="_blank"
        rel="noopener noreferrer"
      >
        IEM — Download ASOS/METAR
      </a>{' '}
      and{' '}
      <a
        href={IEM_API}
        className="underline decoration-gray-400/70 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-400"
        target="_blank"
        rel="noopener noreferrer"
      >
        IEM web services/API information
      </a>
      . Please credit IEM / Iowa State University when disseminating plots or derived products from this overlay.
    </p>
  );
}
