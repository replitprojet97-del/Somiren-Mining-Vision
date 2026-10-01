import { Shield, Clock, MapPin, XCircle } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, EmptyState, SectionCard } from "./components/UI";
import { useSessions, useRevokeSession, useActivity, useMe } from "@/hooks/use-workspace";
import { workspaceRoleLabel } from "@/lib/workspace-role";
import { format } from "date-fns";
import TwoFactorSettings from "./TwoFactorSettings";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export default function Security() {
  const { lang, w, dateLocale } = useWorkspaceLocale();
  const { data: sessions, isLoading: loadingSessions } = useSessions();
  const { data: activity, isLoading: loadingActivity } = useActivity();
  const { data: me } = useMe();
  const revokeSession = useRevokeSession();

  if (loadingSessions || loadingActivity) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;

  const activityActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: w("Créé", "Created"),
      updated: w("Modifié", "Updated"),
      assigned: w("Attribué", "Assigned"),
      revoked: w("Révoqué", "Revoked"),
      deleted: w("Supprimé", "Deleted"),
      access_restored: w("Accès rétabli", "Access restored"),
      joined: w("A rejoint", "Joined"),
      transfer_requested: w("Transfert demandé", "Transfer requested"),
      two_factor_login_verified: w("Connexion à deux facteurs vérifiée", "Two-factor sign-in verified"),
      two_factor_setup_started: w("Configuration de la double authentification commencée", "Two-factor authentication setup started"),
      two_factor_enabled: w("Double authentification activée", "Two-factor authentication enabled"),
      two_factor_disabled: w("Double authentification désactivée", "Two-factor authentication disabled"),
      two_factor_recovery_codes_regenerated: w("Codes de secours régénérés", "Recovery codes regenerated"),
    };
    return labels[action] ?? action;
  };
  const activityEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      case: w("Dossier", "Case"),
      task: w("Tâche", "Task"),
      document_assignment: w("Attribution de document", "Document assignment"),
      executive_request: w("Demande de la Direction", "Management request"),
      video_authorization: w("Autorisation vidéo", "Video authorization"),
      collaborator_security: w("Sécurité du collaborateur", "Collaborator security"),
      arrear: w("Arriéré", "Arrear"),
      "salary-record": w("Fiche de salaire", "Salary record"),
      meeting: w("Réunion", "Meeting"),
      role: w("Rôle", "Role"),
    };
    return labels[entityType] ?? entityType;
  };
  const sessionDeviceLabel = (session: any) => {
    const browser = typeof session.browserName === "string" ? session.browserName.trim() : "";
    const operatingSystem = typeof session.osName === "string" ? session.osName.trim() : "";
    if (browser && operatingSystem) return `${browser} ${w("sur", "on")} ${operatingSystem}`;
    if (browser || operatingSystem) return browser || operatingSystem;
    return session.current
      ? w("Navigateur non reconnu", "Unrecognized browser")
      : w("Ancienne session — appareil non enregistré", "Earlier session — device not recorded");
  };
  const visibleLocation = (location: unknown) => typeof location === "string"
    && location.trim()
    && !/^(unknown|unknown location|localisation inconnue|inconnue|n\/a)$/i.test(location.trim())
    ? location
    : null;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Sécurité & Sessions", "Security & sessions")}</h1>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title={w("Sessions actives", "Active sessions")} className="h-full">
          <div className="space-y-4">
            <p className="text-sm" style={{ color: C.inkSoft }}>
              {w("Gérez vos sessions de connexion sur différents appareils.", "Manage your sign-in sessions across devices.")}
            </p>
            {!sessions?.length ? (
              <EmptyState icon={Shield} text={w("Aucune session active trouvée.", "No active sessions found.")} />
            ) : (
              <div className="space-y-3">
                {sessions.map((s: any) => (
                  <div key={s.id} className="p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ border: `1px solid ${C.line}` }}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm" style={{ color: C.ink }}>{sessionDeviceLabel(s)}</span>
                        {s.current && <Pill tone="basse">{w("Session actuelle", "Current session")}</Pill>}
                      </div>
                      <div className="flex items-center gap-4 text-[12px]" style={{ color: C.inkSoft }}>
                        {visibleLocation(s.location) && <span className="flex items-center gap-1"><MapPin size={12} /> {visibleLocation(s.location)}</span>}
                        <span className="flex items-center gap-1"><Clock size={12} /> 
                          {s.lastActiveAt ? format(new Date(s.lastActiveAt), "dd MMM HH:mm", { locale: dateLocale }) : format(new Date(s.createdAt), "dd MMM HH:mm", { locale: dateLocale })}
                        </span>
                      </div>
                    </div>
                    {!s.current && (
                      <button 
                        onClick={() => revokeSession.mutate(s.id)}
                        className="text-xs font-medium flex items-center gap-1 hover:underline text-red-600 transition-opacity p-2 rounded hover:bg-red-50"
                      >
                        <XCircle size={14} /> {w("Révoquer", "Revoke")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title={w("Journal d'activité récent", "Recent activity log")} className="h-full">
          <div className="space-y-4 h-full flex flex-col">
            <p className="text-sm" style={{ color: C.inkSoft }}>
              {w("Historique de vos dernières actions importantes.", "A record of your recent important actions.")}
            </p>
            {!activity?.length ? (
              <EmptyState icon={Clock} text={w("Aucune activité récente.", "No recent activity.")} />
            ) : (
              <div className="relative border-l ml-3 pl-4 pb-4 space-y-6 flex-1 overflow-y-auto max-h-[400px] pr-2" style={{ borderColor: C.line }}>
                {activity.slice(0, 15).map((a: any) => (
                  <div key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-white" style={{ borderColor: C.copper }} />
                    <p className="text-sm font-medium" style={{ color: C.ink }}>{a.description || activityActionLabel(a.action)}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: C.inkSoft }}>
                      {activityEntityLabel(a.entityType)} {a.entityId ? `#${a.entityId}` : ""} · {format(new Date(a.createdAt), "dd MMM yyyy, HH:mm", { locale: dateLocale })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={w("Autorisations d'accès", "Access permissions")}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-4 rounded-lg bg-gray-50" style={{ border: `1px solid ${C.line}` }}>
              <h3 className="font-semibold text-sm mb-2" style={{ color: C.ink }}>{w("Niveau d'accès", "Access level")}</h3>
              <Pill tone="info">{workspaceRoleLabel(me?.role, lang)}</Pill>
            </div>
            <TwoFactorSettings key={me?.id ?? "loading"} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
