import { useMemo } from "react";
import { getApiBase } from "@/lib/api";

export function useAdminApi() {
  const base = getApiBase();
  // Effects depending on this client must not restart on every state update.
  return useMemo(() => {
    const headers = { "Content-Type": "application/json" };
    const opts = { credentials: "include" as const };

    const handle = async (r: Response) => {
      let data: any = null;
      const contentType = r.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await r.json().catch(() => ({}));
      }

      if (r.status === 401) {
        window.dispatchEvent(new Event("admin:unauthorized"));
        throw { status: 401, ...(data || { error: "Unauthorized" }) };
      }
      if (r.status === 403) {
        throw { status: 403, ...(data || { error: "Access denied" }) };
      }
      if (!r.ok) {
        throw { status: r.status, ...(data || {}) };
      }
      return data;
    };

    const get = (path: string) => fetch(`${base}${path}`, { ...opts, method: "GET" }).then(handle);
    const post = (path: string, body?: any) => fetch(`${base}${path}`, { ...opts, method: "POST", headers, body: body ? JSON.stringify(body) : undefined }).then(handle);
    const put = (path: string, body: any) => fetch(`${base}${path}`, { ...opts, method: "PUT", headers, body: JSON.stringify(body) }).then(handle);
    const patch = (path: string, body: any) => fetch(`${base}${path}`, { ...opts, method: "PATCH", headers, body: JSON.stringify(body) }).then(handle);
    const del = (path: string) => fetch(`${base}${path}`, { ...opts, method: "DELETE" }).then(handle);

    return { get, post, put, patch, del };
  }, [base]);
}
