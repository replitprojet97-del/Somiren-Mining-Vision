import { useEffect, useRef, useState } from "react";
import { C } from "@/lib/theme";

export function LocalCameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = streamRef.current;
    if (streamRef.current) {
      void video.play().catch(() => {
        if (mountedRef.current) {
          setError("L’aperçu local n’a pas pu démarrer. Arrêtez puis relancez la caméra.");
          stopCamera();
        }
      });
    }
  }, [isActive]);

  function stopCamera(): void {
    requestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setIsStarting(false);
  }

  async function startCamera(): Promise<void> {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("La caméra n’est pas prise en charge par ce navigateur. Aucun flux distant n’est utilisé.");
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setIsActive(true);
    } catch (cameraError) {
      if (requestId === requestIdRef.current && mountedRef.current) {
        const detail = cameraError instanceof Error && cameraError.name === "NotAllowedError"
          ? "L’accès à la caméra a été refusé. Autorisez la caméra puis réessayez."
          : cameraError instanceof Error
            ? `Impossible d’ouvrir la caméra : ${cameraError.message}`
            : "Impossible d’ouvrir la caméra locale.";
        setError(detail);
      }
    } finally {
      if (requestId === requestIdRef.current && mountedRef.current) setIsStarting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg bg-white p-4" style={{ border: `1px solid ${C.line}` }}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Aperçu caméra local uniquement</h3>
        <p className="mt-1 text-xs" style={{ color: C.inkSoft }}>
          La vidéo reste dans cet appareil : aucun WebRTC, enregistrement, téléversement ou transmission.
        </p>
      </div>
      {isActive && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Aperçu vidéo local"
          onError={() => {
            setError("L’aperçu local a rencontré une erreur et la caméra a été arrêtée.");
            stopCamera();
          }}
          className="max-h-80 w-full rounded-md bg-black object-contain"
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!isActive ? (
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={isStarting}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-50"
            style={{ background: C.copper, color: "#fff" }}
          >
            {isStarting ? "Ouverture de la caméra…" : "Démarrer l’aperçu"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="rounded-md border px-4 py-2 text-sm font-medium"
            style={{ borderColor: C.line, color: C.ink }}
          >
            Arrêter la caméra
          </button>
        )}
        <span className="text-xs" style={{ color: C.green }}>Aperçu local, aucune transmission</span>
      </div>
      {error && <p role="alert" className="text-sm" style={{ color: C.red }}>{error}</p>}
    </section>
  );
}