/**
 * Deterministic PRNG (mulberry32). Fixed seeds keep every generated entity
 * reproducible across sessions — the whole demo dataset is a pure function
 * of the constants in this module.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Integer in [min, max] inclusive. */
export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Fixed reference point for the demo dataset timeline. Derived once at
 * module load so all generated timestamps share a consistent "now". */
const REFERENCE_NOW = new Date('2026-10-26T12:00:00+08:00');

/** Deterministic ISO timestamps spread over the days before REFERENCE_NOW. */
export function isoTimestampWithinDays(daysAgoMin: number, daysAgoMax: number, offsetSeconds: number): string {
  const spanMs = (daysAgoMin - daysAgoMax) * 24 * 3600 * 1000;
  const ms = REFERENCE_NOW.getTime() - daysAgoMax * 24 * 3600 * 1000 + (offsetSeconds % (Math.abs(spanMs) || 1));
  return new Date(ms).toISOString();
}

export const REFERENCE_NOW_ISO = REFERENCE_NOW.toISOString();

export function padId(prefix: string, index: number, width = 4): string {
  return `${prefix}_${String(index).padStart(width, '0')}`;
}
