import axe from "axe-core";

/** Runs axe on the rendered document and returns readable violations. Colour contrast needs a real browser, so it is off here. */
export async function violations(container: Element): Promise<string[]> {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
}
