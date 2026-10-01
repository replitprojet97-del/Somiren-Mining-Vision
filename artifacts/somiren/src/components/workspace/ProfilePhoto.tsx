import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, LoaderCircle, Trash2, UserRound } from "lucide-react";
import { useProfilePhoto } from "@/hooks/use-profile-photo";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProfilePhotoProps = {
  /** Optional caller-supplied reference image shown until the collaborator sets or removes their photo. */
  fallbackSrc?: string;
  fallbackAlt?: string;
  name?: string;
  className?: string;
};

function errorMessage(error: unknown, w: (french: string, english: string) => string): string | null {
  if (!error) return null;
  if (!(error instanceof Error)) return w("Une erreur est survenue. Réessayez.", "An error occurred. Please try again.");
  const message = error.message;
  const normalized = message.toLowerCase();
  if (normalized === "failed to fetch" || normalized.includes("networkerror")) return w("Connexion impossible. Vérifiez votre connexion réseau et réessayez.", "Unable to connect. Check your connection and try again.");
  if (normalized.includes("profile photo metadata could not be loaded")) return w("Les informations de la photo de profil n'ont pas pu être chargées.", "Profile photo information could not be loaded.");
  if (normalized.includes("could not create a profile photo url")) return w("La photo de profil n'a pas pu être affichée.", "The profile photo could not be displayed.");
  if (normalized.includes("a valid completed profile photo upload is required")) return w("Le fichier envoyé n'est pas une photo de profil valide.", "The uploaded file is not a valid profile photo.");
  if (normalized.includes("could not update the profile photo")) return w("La photo de profil n'a pas pu être mise à jour.", "The profile photo could not be updated.");
  if (normalized.includes("could not remove the profile photo")) return w("La photo de profil n'a pas pu être supprimée.", "The profile photo could not be removed.");
  if (normalized.includes("expected upload information")) return w("Le serveur n'a pas fourni les informations de téléversement attendues.", "The server did not provide the expected upload information.");
  if (normalized.includes("temporary upload address")) return w("L'adresse temporaire de téléversement est invalide.", "The temporary upload address is invalid.");
  if (normalized.includes("unsupported") && normalized.includes("protocol")) return w("Le protocole de téléversement fourni n'est pas pris en charge.", "The upload protocol provided is not supported.");
  if (normalized.includes("private upload failed")) return w("Le téléversement privé a échoué. Réessayez.", "The private upload failed. Please try again.");
  if (normalized.includes("upload") || normalized.includes("téléversement")) return w("Le téléversement a échoué. Réessayez.", "The upload failed. Please try again.");
  if (normalized.includes("http ")) return w("La demande a échoué. Réessayez.", "The request failed. Please try again.");
  return message;
}

function localizeProfileError(message: string, lang: "fr" | "en"): string {
  const apiMessage = localizeApiMessage(message, lang);
  const pairs: Record<string, readonly [string, string]> = {
    "Connexion impossible. Vérifiez votre connexion réseau et réessayez.": ["Connexion impossible. Vérifiez votre connexion réseau et réessayez.", "Unable to connect. Check your connection and try again."],
    "Unable to connect. Check your connection and try again.": ["Connexion impossible. Vérifiez votre connexion réseau et réessayez.", "Unable to connect. Check your connection and try again."],
    "Choisissez une image JPEG, PNG ou WebP. Les fichiers SVG ne sont pas acceptés.": ["Choisissez une image JPEG, PNG ou WebP. Les fichiers SVG ne sont pas acceptés.", "Choose a JPEG, PNG or WebP image. SVG files are not accepted."],
    "Choose a JPEG, PNG or WebP image. SVG files are not accepted.": ["Choisissez une image JPEG, PNG ou WebP. Les fichiers SVG ne sont pas acceptés.", "Choose a JPEG, PNG or WebP image. SVG files are not accepted."],
    "Le fichier image est vide.": ["Le fichier image est vide.", "The image file is empty."],
    "The image file is empty.": ["Le fichier image est vide.", "The image file is empty."],
    "La photo doit peser 5 Mo maximum.": ["La photo doit peser 5 Mo maximum.", "The photo must be no larger than 5 MB."],
    "The photo must be no larger than 5 MB.": ["La photo doit peser 5 Mo maximum.", "The photo must be no larger than 5 MB."],
    "Le téléversement a échoué. Réessayez.": ["Le téléversement a échoué. Réessayez.", "The upload failed. Please try again."],
    "The upload failed. Please try again.": ["Le téléversement a échoué. Réessayez.", "The upload failed. Please try again."],
    "Une erreur est survenue. Réessayez.": ["Une erreur est survenue. Réessayez.", "An error occurred. Please try again."],
    "An error occurred. Please try again.": ["Une erreur est survenue. Réessayez.", "An error occurred. Please try again."],
    "Les informations de la photo de profil n'ont pas pu être chargées.": ["Les informations de la photo de profil n'ont pas pu être chargées.", "Profile photo information could not be loaded."],
    "Profile photo information could not be loaded.": ["Les informations de la photo de profil n'ont pas pu être chargées.", "Profile photo information could not be loaded."],
    "La photo de profil n'a pas pu être affichée.": ["La photo de profil n'a pas pu être affichée.", "The profile photo could not be displayed."],
    "The profile photo could not be displayed.": ["La photo de profil n'a pas pu être affichée.", "The profile photo could not be displayed."],
    "Le fichier envoyé n'est pas une photo de profil valide.": ["Le fichier envoyé n'est pas une photo de profil valide.", "The uploaded file is not a valid profile photo."],
    "The uploaded file is not a valid profile photo.": ["Le fichier envoyé n'est pas une photo de profil valide.", "The uploaded file is not a valid profile photo."],
    "La photo de profil n'a pas pu être mise à jour.": ["La photo de profil n'a pas pu être mise à jour.", "The profile photo could not be updated."],
    "The profile photo could not be updated.": ["La photo de profil n'a pas pu être mise à jour.", "The profile photo could not be updated."],
    "La photo de profil n'a pas pu être supprimée.": ["La photo de profil n'a pas pu être supprimée.", "The profile photo could not be removed."],
    "The profile photo could not be removed.": ["La photo de profil n'a pas pu être supprimée.", "The profile photo could not be removed."],
  };
  const pair = pairs[message];
  return pair ? pair[lang === "en" ? 1 : 0] : apiMessage;
}

