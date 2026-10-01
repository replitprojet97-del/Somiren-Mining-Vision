import { getApiBase } from "@/lib/api";
import { getActiveLanguage } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export function localizePrivateMediaMessage(message: string, lang: "fr" | "en" = getActiveLanguage()): string {
  const apiMessage = localizeApiMessage(message, lang);
  if (apiMessage !== message) return apiMessage;

  const pairs: readonly (readonly [string, string])[] = [
    ["Le chemin du média privé doit être un chemin d’API relatif.", "The private media path must be a relative API path."],
    ["Un nom de fichier est requis pour le téléversement.", "A file name is required for upload."],
    ["Le fichier est vide.", "The file is empty."],
    ["Le serveur n’a pas fourni les informations de téléversement attendues.", "The server did not provide the expected upload information."],
    ["L’adresse temporaire de téléversement fournie par le serveur est invalide.", "The temporary upload address provided by the server is invalid."],
    ["Le stockage privé a fourni un protocole de téléversement non pris en charge.", "Private storage provided an unsupported upload protocol."],
    ["Le serveur n’a pas fourni un lien temporaire de média valide.", "The server did not provide a valid temporary media link."],
    ["Le serveur n’a pas fourni une adresse de média valide.", "The server did not provide a valid media address."],
    ["Le serveur a fourni un protocole de média non pris en charge.", "The server provided an unsupported media protocol."],
    ["La fenêtre du média a été bloquée. Autorisez les fenêtres contextuelles puis réessayez.", "The media window was blocked. Allow pop-ups and try again."],
    ["Le lien privé a expiré ou le téléchargement est indisponible. Demandez un nouveau lien.", "The private link expired or the download is unavailable. Request a new link."],
  ];
  const pair = pairs.find(([french, english]) => message === french || message === english);
  if (pair) return pair[lang === "en" ? 1 : 0];

  const statusPatterns: readonly (readonly [RegExp, (status: string) => string])[] = [
    [/^La requête média a échoué \(HTTP (\d+)\)\.$/u, (status) => lang === "en" ? `Media request failed (HTTP ${status}).` : `La requête média a échoué (HTTP ${status}).`],
    [/^Media request failed \(HTTP (\d+)\)\.$/u, (status) => lang === "en" ? `Media request failed (HTTP ${status}).` : `La requête média a échoué (HTTP ${status}).`],
    [/^Le téléversement privé a échoué \(HTTP (\d+)\)\.$/u, (status) => lang === "en" ? `Private upload failed (HTTP ${status}).` : `Le téléversement privé a échoué (HTTP ${status}).`],
    [/^Private upload failed \(HTTP (\d+)\)\.$/u, (status) => lang === "en" ? `Private upload failed (HTTP ${status}).` : `Le téléversement privé a échoué (HTTP ${status}).`],
  ];
  for (const [pattern, formatStatus] of statusPatterns) {
    const match = pattern.exec(message);
    if (match) return formatStatus(match[1]);
  }
  return message;
}

function text(french: string, english: string): string {
  return getActiveLanguage() === "en" ? english : french;
}

export type PrivateMediaLink = {
  url: string;
  fileName: string;
  contentType: string;
  expiresIn: number;
};

type UploadRequest = {
  assetId: string;
  uploadURL: string;
  method: "PUT";
  headers: Record<string, string>;
};

function apiUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(path)) {
    throw new Error(text("Le chemin du média privé doit être un chemin d’API relatif.", "The private media path must be a relative API path."));
  }
  return `${getApiBase()}${path}`;
}

async function responseData<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
       : text(`La requête média a échoué (HTTP ${response.status}).`, `Media request failed (HTTP ${response.status}).`);
    throw new Error(message);
  }
  return payload as T;
}

/** Authenticated application API request; private signed storage URLs are never logged. */
export async function mediaRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  return responseData<T>(response);
}

