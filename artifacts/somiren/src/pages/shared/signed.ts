import { mediaRequest, openPrivateMedia } from "@/lib/private-media";
import { localizeApiMessage } from "@/i18n/api-error-translations";
import { getActiveLanguage } from "@/lib/workspace-locale";

export async function fetchSignedUrl(path: string): Promise<string> {
  const r = await mediaRequest<any>(path);
  const url = r?.url ?? r?.signedURL ?? r?.signedUrl;
  if (!url) throw new Error("Lien sécurisé indisponible.");
  return url;
}

export async function openSigned(path: string) {
  await openPrivateMedia(path);
}

export function errMsg(e: any, fb = "Une erreur est survenue."): string {
  const message = (typeof e?.error === "string" && e.error) || (typeof e?.message === "string" && e.message) || fb;
  return localizeApiMessage(message, getActiveLanguage());
}
