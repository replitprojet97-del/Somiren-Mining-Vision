import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, LoaderCircle, Trash2, UserRound } from "lucide-react";
import { useProfilePhoto } from "@/hooks/use-profile-photo";

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProfilePhotoProps = {
  /** Optional caller-supplied reference image shown until the collaborator sets or removes their photo. */
  fallbackSrc?: string;
  fallbackAlt?: string;
  name?: string;
  className?: string;
};

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Une erreur est survenue. Réessayez.";
}

export function ProfilePhoto({
  fallbackSrc,
  fallbackAlt,
  name = "votre profil",
  className = "",
}: ProfilePhotoProps) {
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
    ?? errorMessage(uploadError)
    ?? errorMessage(removeError)
    ?? errorMessage(error);

  async function onChoose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setLocalError(null);
    if (!file) return;
    if (!SUPPORTED_TYPES.has(file.type.toLowerCase())) {
      setLocalError("Choisissez une image JPEG, PNG ou WebP. Les fichiers SVG ne sont pas acceptés.");
      return;
    }
    if (file.size <= 0) {
      setLocalError("Le fichier image est vide.");
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setLocalError("La photo doit peser 5 Mo maximum.");
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
    <section className={`flex flex-wrap items-center gap-5 ${className}`} aria-label="Photo de profil">
      <div
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100"
        aria-busy={isLoading}
      >
        {visibleSource ? (
          <img
            src={visibleSource}
            alt={photo ? `Photo de profil de ${name}` : fallbackAlt ?? `Image de référence de ${name}`}
            className="h-full w-full object-cover"
            onError={() => setFailedSource(visibleSource)}
          />
        ) : (
          <UserRound aria-hidden="true" className="h-9 w-9 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">Photo de profil</p>
        <p className="mt-1 text-sm text-slate-600">
          JPEG, PNG ou WebP · 5 Mo maximum
          {isLoading ? " · Chargement…" : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void onChoose(event)}
            disabled={busy}
            aria-label="Choisir une photo de profil"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-amber-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {isUploading ? "Enregistrement…" : photo ? "Changer ma photo" : "Choisir une photo"}
          </button>
          <button
            type="button"
            onClick={() => void onRemove()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRemoving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isRemoving ? "Suppression…" : "Retirer la photo"}
          </button>
        </div>
        {displayedError && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {displayedError}
          </p>
        )}
      </div>
    </section>
  );
}