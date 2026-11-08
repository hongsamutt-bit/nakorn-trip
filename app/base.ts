// Prefix for files in /public when the site is served from a sub-folder (GitHub Pages: /<repo>).
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (path: string) => `${BASE}${path}`;
