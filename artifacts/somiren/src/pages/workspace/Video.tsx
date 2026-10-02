import { useEffect, useRef, useState } from "react";
import { Video, ArrowRight, RefreshCw } from "lucide-react";
import { C } from "@/lib/theme";
import { conferenceWindow, type ConferenceMeeting } from "@/lib/conference-window";
import { useMeetings } from "@/hooks/use-workspace";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { ConferenceCamera } from "@/components/media/ConferenceCamera";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { fetchSignedUrl, errMsg } from "../shared/signed";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export default function VideoView({ visible = true }: { visible?: boolean }) {
  const { w, lang, formatDateTime } = useWorkspaceLocale();
  const { profile, isLoading: profileLoading } = useWorkspaceAuth();
  const permissions = profile?.permissions ?? [];
  const permitted = permissions.includes("CAN_USE_VIDEO_CONFERENCE") && permissions.includes("PARTICIPATE_IN_MEETINGS");
  const meetings = useMeetings(permitted);
  const [now, setNow] = useState(Date.now);
  const [selected, setSelected] = useState<ConferenceMeeting | null>(null);
  const [session, setSession] = useState<{ meeting: ConferenceMeeting; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());
  const joined = useRef(new Set<number>());
  const [ended, setEnded] = useState(false);
  const requestId = useRef(0);
  const mounted = useRef(false);
  const authorizedMeetings = permitted ? (meetings.data ?? []) as ConferenceMeeting[] : [];
  const assignedSessionMeeting = session && authorizedMeetings.find(meeting => meeting.id === session.meeting.id);
  const available = authorizedMeetings.filter(meeting => meeting.videoAssetId && !completed.has(meeting.id) && conferenceWindow(meeting, now) !== "ended");
  const sessionMeeting = session && available.find(meeting => meeting.id === session.meeting.id && conferenceWindow(meeting, now) === "active");

  useEffect(() => {
    mounted.current = true;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      mounted.current = false;
      requestId.current += 1;
      window.clearInterval(interval);
      cameraRef.current?.getTracks().forEach(track => track.stop());
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (session && conferenceWindow(assignedSessionMeeting || session.meeting, now) === "ended") {
      finish(session.meeting);
    } else if (session && (!permitted || (!meetings.isError && !meetings.isLoading && !sessionMeeting)
      || [401, 403].includes((meetings.error as { status?: number } | null)?.status ?? 0))) {
      cancelEntry();
      setSession(null);
      setError(w("L’accès à cette visioconférence est indisponible.", "Access to this video conference is unavailable."));
    } else if (selected && (!visible || !available.some(meeting => meeting.id === selected.id && conferenceWindow(meeting, now) === "active"))) {
      cancelEntry();
    }
  }, [permitted, meetings.data, meetings.isError, meetings.isLoading, meetings.error, now, selected, session, sessionMeeting, assignedSessionMeeting, visible]);

  useEffect(() => {
    if (!cameraStream) return;
    const interrupted = () => {
      requestId.current += 1;
      stopCamera();
      setSession(null);
      setSelected(null);
      setBusy(false);
      setError(w("La caméra s’est arrêtée. Réessayez.", "The camera stopped. Try again."));
    };
    const tracks = cameraStream.getVideoTracks();
    tracks.forEach(track => track.addEventListener("ended", interrupted));
    return () => tracks.forEach(track => track.removeEventListener("ended", interrupted));
  }, [cameraStream]);

  function stopCamera() {
    const stream = cameraRef.current;
    cameraRef.current = null;
    stream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
  }

  function cancelEntry() {
    requestId.current += 1;
    stopCamera();
    setSelected(null);
    setBusy(false);
  }

  function finish(meeting: ConferenceMeeting) {
    cancelEntry();
    setCompleted(previous => new Set(previous).add(meeting.id));
    setSession(null);
    setError(null);
    setMediaError(false);
    setEnded(true);
  }

  async function join(meeting: ConferenceMeeting) {
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      if (!cameraRef.current?.getVideoTracks().some(track => track.readyState === "live" && track.enabled)) {
        stopCamera();
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(w("Caméra indisponible.", "Camera unavailable."));
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!mounted.current || id !== requestId.current || conferenceWindow(meeting) !== "active") {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (!stream.getVideoTracks().some(track => track.readyState === "live" && track.enabled)) {
          stream.getTracks().forEach(track => track.stop());
          throw new Error(w("Caméra indisponible.", "Camera unavailable."));
        }
        cameraRef.current = stream;
        setCameraStream(stream);
      }
      // This existing endpoint rechecks the assigned participant, camera permission and time window.
      const url = await fetchSignedUrl(`/workspace/meetings/${meeting.id}/video`);
      if (!mounted.current || id !== requestId.current) return;
      if (conferenceWindow(meeting) !== "active") { finish(meeting); return; }
      if (!cameraRef.current?.getVideoTracks().some(track => track.readyState === "live" && track.enabled)) {
        throw new Error(w("Caméra indisponible.", "Camera unavailable."));
      }
      setSession({ meeting, url });
      joined.current.add(meeting.id);
      setSelected(null);
      setMediaError(false);
      setEnded(false);
    } catch (err) {
      if (mounted.current && id === requestId.current) {
        setSession(null);
        stopCamera();
        const fallback = w("Impossible de rejoindre cette visioconférence. L’accès a peut-être expiré.", "Unable to join this video conference. Access may have expired.");
        const denied = err instanceof Error && err.name === "NotAllowedError";
        const cameraUnavailable = err instanceof Error && ["NotFoundError", "NotReadableError", "OverconstrainedError"].includes(err.name);
        setError(denied
          ? w("Autorisez la caméra pour rejoindre la visioconférence.", "Allow camera access to join the video conference.")
          : cameraUnavailable ? w("Caméra indisponible.", "Camera unavailable.")
          : err instanceof TypeError ? fallback : errMsg(err, fallback));
      }
    } finally {
      if (mounted.current && id === requestId.current) setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Visioconférences", "Video conferences")}</h1>
      {ended && <p role="status" className="text-sm" style={{ color: C.ink }}>{w("La visioconférence est terminée.", "The video conference has ended.")}</p>}
      {error && !selected && <p className="text-sm text-red-600" role="alert">{localizeVideoError(error, lang)}</p>}
      {profileLoading || (permitted && meetings.isLoading) ? <p className="text-sm" style={{ color: C.inkSoft }}>{w("Chargement des visioconférences…", "Loading video conferences…")}</p>
        : permitted && meetings.isError && !session ? <p className="text-sm text-red-600" role="alert">{w("Les visioconférences sont momentanément indisponibles.", "Video conferences are temporarily unavailable.")}</p>
        : session && sessionMeeting && cameraStream ? (
          <section className="space-y-4 rounded-lg bg-white p-5" style={{ border: `1px solid ${C.line}` }} aria-label={w("Visioconférence en cours", "Video conference in progress")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold" style={{ color: C.ink }}>{sessionMeeting.title}</h2>
            </div>
            <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
              <div className="min-w-0 space-y-3">
               <video key={session.url} src={session.url} autoPlay playsInline controls controlsList="nodownload" aria-label={w("Visioconférence", "Video conference")} className="aspect-video w-full rounded-md bg-black object-contain" onError={() => setMediaError(true)} onEnded={() => finish(sessionMeeting)} />
                  {mediaError && <>
                    <p role="alert" className="text-sm text-red-600">{w("Lecture indisponible.", "Playback unavailable.")}</p>
                    <button type="button" onClick={() => void join(sessionMeeting)} disabled={busy} className="inline-flex items-center gap-1.5 text-xs underline disabled:opacity-50" style={{ color: C.blue }}><RefreshCw size={12} /> {busy ? w("Connexion…", "Connecting…") : w("Réessayer", "Try again")}</button>
                  </>}
              </div>
              <ConferenceCamera stream={cameraStream} onError={() => {
                cancelEntry();
                setSession(null);
                setError(w("Caméra indisponible.", "Camera unavailable."));
              }} />
            </div>
          </section>
        ) : available.length ? available.map(meeting => {
          const active = conferenceWindow(meeting, now) === "active";
          return (
            <section key={meeting.id} className="flex flex-col items-center rounded-lg bg-white p-6 text-center" style={{ border: `1px solid ${C.line}` }} data-testid={`video-meeting-${meeting.id}`}>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: C.blueBg }}><Video size={28} color={C.blue} /></div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.blue }}>{active ? w("Une visioconférence en cours", "Video conference in progress") : w("Visioconférence programmée", "Scheduled video conference")}</p>
              <h2 className="mb-2 text-lg font-semibold" style={{ color: C.ink }}>{meeting.title}</h2>
              <p className="mb-4 text-sm" style={{ color: C.inkSoft }}>{formatDateTime(meeting.startsAt)}{meeting.endsAt ? ` – ${formatDateTime(meeting.endsAt)}` : ""}</p>
              {active ? <button type="button" disabled={busy} onClick={() => {
                setError(null);
                if (joined.current.has(meeting.id)) void join(meeting);
                else setSelected(meeting);
              }} className="flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: C.blue }}>{w("Rejoindre", "Join")} <ArrowRight size={16} /></button>
                : <p className="text-sm" style={{ color: C.inkSoft }}>{w("Vous pourrez rejoindre à l’heure programmée.", "You can join at the scheduled time.")}</p>}
            </section>
          );
        }) : !ended ? (
          <div className="flex items-center gap-4 rounded-lg bg-white p-6" style={{ border: `1px solid ${C.line}` }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: C.blueBg }}><Video size={24} color={C.blue} /></div>
            <p className="text-sm font-medium" style={{ color: C.ink }}>{w("Aucune visioconférence en cours", "No video conferences at this time")}</p>
          </div>
        ) : null}
      <Dialog open={visible && Boolean(selected)} onOpenChange={open => {
        if (!open) cancelEntry();
      }}>
        <DialogContent className="bg-white">
           <DialogTitle style={{ color: C.ink }}>{w("Rejoindre la visioconférence", "Join the video conference")}</DialogTitle>
          <DialogDescription style={{ color: C.inkSoft }}>
            {selected?.title}
          </DialogDescription>
          {error && <p className="text-sm text-red-600" role="alert">{localizeVideoError(error, lang)}</p>}
          <DialogFooter>
            <button type="button" onClick={cancelEntry} className="rounded-md px-4 py-2 text-sm" style={{ color: C.inkSoft }}>{w("Annuler", "Cancel")}</button>
             <button type="button" onClick={() => selected && void join(selected)} disabled={busy} className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: C.blue }}>{busy ? w("Connexion…", "Connecting…") : w("Rejoindre", "Join")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function localizeVideoError(message: string, lang: "fr" | "en"): string {
  const apiMessage = localizeApiMessage(message, lang);
  if (apiMessage !== message) return apiMessage;
  const pairs: readonly (readonly [string, string])[] = [
    ["Autorisez la caméra pour rejoindre la visioconférence.", "Allow camera access to join the video conference."],
    ["Caméra indisponible.", "Camera unavailable."],
    ["La caméra s’est arrêtée. Réessayez.", "The camera stopped. Try again."],
    ["L’accès à cette visioconférence est indisponible.", "Access to this video conference is unavailable."],
    ["Impossible de rejoindre cette visioconférence. L’accès a peut-être expiré.", "Unable to join this video conference. Access may have expired."],
    ["Lien sécurisé indisponible.", "Secure link unavailable."],
  ];
  const pair = pairs.find(([french, english]) => message === french || message === english);
  return pair ? pair[lang === "en" ? 1 : 0] : message;
}