const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;

export function findHardcodedColors(source: string): string[] {
  return source.match(HEX) ?? [];
}
