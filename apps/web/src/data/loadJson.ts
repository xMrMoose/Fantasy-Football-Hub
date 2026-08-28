/** Fetches a committed /data JSON file, base-path aware (works under Vite's `base: "./"` on GitHub Pages). */
export async function loadJson<T>(relativePath: string): Promise<T> {
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}data/${relativePath}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${relativePath}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
