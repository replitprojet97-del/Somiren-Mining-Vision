import { useEffect, useRef, useState } from "react";
import { Video, ArrowRight, RefreshCw, LogOut } from "lucide-react";
import { C } from "@/lib/theme";
import { conferenceWindow, type ConferenceMeeting } from "@/lib/conference-window";
import { useMeetings } from "@/hooks/use-workspace";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { LocalCameraPreview } from "@/components/media/LocalCameraPreview";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { fetchSignedUrl, errMsg } from "../shared/signed";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export default function VideoView() {
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
  const requestId = useRef(0);
  const mounted = useRef(false);
  const authorizedMeetings = permitted && !meetings.isError ? (meetings.data ?? []) as ConferenceMeeting[] : [];
  const available = authorizedMeetings.filter(meeting => meeting.videoAssetId && conferenceWindow(meeting, now) !== "ended");
  const sessionMeeting = session && available.find(meeting => meeting.id === session.meeting.id && conferenceWindow(meeting, now) === "active");

  useEffect(() => {
    mounted.current = true;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      mounted.current = false;
      requestId.current += 1;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if ((session && !sessionMeeting) || (selected && !available.some(meeting => meeting.id === selected.id && conferenceWindow(meeting, now) === "active"))) {
      requestId.current += 1;
      setSession(null);
      setSelected(null);
      setBusy(false);
    }
  }, [permitted, meetings.data, meetings.isError, now, selected, session, sessionMeeting]);

  async function join(meeting: ConferenceMeeting) {
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      // This existing endpoint rechecks the assigned participant, camera permission and time window.
      const url = await fetchSignedUrl(`/workspace/meetings/${meeting.id}/video`);
      if (!mounted.current || id !== requestId.current || conferenceWindow(meeting) !== "active") return;
      setSession({ meeting, url });
      setSelected(null);
      setMediaError(false);
    } catch (err) {
      if (mounted.current && id === requestId.current) {
        setSession(null);
        const fallback = w("Impossible de rejoindre cette visioconférence. L’accès a peut-être expiré.", "Unable to join this video conference. Access may have expired.");
        setError(err instanceof TypeError ? fallback : errMsg(err, fallback));
      }
    } finally {
      if (mounted.current && id === requestId.current) setBusy(false);
    }
  }

  function leave() {
    requestId.current += 1;
    setSession(null);
    setBusy(false);
    setError(null);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Visioconférences", "Video conferences")}</h1>
      {error && !selected && <p className="text-sm text-red-600" role="alert">{localizeVideoError(error, lang)}</p>}
      {profileLoading || (permitted && meetings.isLoading) ? <p className="text-sm" style={{ color: C.inkSoft }}>{w("Chargement des visioconférences…", "Loading video conferences…")}</p>
        : permitted && meetings.isError ? <p className="text-sm text-red-600" role="alert">{w("Les visioconférences sont momentanément indisponibles.", "Video conferences are temporarily unavailable.")}</p>
        : session && sessionMeeting ? (
          <section className="space-y-4 rounded-lg bg-white p-5" style={{ border: `1px solid ${C.line}` }} aria-label={w("Visioconférence en cours", "Video conference in progress")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold" style={{ color: C.ink }}>{sessionMeeting.title}</h2>
               <button type="button" onClick={leave} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm" style={{ borderColor: C.line, color: C.ink }}><LogOut size={16} /> {w("Quitter la visioconférence", "Leave the video conference")}</button>
            </div>
            <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
              <div className="min-w-0 space-y-3">
               <video key={session.url} src={session.url} autoPlay playsInline controls controlsList="nodownload" aria-label={w("Visioconférence", "Video conference")} className="aspect-video w-full rounded-md bg-black object-contain" onError={() => setMediaError(true)} />
                 {mediaError && <p role="alert" className="text-sm text-red-600">{w("La lecture est momentanément indisponible. Réessayez avec le bouton ci-dessous.", "Playback is temporarily unavailable. Try again using the button below.")}</p>}
                 <button type="button" onClick={() => void join(sessionMeeting)} disabled={busy} className="inline-flex items-center gap-1.5 text-xs underline disabled:opacity-50" style={{ color: C.blue }}><RefreshCw size={12} /> {busy ? w("Vérification de l’accès…", "Checking access…") : w("Actualiser la visioconférence", "Refresh video conference")}</button>
              </div>
              <LocalCameraPreview key={session.meeting.id} autoStart />
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
              {active ? <button type="button" onClick={() => { setSelected(meeting); setError(null); }} className="flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-semibold text-white" style={{ background: C.blue }}>{w("Rejoindre", "Join")} <ArrowRight size={16} /></button>
                : <p className="text-sm" style={{ color: C.inkSoft }}>{w("Vous pourrez rejoindre à l’heure programmée.", "You can join at the scheduled time.")}</p>}
            </section>
          );
        }) : (
          <div className="flex items-center gap-4 rounded-lg bg-white p-6" style={{ border: `1px solid ${C.line}` }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: C.blueBg }}><Video size={24} color={C.blue} /></div>
            <p className="text-sm font-medium" style={{ color: C.ink }}>{w("Aucune visioconférence en cours", "No video conferences at this time")}</p>
          </div>
        )}
      <Dialog open={Boolean(selected)} onOpenChange={open => {
        if (!open) { requestId.current += 1; setSelected(null); setBusy(false); }
      }}>
        <DialogContent className="bg-white">
          <DialogTitle style={{ color: C.ink }}>{w("Confirmer la participation", "Confirm participation")}</DialogTitle>
          <DialogDescription style={{ color: C.inkSoft }}>
            {w("Rejoindre « ", "Join “")}{selected?.title}{w(" » ? Votre caméra sera activée automatiquement pour que vous puissiez vous voir pendant la visioconférence. Autorisez son utilisation si votre navigateur le demande. Votre aperçu reste sur votre appareil, sans enregistrement ni transmission.", "”? Your camera will turn on automatically so you can see yourself during the video conference. Allow access if your browser asks. Your preview stays on your device and is not recorded or transmitted.")}
          </DialogDescription>
          {error && <p className="text-sm text-red-600" role="alert">{localizeVideoError(error, lang)}</p>}
          <DialogFooter>
            <button type="button" onClick={() => { requestId.current += 1; setSelected(null); setBusy(false); }} className="rounded-md px-4 py-2 text-sm" style={{ color: C.inkSoft }}>{w("Annuler", "Cancel")}</button>
            <button type="button" onClick={() => selected && void join(selected)} disabled={busy} className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: C.blue }}>{busy ? w("Connexion…", "Connecting…") : w("Confirmer et rejoindre", "Confirm and join")}</button>
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
    ["Impossible de rejoindre cette visioconférence. L’accès a peut-être expiré.", "Unable to join this video conference. Access may have expired."],
    ["Lien sécurisé indisponible.", "Secure link unavailable."],
  ];
  const pair = pairs.find(([french, english]) => message === french || message === english);
  return pair ? pair[lang === "en" ? 1 : 0] : message;
}