import { useState } from "react";
import { C } from "@/lib/theme";
import { fetchPrivateMediaLink, localizePrivateMediaMessage } from "@/lib/private-media";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

type PrivateAudioProps = {
  fileEndpoint: string;
};

export function PrivateAudio({ fileEndpoint }: PrivateAudioProps) {
  const { w, lang } = useWorkspaceLocale();
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadPrivateLink(): Promise<void> {
    setIsLoading(true);
    setError("");
    setSource("");
    try {
      const link = await fetchPrivateMediaLink(fileEndpoint);
      setSource(link.url);
      setFileName(link.fileName);
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? w("Impossible de récupérer le lien audio privé. Réessayez.", "Unable to retrieve the private audio link. Please try again.")
        : requestError instanceof Error
          ? requestError.message
          : w("Impossible de récupérer le lien audio privé. Réessayez.", "Unable to retrieve the private audio link. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md bg-white p-3" style={{ border: `1px solid ${C.line}` }}>
      {!source ? (
        <button
          type="button"
          onClick={() => void loadPrivateLink()}
          disabled={isLoading}
          className="rounded-md px-3 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-50"
          style={{ background: C.copper, color: "#fff" }}
        >
          {isLoading ? w("Récupération du lien sécurisé…", "Retrieving secure link…") : w("Écouter le fichier audio", "Listen to audio file")}
        </button>
      ) : (
        <>
          <p className="text-xs" style={{ color: C.inkSoft }}>{fileName}</p>
          <audio
            controls
            preload="none"
            src={source}
            className="w-full"
            aria-label={`${w("Lecture audio privée", "Private audio playback")}${fileName ? `: ${fileName}` : ""}`}
            onError={() => {
              setSource("");
               setError(w("Le lien temporaire a expiré ou la lecture a échoué. Récupérez un nouveau lien pour réessayer.", "The temporary link has expired or playback failed. Get a new link to try again."));
            }}
          />
          <button
            type="button"
            onClick={() => void loadPrivateLink()}
            disabled={isLoading}
            className="text-xs underline underline-offset-2 disabled:opacity-50"
            style={{ color: C.blue }}
          >
            {w("Récupérer un nouveau lien", "Get a new link")}
          </button>
        </>
      )}
      {error && <p role="alert" className="text-sm" style={{ color: C.red }}>{localizePrivateMediaMessage(error, lang)}</p>}
      <p className="text-xs" style={{ color: C.inkFaint }}>
         {w("Le lien privé n’est demandé au serveur que lorsque vous lancez l’écoute et expire après quelques minutes.", "The private link is only requested from the server when you start playback and expires after a few minutes.")}
      </p>
    </div>
  );
}