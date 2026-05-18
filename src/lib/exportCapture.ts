import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/** Visible dashboard frame or a fixed aspect-ratio slide size. */
export type ExportFrameSize =
  | 'viewport'
  | 'hd1080'
  | 'hd720'
  | 'hd1440'
  | 'portrait1080'
  | 'square1080'
  | 'fourThree1200';

export type ExportFormat = 'pdf' | 'jpeg';

export const EXPORT_FRAME_OPTIONS: readonly {
  value: ExportFrameSize;
  label: string;
  shortLabel: string;
}[] = [
  { value: 'viewport', label: 'Screen (current view)', shortLabel: 'Screen' },
  { value: 'hd1080', label: '1920×1080 — 16:9 widescreen', shortLabel: '16:9 · 1080p' },
  { value: 'hd720', label: '1280×720 — 16:9 HD', shortLabel: '16:9 · 720p' },
  { value: 'hd1440', label: '2560×1440 — 16:9 QHD', shortLabel: '16:9 · 1440p' },
  { value: 'portrait1080', label: '1080×1920 — 9:16 portrait', shortLabel: '9:16 · portrait' },
  { value: 'square1080', label: '1080×1080 — 1:1 square', shortLabel: '1:1 · square' },
  { value: 'fourThree1200', label: '1600×1200 — 4:3 classic', shortLabel: '4:3 · classic' },
] as const;

const FIXED_FRAMES: Record<Exclude<ExportFrameSize, 'viewport'>, { width: number; height: number }> = {
  hd1080: { width: 1920, height: 1080 },
  hd720: { width: 1280, height: 720 },
  hd1440: { width: 2560, height: 1440 },
  portrait1080: { width: 1080, height: 1920 },
  square1080: { width: 1080, height: 1080 },
  fourThree1200: { width: 1600, height: 1200 },
};

export function exportFrameLabel(frame: ExportFrameSize): string {
  return EXPORT_FRAME_OPTIONS.find(o => o.value === frame)?.label ?? 'Screen';
}

function resolveTargetSize(frame: ExportFrameSize, element: HTMLElement): { width: number; height: number } {
  if (frame !== 'viewport') return FIXED_FRAMES[frame];
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

export async function exportDashboardArea(opts: {
  element: HTMLElement;
  frame: ExportFrameSize;
  format: ExportFormat;
  filenameBase: string;
}): Promise<void> {
  const { element, frame, format, filenameBase } = opts;
  const target = resolveTargetSize(frame, element);
  const contentW = element.scrollWidth;
  const contentH = element.scrollHeight;
  const scale = Math.min(target.width / contentW, target.height / contentH);

  const prevOverflow = element.style.overflow;
  element.style.overflow = 'visible';

  const captureOptions = {
    quality: 0.95,
    backgroundColor: '#ffffff',
    width: target.width,
    height: target.height,
    pixelRatio: 1,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${contentW}px`,
      height: `${contentH}px`,
    },
  };

  try {
    const safeName = filenameBase.replace(/[^\w\-]+/g, '_').slice(0, 80) || 'export';

    if (format === 'jpeg') {
      const dataUrl = await toJpeg(element, captureOptions);
      const link = document.createElement('a');
      link.download = `climate-dashboard-${safeName}.jpg`;
      link.href = dataUrl;
      link.click();
      return;
    }

    const dataUrl = await toPng(element, captureOptions);
    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Export image failed to load'));
    });

    const pdf = new jsPDF({
      orientation: target.width > target.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [target.width, target.height],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, target.width, target.height);
    const canvasUrl = 'https://climatecanvas.app';
    const footerStripH = Math.min(64, Math.max(36, target.height * 0.07));
    pdf.link(0, target.height - footerStripH, target.width, footerStripH, { url: canvasUrl });
    pdf.save(`climate-dashboard-${safeName}.pdf`);
  } finally {
    element.style.overflow = prevOverflow;
  }
}
