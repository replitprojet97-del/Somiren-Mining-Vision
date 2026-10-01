import { useState } from "react";
import { C } from "@/lib/theme";
import { fetchPrivateMediaLink } from "@/lib/private-media";

type PrivateAudioProps = {
  fileEndpoint: string;
};

export function PrivateAudio({ fileEndpoint }: PrivateAudioProps) {
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
      setError(requestError instanceof Error
        ? requestError.message
        : "Impossible de récupérer le lien audio privé. Réessayez.");
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
          {isLoading ? "Récupération du lien sécurisé…" : "Écouter le fichier audio"}
        </button>
      ) : (
        <>
          <p className="text-xs" style={{ color: C.inkSoft }}>{fileName}</p>
          <audio
            controls
            preload="none"
            src={source}
            className="w-full"
            aria-label={`Lecture audio privée${fileName ? ` : ${fileName}` : ""}`}
            onError={() => {
              setSource("");
              setError("Le lien temporaire a expiré ou la lecture a échoué. Récupérez un nouveau lien pour réessayer.");
            }}
          />
          <button
            type="button"
            onClick={() => void loadPrivateLink()}
            disabled={isLoading}
            className="text-xs underline underline-offset-2 disabled:opacity-50"
            style={{ color: C.blue }}
          >
            Récupérer un nouveau lien
          </button>
        </>
      )}
      {error && <p role="alert" className="text-sm" style={{ color: C.red }}>{error}</p>}
      <p className="text-xs" style={{ color: C.inkFaint }}>
        Le lien privé n’est demandé au serveur que lorsque vous lancez l’écoute et expire après quelques minutes.
      </p>
    </div>
  );
}