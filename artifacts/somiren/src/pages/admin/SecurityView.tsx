import { useState, useEffect } from "react";
import { Lock, Server, Video, Activity } from "lucide-react";
import { C, SectionCard, Feedback } from "./shared";
import { useAdminApi } from "./api";

export default function SecurityView() {
  const api = useAdminApi();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/admin/security").then(r => setData(r)).catch(err => setError(err.error || "Erreur paramètres de sécurité"));
  }, []);

  return (
    <div className="space-y-4">
      <Feedback error={error} />
      <SectionCard title="État de la sécurité">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-4 rounded-md" style={{ border: `1px solid ${C.line}`, background: C.bg }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} style={{ color: C.ink }} />
              <p className="text-sm font-semibold" style={{ color: C.ink }}>Authentification Admin</p>
            </div>
            <p className="text-[13px] mb-1 leading-relaxed" style={{ color: C.inkSoft }}>MFA (2FA) : {data?.adminTwoFactor ? "Activé" : "Non configuré"}</p>
            <p className="text-[13px] leading-relaxed" style={{ color: C.inkSoft }}>
              Sessions par cookie HttpOnly : {data?.adminSessionProtection ? "Actif" : "Indisponible"}.
            </p>
          </div>
          <div className="p-4 rounded-md" style={{ border: `1px solid ${C.line}`, background: C.bg }}>
            <div className="flex items-center gap-2 mb-2">
              <Server size={16} style={{ color: C.ink }} />
              <p className="text-sm font-semibold" style={{ color: C.ink }}>Contrôle d'accès backend</p>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: C.inkSoft }}>
              Statut : {data?.adminSessionProtection ? "Actif" : "Indisponible"}. Les routes vérifient le rôle administrateur ou les permissions de gestion prévues côté serveur.
            </p>
          </div>
          <div className="p-4 rounded-md" style={{ border: `1px solid ${C.line}`, background: C.bg }}>
            <div className="flex items-center gap-2 mb-2">
              <Video size={16} style={{ color: C.ink }} />
              <p className="text-sm font-semibold" style={{ color: C.ink }}>Visioconférence</p>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: C.inkSoft }}>
              Contrôle backend : {data?.backendVideoPermission ? "Actif" : "Indisponible"}. Sans <code>CAN_USE_VIDEO_CONFERENCE</code>, l'accès à une réunion est refusé.
            </p>
          </div>
          <div className="p-4 rounded-md" style={{ border: `1px solid ${C.line}`, background: C.bg }}>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} style={{ color: C.ink }} />
              <p className="text-sm font-semibold" style={{ color: C.ink }}>Traçabilité</p>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: C.inkSoft }}>
              Les modifications administratives sont journalisées avec l'identité de l'administrateur. Sessions actives : {data?.activeSessionCount ?? "—"}.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
