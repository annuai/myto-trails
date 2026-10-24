const MAX_LENGTH = 80;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

export function isValidSlug(s: string): boolean {
  return s.length <= MAX_LENGTH && SLUG.test(s);
}
