/**
 * Math and positioning utilities for the 3D VHS filmography shelf.
 */

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Standard cubic smoothstep: 3x^2 - 2x^3 for x in [0, 1]
 */
export function smoothstep(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Smooth step function B(r) for neighbor push-apart effect.
 * For |r| < 1: (r + sin(πr)/π) / 2
 * Otherwise: ±0.5
 */
export function smoothStepB(r: number): number {
  if (Math.abs(r) < 1) {
    return (r + Math.sin(Math.PI * r) / Math.PI) / 2;
  }
  return r > 0 ? 0.5 : -0.5;
}

/**
 * Computes horizontal offset F(r) from shelf center.
 * F(r) = r * (ws + gap) + (d - ws + 1.6 * gap) * B(r)
 */
export function computeTapeX(
  r: number,
  ws: number,
  d: number,
  gap: number
): number {
  return r * (ws + gap) + (d - ws + 1.6 * gap) * smoothStepB(r);
}

/**
 * Computes relative index r of virtual tape index v to scroll s,
 * wrapped into range [-18, +18).
 */
export function computeRelativeIndex(v: number, s: number): number {
  let r = (v - s) % 36;
  while (r > 18) r -= 36;
  while (r <= -18) r += 36;
  return r;
}

/**
 * Computes tape openness (0 = spine, 1 = full cover face).
 * openness = smoothstep(max(0, 1 - |r|))
 */
export function computeOpenness(r: number): number {
  return smoothstep(Math.max(0, 1 - Math.abs(r)));
}

/**
 * Background crop CSS parameters for a sheet sub-rectangle.
 */
export interface CropCss {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
}

export function computeCropCss(
  sheetUrl: string,
  sheetW: number,
  sheetH: number,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number
): CropCss {
  const sizeX = (sheetW / cropW) * 100;
  const sizeY = (sheetH / cropH) * 100;
  const posX = sheetW === cropW ? 0 : (cropX / (sheetW - cropW)) * 100;
  const posY = sheetH === cropH ? 0 : (cropY / (sheetH - cropH)) * 100;

  return {
    backgroundImage: `url("${sheetUrl}")`,
    backgroundSize: `${sizeX}% ${sizeY}%`,
    backgroundPosition: `${posX}% ${posY}%`,
  };
}

/**
 * Shortest circular jump on a 12-film loop from current scroll s to target film index (0..11).
 */
export function shortestJumpToFilm(currentS: number, targetFilmIndex: number): number {
  const currentMod = ((((currentS % 12) + 12) % 12));
  let diff = targetFilmIndex - currentMod;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return currentS + diff;
}

/**
 * Ink blot radius calculation over elapsed time (ms).
 * Blobs grow from 0 to 720 over 1250ms with ease-out cubic after their delay.
 */
export function computeBlobRadius(
  elapsedMs: number,
  blobDelayMs: number,
  durationMs: number = 1250,
  maxRadius: number = 720
): number {
  if (elapsedMs <= blobDelayMs) return 0;
  const p = clamp((elapsedMs - blobDelayMs) / durationMs, 0, 1);
  const easeOutCubic = 1 - Math.pow(1 - p, 3);
  return easeOutCubic * maxRadius;
}
