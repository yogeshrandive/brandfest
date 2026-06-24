import type { PosterSize } from "./types";

export interface SafeZones {
  logo: { top: number; right: number; width: number; height: number };
  headline: { top: number; left: number; right: number; maxHeight: number };
  contact: { bottom: number; left: number; right: number; height: number };
  scrim: { top: number; bottom: number };
}

export function getSafeZones(size: PosterSize, w: number, h: number): SafeZones {
  if (size === "square") {
    return {
      logo: { top: 40, right: 40, width: 220, height: 55 },
      headline: { top: Math.round(h * 0.52), left: 60, right: 60, maxHeight: Math.round(h * 0.28) },
      contact: { bottom: 0, left: 0, right: 0, height: Math.round(h * 0.12) },
      scrim: { top: Math.round(h * 0.48), bottom: 0 },
    };
  }
  return {
    logo: { top: 60, right: 50, width: 240, height: 60 },
    headline: { top: Math.round(h * 0.62), left: 70, right: 70, maxHeight: Math.round(h * 0.22) },
    contact: { bottom: 0, left: 0, right: 0, height: Math.round(h * 0.08) },
    scrim: { top: Math.round(h * 0.58), bottom: 0 },
  };
}
