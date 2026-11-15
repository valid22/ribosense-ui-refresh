import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatProb(p: number) {
  return `${(p * 100).toFixed(1)}%`;
}

/** Bright bioluminescent hues for dark UI annotations */
export function hashColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = (h % 360);
  // bias away from muddy midtones toward signal greens/cyans/ambers
  const mapped = [72, 95, 145, 168, 198, 28, 45][h % 7];
  return `hsl(${mapped + (hue % 18)} 85% 62%)`;
}
