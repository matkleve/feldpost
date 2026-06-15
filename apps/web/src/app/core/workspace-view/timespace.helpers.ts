import type { WorkspaceImage } from './workspace-view.types';

/** Inclusive calendar date range for map/workspace temporal filtering. */
export interface TimeRange {
  from: Date | null;
  to: Date | null;
}

export interface TimespaceBin {
  index: number;
  count: number;
  heightPct: number;
  startMs: number;
  endMs: number;
}

export interface TimespaceHistogram {
  bins: TimespaceBin[];
  domainStartMs: number;
  domainEndMs: number;
}

const MS_PER_DAY = 86_400_000;

/** Effective media timestamp: capture date when present, otherwise upload date. */
export function effectiveMediaTimestampMs(image: Pick<WorkspaceImage, 'capturedAt' | 'createdAt'>): number {
  const raw = image.capturedAt ?? image.createdAt;
  return new Date(raw).getTime();
}

export function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function endOfUtcDay(ms: number): number {
  return startOfUtcDay(ms) + MS_PER_DAY - 1;
}

export function matchesTimeRange(
  image: Pick<WorkspaceImage, 'capturedAt' | 'createdAt'>,
  range: TimeRange | null,
): boolean {
  if (!range || (!range.from && !range.to)) {
    return true;
  }

  const ts = effectiveMediaTimestampMs(image);
  if (range.from && ts < startOfUtcDay(range.from.getTime())) {
    return false;
  }
  if (range.to && ts > endOfUtcDay(range.to.getTime())) {
    return false;
  }
  return true;
}

export function isTimeRangeActive(range: TimeRange | null): boolean {
  return !!(range?.from || range?.to);
}

export function buildTimespaceHistogram(
  images: readonly Pick<WorkspaceImage, 'capturedAt' | 'createdAt'>[],
  binCount = 72,
): TimespaceHistogram | null {
  const dated = images.filter((img) => {
    const raw = img.capturedAt ?? img.createdAt;
    return !!raw && Number.isFinite(new Date(raw).getTime());
  });

  if (dated.length === 0) {
    return null;
  }

  const timestamps = dated.map((img) => effectiveMediaTimestampMs(img));
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const todayEnd = endOfUtcDay(Date.now());
  const domainStartMs = startOfUtcDay(minTs);
  const domainEndMs = Math.max(endOfUtcDay(maxTs), todayEnd);
  const span = Math.max(domainEndMs - domainStartMs, MS_PER_DAY);
  const bins: TimespaceBin[] = Array.from({ length: binCount }, (_, index) => ({
    index,
    count: 0,
    heightPct: 0,
    startMs: domainStartMs + (span * index) / binCount,
    endMs: domainStartMs + (span * (index + 1)) / binCount,
  }));

  for (const ts of timestamps) {
    const ratio = (ts - domainStartMs) / span;
    const clamped = Math.min(Math.max(ratio, 0), 0.999_999);
    const binIndex = Math.floor(clamped * binCount);
    bins[binIndex]!.count += 1;
  }

  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);
  for (const bin of bins) {
    bin.heightPct = bin.count > 0 ? Math.max(8, (bin.count / maxCount) * 100) : 0;
  }

  return { bins, domainStartMs, domainEndMs };
}

/** Click band: slightly left and right of the pointer (≈6% of domain, min 1 day). */
export function clickBandRange(domainStartMs: number, domainEndMs: number, pointerRatio: number): TimeRange {
  const span = domainEndMs - domainStartMs;
  const halfBand = Math.max(span * 0.03, MS_PER_DAY / 2);
  const centerMs = domainStartMs + span * pointerRatio;
  return {
    from: new Date(Math.max(domainStartMs, centerMs - halfBand)),
    to: new Date(Math.min(domainEndMs, centerMs + halfBand)),
  };
}

export function dragRange(
  domainStartMs: number,
  domainEndMs: number,
  startRatio: number,
  endRatio: number,
): TimeRange {
  const span = domainEndMs - domainStartMs;
  const a = domainStartMs + span * Math.min(startRatio, endRatio);
  const b = domainEndMs - span * (1 - Math.max(startRatio, endRatio));
  return {
    from: new Date(startOfUtcDay(a)),
    to: new Date(endOfUtcDay(b)),
  };
}

export function ratioFromClientX(clientX: number, rect: DOMRect): number {
  const x = clientX - rect.left;
  return Math.min(Math.max(x / Math.max(rect.width, 1), 0), 1);
}

export function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Locale-aware short date for timespace display fields (follows app language, not OS default). */
export function formatTimespaceDisplayDate(date: Date | null, locale: string): string {
  if (!date) return '';
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function parseDateInputValue(value: string): Date | null {
  if (!value) return null;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

export function selectionOverlayPercents(
  range: TimeRange | null,
  domainStartMs: number,
  domainEndMs: number,
): { leftPct: number; widthPct: number } | null {
  if (!range?.from && !range?.to) return null;
  const span = domainEndMs - domainStartMs;
  if (span <= 0) return null;

  const fromMs = range.from ? startOfUtcDay(range.from.getTime()) : domainStartMs;
  const toMs = range.to ? endOfUtcDay(range.to.getTime()) : domainEndMs;
  const leftPct = ((fromMs - domainStartMs) / span) * 100;
  const widthPct = ((toMs - fromMs) / span) * 100;
  return {
    leftPct: Math.min(Math.max(leftPct, 0), 100),
    widthPct: Math.min(Math.max(widthPct, 0.5), 100 - leftPct),
  };
}