export async function uploadPrivateFile(
  file: File | Blob,
  kind: "document" | "audio" | "video" | "profile-photo",
  fileName?: string,
): Promise<string> {
  const resolvedName = fileName?.trim() || (file instanceof File ? file.name : "");
  if (!resolvedName) throw new Error(text("Un nom de fichier est requis pour le téléversement.", "A file name is required for upload."));
  if (file.size <= 0) throw new Error(text("Le fichier est vide.", "The file is empty."));

  const contentType = file.type || "application/octet-stream";
  const request = await mediaRequest<UploadRequest>("/storage/uploads/request-url", {
    method: "POST",
    body: JSON.stringify({
      fileName: resolvedName,
      contentType,
      size: file.size,
      kind,
    }),
  });
  if (!request.assetId || !request.uploadURL || request.method !== "PUT") {
    throw new Error(text("Le serveur n’a pas fourni les informations de téléversement attendues.", "The server did not provide the expected upload information."));
  }

  let uploadUrl: URL;
  try {
    uploadUrl = new URL(request.uploadURL);
  } catch {
    throw new Error(text("L’adresse temporaire de téléversement fournie par le serveur est invalide.", "The temporary upload address provided by the server is invalid."));
  }
  if (uploadUrl.protocol !== "https:" && uploadUrl.protocol !== "http:") {
    throw new Error(text("Le stockage privé a fourni un protocole de téléversement non pris en charge.", "Private storage provided an unsupported upload protocol."));
  }

  // This PUT goes directly to the authorized private storage URL. Do not send
  // application cookies or credentials to the storage provider.
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: request.headers,
    body: file,
    credentials: "omit",
  });
  if (!uploaded.ok) {
    throw new Error(text(`Le téléversement privé a échoué (HTTP ${uploaded.status}).`, `Private upload failed (HTTP ${uploaded.status}).`));
  }

  await mediaRequest(`/storage/uploads/${encodeURIComponent(request.assetId)}/complete`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return request.assetId;
}

export async function fetchPrivateMediaLink(fileEndpoint: string): Promise<PrivateMediaLink> {
  const link = await mediaRequest<PrivateMediaLink>(fileEndpoint);
  if (
    !link ||
    typeof link.url !== "string" ||
    typeof link.fileName !== "string" ||
    typeof link.contentType !== "string" ||
    !Number.isFinite(link.expiresIn) ||
    link.expiresIn <= 0
  ) {
    throw new Error(text("Le serveur n’a pas fourni un lien temporaire de média valide.", "The server did not provide a valid temporary media link."));
  }
  let signedUrl: URL;
  try {
    signedUrl = new URL(link.url);
  } catch {
    throw new Error(text("Le serveur n’a pas fourni une adresse de média valide.", "The server did not provide a valid media address."));
  }
  if (signedUrl.protocol !== "https:" && signedUrl.protocol !== "http:") {
    throw new Error(text("Le serveur a fourni un protocole de média non pris en charge.", "The server provided an unsupported media protocol."));
  }
  return link;
}

/** Open a private file after fetching its short-lived link on user request. */
export async function openPrivateMedia(fileEndpoint: string): Promise<void> {
  const opened = window.open("about:blank", "_blank");
  if (!opened) throw new Error(text("La fenêtre du média a été bloquée. Autorisez les fenêtres contextuelles puis réessayez.", "The media window was blocked. Allow pop-ups and try again."));
  opened.opener = null;
  try {
    const link = await fetchPrivateMediaLink(fileEndpoint);
    opened.location.replace(link.url);
  } catch (error) {
    opened.close();
    throw error;
  }
}

/** Download a private file without sending application cookies to object storage. */
export async function downloadPrivateMedia(fileEndpoint: string, suggestedName?: string): Promise<void> {
  const link = await fetchPrivateMediaLink(fileEndpoint);
  const response = await fetch(link.url, { credentials: "omit" });
  if (!response.ok) {
    throw new Error(text("Le lien privé a expiré ou le téléchargement est indisponible. Demandez un nouveau lien.", "The private link expired or the download is unavailable. Request a new link."));
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = suggestedName || link.fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}