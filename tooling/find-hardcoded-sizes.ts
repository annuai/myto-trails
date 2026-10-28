// Finds style values that should come from the design tokens: sizes, spacing, radii, opacities and rgba() colours written
// as literals. 0 and 1 are allowed (no space, hairline). Comments are ignored.
const KEYS = [
  "fontSize", "lineHeight", "letterSpacing",
  "padding(?:Horizontal|Vertical|Top|Bottom|Left|Right|Start|End)?",
  "margin(?:Horizontal|Vertical|Top|Bottom|Left|Right|Start|End)?",
  "gap", "rowGap", "columnGap",
  "border(?:Top|Bottom|Left|Right)?(?:Start|End)?(?:Radius|Width)", "border(?:Top|Bottom)(?:Left|Right|Start|End)Radius",
  "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
  "top", "left", "right", "bottom", "opacity",
].join("|");
const NUMERIC = new RegExp(`\\b(?:${KEYS})\\s*:\\s*-?(?:\\d+\\.?\\d*|\\.\\d+)(?![\\w%.])`, "g");
const COLOUR_FN = /\b(?:rgba?|hsla?)\(/g;

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

export function findHardcodedSizes(source: string): string[] {
  const code = stripComments(source);
  const numeric = (code.match(NUMERIC) ?? []).filter((m) => !/:\s*-?(?:0|1)(?:\.0+)?$/.test(m));
  return [...numeric.map((m) => m.replace(/\s+/g, " ")), ...(code.match(COLOUR_FN) ?? [])];
}
