import { useEffect, useRef } from "react";
import { C } from "@/lib/theme";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export function ConferenceCamera({ stream, onError }: { stream: MediaStream; onError: () => void }) {
  const { w } = useWorkspaceLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;
    video.srcObject = stream;
    void video.play().catch(() => {
      if (active) onErrorRef.current();
    });
    return () => {
      active = false;
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <section className="space-y-3 rounded-lg bg-white p-4" style={{ border: `1px solid ${C.line}` }}>
      <h3 className="text-sm font-semibold" style={{ color: C.ink }}>{w("Votre caméra", "Your camera")}</h3>
      <video ref={videoRef} autoPlay muted playsInline onError={onError}
        aria-label={w("Votre caméra", "Your camera")}
        className="max-h-80 w-full rounded-md bg-black object-contain" />
    </section>
  );
}