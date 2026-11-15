import { classLabel } from "@/lib/labels";

const PALETTE = [
  "#c8f542",
  "#7dffb3",
  "#6ec8ff",
  "#f0d35a",
  "#ff8b5c",
  "#d4a1ff",
  "#5eead4",
  "#fb7185",
  "#a3e635",
  "#38bdf8",
  "#fbbf24",
  "#f472b6",
  "#34d399",
  "#818cf8",
  "#fb923c",
];

export function familyColor(labelOrIndex: string | number) {
  const label =
    typeof labelOrIndex === "number"
      ? classLabel(labelOrIndex)
      : labelOrIndex;
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
