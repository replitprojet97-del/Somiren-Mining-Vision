import { useState, useEffect } from "react";
import { Users, Folder, Briefcase, Calendar, Activity, ArrowRight } from "lucide-react";
import { C, SectionCard, Pill } from "./shared";
import { useAdminApi } from "./api";

function StatCard({ icon: Icon, label, value, tone, onClick }: any) {
  const tones: any = {
    red: { bg: C.redBg, fg: C.red }, blue: { bg: C.blueBg, fg: C.blue },
    green: { bg: C.greenBg, fg: C.green }, amber: { bg: C.amberBg, fg: C.amber },
    accent: { bg: C.accentSoft, fg: C.accent },
  };
  const t = tones[tone];
  return (
    <button onClick={onClick} className="bg-white rounded-lg p-4 text-left flex flex-col gap-3 hover:shadow-sm transition-shadow" style={{ border: `1px solid ${C.line}` }}>
      <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: t.bg }}>
        <Icon size={17} color={t.fg} />
      </div>
      <div>
        <p className="text-2xl font-semibold" style={{ color: C.ink }}>{value || 0}</p>
        <p className="text-[13px]" style={{ color: C.inkSoft }}>{label}</p>
      </div>
    </button>
  );
}

export default function DashboardView({ go }: any) {
  const api = useAdminApi();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/admin/dashboard")
       .then(res => setData(res))
       .catch(err => setError(err.error || "Erreur de chargement."));
  }, []);

  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (!data) return <div className="text-sm" style={{ color: C.inkSoft }}>Chargement...</div>;

  const counts = data.counts || {};
  const recentActivity = data.recentActivity || [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard icon={Users} label="Collaborateurs actifs" value={counts.activeCollaborators} tone="green" onClick={() => go("users")} />
        <StatCard icon={Folder} label="Dossiers en cours" value={counts.openCases} tone="blue" onClick={() => go("cases")} />
        <StatCard icon={Briefcase} label="Demandes ouvertes" value={counts.openRequests} tone="amber" onClick={() => go("requests")} />
        <StatCard icon={Calendar} label="Réunions à venir" value={counts.upcomingMeetings} tone="accent" onClick={() => go("meetings")} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Activité récente" action={<button onClick={() => go("activity")} className="text-sm font-medium flex items-center gap-1 hover:underline" style={{ color: C.accent }}>Voir tout <ArrowRight size={14} /></button>}>
          {recentActivity.length === 0 ? <p className="text-sm" style={{ color: C.inkSoft }}>Aucune activité récente.</p> : (
            <div className="space-y-3">
              {recentActivity.map((item: any) => {
                const a = item.activity;
                const actor = item.actor;
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <Activity size={14} className="mt-0.5 shrink-0" style={{ color: C.inkFaint }} />
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: C.ink }}><span className="font-medium">{actor?.fullName || "Inconnu"}</span> — {a.action}</p>
                      <p className="text-[11.5px]" style={{ color: C.inkFaint }}>{new Date(a.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
