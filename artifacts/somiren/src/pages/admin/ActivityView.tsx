import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { C, SectionCard, Feedback } from "./shared";
import { useAdminApi } from "./api";

export default function ActivityView() {
  const api = useAdminApi();
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/admin/activity").then(r => setActivity(r.activity || [])).catch(err => setError(err.error || "Erreur journal")).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <Feedback error={error} />
      <SectionCard title="Journal d'activité (lecture seule)">
        {loading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement...</p> : activity.length === 0 ? <p className="text-sm" style={{ color: C.inkSoft }}>Aucune activité trouvée.</p> : (
          <div className="space-y-3">
            {activity.map((item: any) => {
              const a = item.activity;
              const actor = item.actor;
              return (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-md bg-white" style={{ border: `1px solid ${C.line}` }}>
                <Activity size={15} style={{ color: C.inkSoft }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: C.ink }}><span className="font-medium">{actor?.fullName || "Inconnu"}</span> — {a.action}</p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: C.inkFaint }}>{new Date(a.createdAt).toLocaleString("fr-FR")}</p>
                </div>
              </div>
            )})}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
