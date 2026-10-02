import { useEffect, useRef, useState } from "react";
import { C } from "@/lib/theme";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export function LocalCameraPreview({ autoStart = false }: { autoStart?: boolean }) {
  const { w, lang } = useWorkspaceLocale();
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
           setError(w("Impossible d’activer la caméra. Réessayez.", "Unable to turn on the camera. Try again."));
          stopCamera();
        }
      });
    }
  }, [isActive]);

  useEffect(() => {
    if (autoStart) void startCamera();
  }, [autoStart]);

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
       setError(w("La caméra n’est pas prise en charge par ce navigateur.", "This browser does not support the camera."));
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setIsActive(true);
    } catch (cameraError) {
      if (requestId === requestIdRef.current && mountedRef.current) {
        const detail = cameraError instanceof Error && cameraError.name === "NotAllowedError"
          ? w("L’accès à la caméra a été refusé. Autorisez la caméra puis réessayez.", "Camera access was denied. Allow camera access and try again.")
          : w("Caméra indisponible. Vérifiez son accès puis réessayez.", "Camera unavailable. Check camera access and try again.");
        setError(detail);
      }
    } finally {
      if (requestId === requestIdRef.current && mountedRef.current) setIsStarting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg bg-white p-4" style={{ border: `1px solid ${C.line}` }} aria-labelledby="local-camera-heading">
      <div>
        <h3 id="local-camera-heading" className="text-sm font-semibold" style={{ color: C.ink }}>{w("Votre caméra", "Your camera")}</h3>
      </div>
      {isActive && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label={w("Votre caméra", "Your camera")}
          onError={() => {
            setError(w("La caméra s’est arrêtée. Réessayez.", "The camera stopped. Try again."));
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
            {isStarting ? w("Ouverture de la caméra…", "Starting camera…") : w("Activer la caméra", "Turn on camera")}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="rounded-md border px-4 py-2 text-sm font-medium"
            style={{ borderColor: C.line, color: C.ink }}
          >
            {w("Arrêter la caméra", "Stop camera")}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm" style={{ color: C.red }}>{localizeCameraError(error, lang)}</p>}
    </section>
  );
}

function localizeCameraError(message: string, lang: "fr" | "en"): string {
  const pairs: readonly (readonly [string, string])[] = [
    ["Impossible d’activer la caméra. Réessayez.", "Unable to turn on the camera. Try again."],
    ["La caméra n’est pas prise en charge par ce navigateur.", "This browser does not support the camera."],
    ["L’accès à la caméra a été refusé. Autorisez la caméra puis réessayez.", "Camera access was denied. Allow camera access and try again."],
    ["Caméra indisponible. Vérifiez son accès puis réessayez.", "Camera unavailable. Check camera access and try again."],
    ["La caméra s’est arrêtée. Réessayez.", "The camera stopped. Try again."],
  ];
  const pair = pairs.find(([french, english]) => message === french || message === english);
  return pair ? pair[lang === "en" ? 1 : 0] : message;
}