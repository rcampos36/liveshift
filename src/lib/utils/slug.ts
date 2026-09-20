export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "company";
}

export function uniqueSlug(value: string) {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slugify(value)}-${suffix}`;
}
