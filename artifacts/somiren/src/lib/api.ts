/**
 * Returns the base URL for all API calls.
 *
 * - In development (Replit): uses the relative path through the proxy
 *   e.g. /api
 * - In production (Render static site): reads VITE_API_BASE_URL
 *   e.g. https://somiren-api.onrender.com/api
 */
export function getApiBase(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, "");

  // Dev fallback: API served on sibling path through Replit proxy
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (base) {
    const parts = base.split("/").filter(Boolean);
    parts.pop(); // remove current artifact segment
    return (parts.length ? "/" + parts.join("/") : "") + "/api";
  }
  return "/api";
}
