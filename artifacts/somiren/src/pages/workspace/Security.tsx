import { Shield, Clock, MapPin, XCircle } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, EmptyState, SectionCard } from "./components/UI";
import { useSessions, useRevokeSession, useActivity, useMe } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Security() {
  const { data: sessions, isLoading: loadingSessions } = useSessions();
  const { data: activity, isLoading: loadingActivity } = useActivity();
  const { data: me } = useMe();
  const revokeSession = useRevokeSession();

  if (loadingSessions || loadingActivity) return <div className="p-8 flex justify-center">Chargement...</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Sécurité & Sessions</h1>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Sessions actives" className="h-full">
          <div className="space-y-4">
            <p className="text-sm" style={{ color: C.inkSoft }}>
              Gérez vos sessions de connexion sur différents appareils.
            </p>
            {!sessions?.length ? (
              <EmptyState icon={Shield} text="Aucune session active trouvée." />
            ) : (
              <div className="space-y-3">
                {sessions.map((s: any) => (
                  <div key={s.id} className="p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ border: `1px solid ${C.line}` }}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm" style={{ color: C.ink }}>{s.device || "Appareil non identifié"}</span>
                        {s.current && <Pill tone="basse">Session actuelle</Pill>}
                      </div>
                      <div className="flex items-center gap-4 text-[12px]" style={{ color: C.inkSoft }}>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {s.location || "Localisation inconnue"}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> 
                          {s.lastActiveAt ? format(new Date(s.lastActiveAt), "dd MMM HH:mm", { locale: fr }) : format(new Date(s.createdAt), "dd MMM HH:mm", { locale: fr })}
                        </span>
                      </div>
                    </div>
                    {!s.current && (
                      <button 
                        onClick={() => revokeSession.mutate(s.id)}
                        className="text-xs font-medium flex items-center gap-1 hover:underline text-red-600 transition-opacity p-2 rounded hover:bg-red-50"
                      >
                        <XCircle size={14} /> Révoquer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Journal d'activité récent" className="h-full">
          <div className="space-y-4 h-full flex flex-col">
            <p className="text-sm" style={{ color: C.inkSoft }}>
              Historique de vos dernières actions importantes.
            </p>
            {!activity?.length ? (
              <EmptyState icon={Clock} text="Aucune activité récente." />
            ) : (
              <div className="relative border-l ml-3 pl-4 pb-4 space-y-6 flex-1 overflow-y-auto max-h-[400px] pr-2" style={{ borderColor: C.line }}>
                {activity.slice(0, 15).map((a: any) => (
                  <div key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-white" style={{ borderColor: C.copper }} />
                    <p className="text-sm font-medium" style={{ color: C.ink }}>{a.description || a.action}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: C.inkSoft }}>
                      {a.entityType} {a.entityId ? `#${a.entityId}` : ""} · {format(new Date(a.createdAt), "dd MMM yyyy, HH:mm", { locale: fr })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Autorisations d'accès">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-4 rounded-lg bg-gray-50" style={{ border: `1px solid ${C.line}` }}>
              <h3 className="font-semibold text-sm mb-2" style={{ color: C.ink }}>Niveau d'accès</h3>
              <Pill tone="info">{me?.role || "Collaborateur"}</Pill>
            </div>
            <div className="flex-1 p-4 rounded-lg bg-gray-50" style={{ border: `1px solid ${C.line}` }}>
              <h3 className="font-semibold text-sm mb-2" style={{ color: C.ink }}>Authentification à deux facteurs</h3>
              <Pill tone="neutral">Non configurée</Pill>
              <button disabled className="block mt-3 text-sm font-medium opacity-50 cursor-not-allowed" style={{ color: C.copper }}>Configurer la 2FA</button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
