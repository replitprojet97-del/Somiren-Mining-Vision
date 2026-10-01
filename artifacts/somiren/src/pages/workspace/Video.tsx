import { useState } from "react";
import { Video, Calendar, ArrowRight, Shield, RefreshCw } from "lucide-react";
import { C } from "@/lib/theme";
import { useVideoAccess, useMeetings, useMe } from "@/hooks/use-workspace";
import { LocalCameraPreview } from "@/components/media/LocalCameraPreview";
import { fetchSignedUrl, errMsg } from "../shared/signed";
import { format } from "date-fns";

function windowState(m: any, now = Date.now()) {
  const start = new Date(m.startsAt).getTime();
  const end = m.endsAt ? new Date(m.endsAt).getTime() : start + 24 * 3600_000;
  return now < start ? "soon" : now > end ? "over" : "open";
}

function Prerecorded({ m }: { m: any }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true); setErr(null);
    try { setUrl(await fetchSignedUrl(`/workspace/meetings/${m.id}/video`)); }
    catch (e) { setUrl(null); setErr(errMsg(e, "Vidéo indisponible ou accès refusé.")); }
    finally { setBusy(false); }
  };
  const st = windowState(m);
  return (
    <div className="bg-white rounded-lg p-5 space-y-3" style={{ border: `1px solid ${C.line}` }} data-testid={`video-meeting-${m.id}`}>
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="font-semibold" style={{ color: C.ink }}>{m.title}</h2>
          <p className="text-xs" style={{ color: C.inkSoft }}>Vidéo préenregistrée · {format(new Date(m.startsAt), "dd/MM/yyyy HH:mm")}</p>
        </div>
      </div>
      {st === "soon" && <p className="text-sm" style={{ color: C.inkSoft }}>Pas encore disponible. La vidéo s'ouvrira à l'heure programmée.</p>}
      {st === "over" && <p className="text-sm" style={{ color: C.inkSoft }}>Le créneau de visionnage est terminé.</p>}
      {st === "open" && (
        <>
          {url ? (
            <video src={url} controls controlsList="nodownload" className="w-full rounded-md bg-black max-h-[420px]" onError={load} />
          ) : (
            <button onClick={load} disabled={busy} className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ background: C.copper }}>{busy ? "Chargement..." : "Lire la vidéo"}</button>
          )}
          {url && <button onClick={load} className="flex items-center gap-1.5 text-xs underline" style={{ color: C.copper }}><RefreshCw size={12} /> Actualiser le lien sécurisé</button>}
          {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        </>
      )}
    </div>
  );
}

export default function VideoView() {
  const { data: videoAccess, isLoading, isError } = useVideoAccess();
  const meetings = useMeetings();

  const me = useMe();
  const perms: any = me.data?.permissions;
  const has = (k: string) => Array.isArray(perms) ? perms.includes(k) : perms && typeof perms === "object" ? !!perms[k] : undefined;
  const missing = ["PARTICIPATE_IN_MEETINGS", "CAN_USE_VIDEO_CONFERENCE"].filter(k => has(k) === false);
  const legacyEnabled = !isError && !!(videoAccess?.authorized ?? videoAccess?.allowed);
  const permitted = missing.length === 0;

  const vids = !permitted ? [] : (meetings.data || []).filter((m: any) => m.videoAssetId && windowState(m) !== "over");
  const anyOpen = vids.some((m: any) => windowState(m) === "open");

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Visioconférences</h1>

      <section className="space-y-3" aria-label="Vidéos programmées">
        <h2 className="text-sm font-semibold" style={{ color: C.inkSoft }}>Vidéos préenregistrées assignées</h2>
        {!permitted ? (
          <div className="bg-white rounded-lg p-6 flex items-center gap-4" style={{ border: `1px solid ${C.line}` }}>
            <Shield size={22} color={C.red} />
            <p className="text-sm" style={{ color: C.inkSoft }}>Accès non autorisé : permissions requises {missing.join(" et ")}. Contactez la Direction.</p>
          </div>
        ) : meetings.isLoading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement...</p>
          : meetings.isError ? <p className="text-sm text-red-600">Réunions indisponibles.</p>
          : vids.length ? vids.map((m: any) => <Prerecorded key={m.id} m={m} />)
          : <p className="text-sm" style={{ color: C.inkSoft }}>Aucune vidéo programmée pour vous.</p>}
      </section>

      {permitted && anyOpen && (
        <section className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.line}` }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: C.ink }}>Aperçu de votre caméra</h2>
          <p className="text-xs mb-3" style={{ color: C.inkSoft }}>Aperçu local uniquement : aucune image n'est transmise ni enregistrée.</p>
          <LocalCameraPreview />
        </section>
      )}

      {isLoading ? null : legacyEnabled && videoAccess?.meeting ? (
        <div className="bg-white rounded-lg p-6 flex flex-col items-center justify-center text-center" style={{ border: `1px solid ${C.line}` }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: C.copperSoft }}>
            <Video size={28} color={C.copper} />
          </div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>{videoAccess.meeting.title}</h2>
          <p className="text-sm mb-6" style={{ color: C.inkSoft }}>
            Lien externe autorisé · jusqu'à {format(new Date(videoAccess.meeting.expiresAt), "HH:mm")}
          </p>
          <a href={videoAccess.meeting.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: C.copper }}>
            Rejoindre la réunion <ArrowRight size={16} />
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-6 flex items-center gap-4" style={{ border: `1px solid ${C.line}` }}>
          <Calendar size={22} color={C.inkSoft} />
          <p className="text-sm" style={{ color: C.inkSoft }}>Aucun lien externe de réunion en cours (accès externe distinct des vidéos préenregistrées).</p>
        </div>
      )}
    </div>
  );
}
