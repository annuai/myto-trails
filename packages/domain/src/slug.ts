// Page-address slugs: lowercase words joined by hyphens.

const MAX_LENGTH = 80;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Turns a name into a slug: lowercase, accents and symbols removed, words joined by hyphens, cut to the maximum length. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, "");
}

/** True when the text is already a well-formed slug. */
export function isValidSlug(s: string): boolean {
  return s.length <= MAX_LENGTH && SLUG.test(s);
}
