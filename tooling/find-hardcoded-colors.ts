// Finds colours written as hex literals in a source file, so `npm run check:colors` can require the design tokens instead.

const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;

/**
 * Every `#rgb`, `#rrggbb` or `#rrggbbaa` literal in the text. A `#` that follows a word character or `&` (an HTML entity, a URL fragment)
 * is not a colour.
 */
export function findHardcodedColors(source: string): string[] {
  return source.match(HEX) ?? [];
}
