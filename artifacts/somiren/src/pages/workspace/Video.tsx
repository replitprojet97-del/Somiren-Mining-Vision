import { Video, Calendar, ArrowRight, Shield } from "lucide-react";
import { C } from "@/lib/theme";
import { useVideoAccess } from "@/hooks/use-workspace";
import { format } from "date-fns";

export default function VideoView() {
  const { data: videoAccess, isLoading, isError } = useVideoAccess();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  const enabled = !isError && (videoAccess?.authorized ?? videoAccess?.allowed);

  if (!enabled) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Visioconférences</h1>
        <div className="bg-white rounded-lg p-10 flex flex-col items-center justify-center text-center" style={{ border: `1px solid ${C.line}` }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: C.redBg }}>
            <Shield size={28} color={C.red} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: C.ink }}>Accès non autorisé</h2>
          <p className="max-w-md text-sm" style={{ color: C.inkSoft }}>
            Votre compte ne dispose pas des permissions requises pour utiliser le module de visioconférence sécurisée. Veuillez contacter la Direction.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Visioconférences</h1>
      
      {videoAccess?.meeting ? (
        <div className="bg-white rounded-lg p-6 flex flex-col items-center justify-center text-center" style={{ border: `1px solid ${C.line}` }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: C.copperSoft }}>
            <Video size={28} color={C.copper} />
          </div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: C.ink }}>{videoAccess.meeting.title}</h2>
          <p className="text-sm mb-6" style={{ color: C.inkSoft }}>
            En cours jusqu'à {format(new Date(videoAccess.meeting.expiresAt), "HH:mm")}
          </p>
          <a
            href={videoAccess.meeting.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: C.copper }}
          >
            Rejoindre la réunion <ArrowRight size={16} />
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-10 flex flex-col items-center justify-center text-center" style={{ border: `1px solid ${C.line}` }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: C.bg }}>
            <Calendar size={28} color={C.inkSoft} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: C.ink }}>Aucune réunion en cours</h2>
          <p className="max-w-md text-sm" style={{ color: C.inkSoft }}>
            Les accès aux visioconférences apparaissent ici uniquement pendant les créneaux programmés.
          </p>
        </div>
      )}
    </div>
  );
}
