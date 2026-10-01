import { localizeApiMessage } from "@/i18n/api-error-translations";
import { getActiveLanguage } from "@/lib/workspace-locale";

export { localizeApiMessage } from "@/i18n/api-error-translations";

export type ApiError = Error & { status: number };

export async function readApiError(response: Response, fallback = "Une erreur est survenue."): Promise<ApiError> {
  const lang = getActiveLanguage();
  const body = await response.json().catch(() => ({}));
  const retryAfter = Number(response.headers.get("Retry-After"));
  const limitedMessage = Number.isFinite(retryAfter) && retryAfter > 0
    ? `Trop de requêtes. Veuillez patienter ${Math.ceil(retryAfter)} secondes avant de réessayer.`
    : "Trop de requêtes. Veuillez patienter une minute avant de réessayer.";
  const rawMessage = typeof body?.error === "string"
    ? body.error
    : response.status === 429 ? limitedMessage : fallback;
  const message = localizeApiMessage(rawMessage, lang);
  return Object.assign(new Error(message), { status: response.status });
}

export function shouldRetryApiRequest(failureCount: number, error: Error): boolean {
  const status = (error as Partial<ApiError>).status;
  // Do not amplify a rate limit or retry invalid/unauthorized requests.
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 3;
}