export function ProfilePhoto({
  fallbackSrc,
  fallbackAlt,
  name = "votre profil",
  className = "",
}: ProfilePhotoProps) {
  const { lang, w } = useWorkspaceLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const {
    photo,
    removed,
    isLoading,
    error,
    uploadPhoto,
    isUploading,
    uploadError,
    removePhoto,
    isRemoving,
    removeError,
  } = useProfilePhoto();

  const imageSource = photo?.url ?? (!isLoading && !removed && !error ? fallbackSrc : undefined);
  const visibleSource = imageSource && imageSource !== failedSource ? imageSource : undefined;
  const busy = isLoading || isUploading || isRemoving;
  const displayedError = localError
    ?? errorMessage(uploadError, w)
    ?? errorMessage(removeError, w)
    ?? errorMessage(error, w);

  async function onChoose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setLocalError(null);
    if (!file) return;
    if (!SUPPORTED_TYPES.has(file.type.toLowerCase())) {
      setLocalError(w("Choisissez une image JPEG, PNG ou WebP. Les fichiers SVG ne sont pas acceptés.", "Choose a JPEG, PNG or WebP image. SVG files are not accepted."));
      return;
    }
    if (file.size <= 0) {
      setLocalError(w("Le fichier image est vide.", "The image file is empty."));
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setLocalError(w("La photo doit peser 5 Mo maximum.", "The photo must be no larger than 5 MB."));
      return;
    }
    try {
      await uploadPhoto(file);
    } catch {
      // The hook exposes the mutation error; rendering it keeps server details visible.
    }
  }

  async function onRemove() {
    setLocalError(null);
    try {
      await removePhoto();
    } catch {
      // The hook exposes the mutation error; rendering it keeps server details visible.
    }
  }

  return (
    <section className={`flex flex-wrap items-center gap-5 ${className}`} aria-label={w("Photo de profil", "Profile photo")}>
      <div
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100"
        aria-busy={isLoading}
      >
        {visibleSource ? (
          <img
            src={visibleSource}
            alt={photo ? w(`Photo de profil de ${name}`, `Profile photo of ${name}`) : fallbackAlt ?? w(`Image de référence de ${name}`, `Reference image of ${name}`)}
            className="h-full w-full object-cover"
            onError={() => setFailedSource(visibleSource)}
          />
        ) : (
          <UserRound aria-hidden="true" className="h-9 w-9 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{w("Photo de profil", "Profile photo")}</p>
        <p className="mt-1 text-sm text-slate-600">
          {w("JPEG, PNG ou WebP · 5 Mo maximum", "JPEG, PNG or WebP · 5 MB maximum")}
          {isLoading ? w(" · Chargement…", " · Loading…") : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void onChoose(event)}
            disabled={busy}
            aria-label={w("Choisir une photo de profil", "Choose a profile photo")}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-amber-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {isUploading ? w("Enregistrement…", "Saving…") : photo ? w("Changer ma photo", "Change my photo") : w("Choisir une photo", "Choose a photo")}
          </button>
          <button
            type="button"
            onClick={() => void onRemove()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRemoving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isRemoving ? w("Suppression…", "Removing…") : w("Retirer la photo", "Remove photo")}
          </button>
        </div>
        {displayedError && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {localizeProfileError(displayedError, lang)}
          </p>
        )}
      </div>
    </section>
  );
}