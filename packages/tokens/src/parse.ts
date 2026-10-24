export function parseCssVariables(css: string): Record<string, string> {
  const result: Record<string, string> = {};
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of withoutComments.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    const name = match[1];
    const value = match[2]?.trim();
    if (!name || !value || value.startsWith("var(")) continue;
    result[name] = value;
  }
  return result;
}
