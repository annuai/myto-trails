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
// The same keys with a condition ("landscape ? 12 : 20"), plus shadow and layer values: a number can hide on either side of the "?".
const CONDITION = new RegExp(`\\b(?:${KEYS}|shadowRadius|shadowOpacity|elevation|zIndex)\\s*:\\s*[^,{}\\n]*\\?[^,{}\\n]*`, "g");
const BARE_NUMBER = /(?<![\w.[])-?(?:\d+\.?\d*|\.\d+)(?![\w.%\]])/g;
const SHADOW = /\b(?:shadowRadius|shadowOpacity|elevation|zIndex)\s*:\s*-?(?:\d+\.?\d*|\.\d+)(?![\w.%\]])/g;
const plain = (n: string) => /^-?(?:0|1)(?:\.0+)?$/.test(n);

/** For "key: a ? b : 20" the text up to the first number that is not 0 or 1, or nothing when every number in it is 0, 1 or a token. */
function inCondition(expr: string): string | null {
  const q = expr.indexOf("?");
  for (const m of expr.slice(q).matchAll(BARE_NUMBER)) if (!plain(m[0])) return expr.slice(0, q + (m.index ?? 0) + m[0].length);
  return null;
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

export function findHardcodedSizes(source: string): string[] {
  const code = stripComments(source);
  const numeric = (code.match(NUMERIC) ?? []).filter((m) => !/:\s*-?(?:0|1)(?:\.0+)?$/.test(m));
  const conditional = (code.match(CONDITION) ?? []).map(inCondition).filter((m): m is string => m !== null);
  const shadows = (code.match(SHADOW) ?? []).filter((m) => !plain(m.split(":")[1]!.trim()));
  return [...numeric, ...conditional, ...shadows].map((m) => m.replace(/\s+/g, " ")).concat(code.match(COLOUR_FN) ?? []);
}
