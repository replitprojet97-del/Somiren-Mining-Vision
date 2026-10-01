import { useState } from "react";
import { Briefcase, Search } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, Tabs, EmptyState } from "./components/UI";
import { useRequests, useUpdateRequest } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export default function Requests() {
  const { w, dateLocale } = useWorkspaceLocale();
  const [tab, setTab] = useState("in_progress");
  const { data: requests, isLoading } = useRequests();
  const updateRequest = useUpdateRequest();

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;

  const filtered = requests?.filter((r: any) => {
    if (tab === "new") return r.status === "new";
    if (tab === "in_progress") return r.status === "accepted" || r.status === "in_progress" || r.status === "revision_required";
    if (tab === "submitted") return r.status === "submitted" || r.status === "validated";
    if (tab === "completed") return r.status === "completed";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Demandes de la Direction", "Requests from Management")}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={w("Rechercher...", "Search...")}
              aria-label={w("Rechercher dans les demandes", "Search requests")}
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
        </div>
      </div>

      <Tabs tabs={[w("Nouvelles", "New"), w("En cours", "In progress"), w("Soumises", "Submitted"), w("Terminées", "Completed")]} active={tab === "new" ? w("Nouvelles", "New") : tab === "in_progress" ? w("En cours", "In progress") : tab === "submitted" ? w("Soumises", "Submitted") : w("Terminées", "Completed")} setActive={label => setTab(label === w("Nouvelles", "New") ? "new" : label === w("En cours", "In progress") ? "in_progress" : label === w("Soumises", "Submitted") ? "submitted" : "completed")} />

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">{w("Demande & description", "Request & description")}</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">{w("Échéance", "Due date")}</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">{w("Priorité", "Priority")}</th>
                <th className="px-5 py-3 font-medium">{w("Statut", "Status")}</th>
                <th className="px-5 py-3 font-medium text-right">{w("Action", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {!filtered?.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={Briefcase} text={w("Aucune demande trouvée.", "No requests found.")} />
                  </td>
                </tr>
              ) : (
                filtered.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[250px]">
                      <p className="font-medium" style={{ color: C.ink }}>{r.title}</p>
                      <p className="text-[12.5px] mt-1 line-clamp-2" style={{ color: C.inkSoft }}>{r.description || w("Aucune description", "No description")}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                      {r.dueAt ? format(new Date(r.dueAt), "dd MMM yyyy", { locale: dateLocale }) : "—"}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Pill tone={priorityTone(r.priority || "normal")}>{priorityLabel(r.priority || "normal", w)}</Pill>
                    </td>
                    <td className="px-5 py-4">
                      <Pill tone={r.status === "completed" ? "basse" : (r.status === "new" ? "haute" : "info")}>
                        {statusLabel(r.status, w)}
                      </Pill>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {r.status === "new" && (
                        <button
                          onClick={() => updateRequest.mutate({ id: r.id, data: { status: "accepted" } })}
                          className="text-sm font-medium hover:underline"
                          style={{ color: C.copper }}
                        >
                          {w("Accepter", "Accept")}
                        </button>
                      )}
                      {(r.status === "accepted" || r.status === "in_progress") && (
                        <button
                          onClick={() => updateRequest.mutate({ id: r.id, data: { status: "submitted" } })}
                          className="text-sm font-medium hover:underline"
                          style={{ color: C.copper }}
                        >
                          {w("Soumettre", "Submit")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function priorityLabel(priority: string, w: (french: string, english: string) => string) {
  const labels: Record<string, [string, string]> = {
    urgent: ["Urgente", "Urgent"], Urgent: ["Urgente", "Urgent"], high: ["Haute", "High"], High: ["Haute", "High"], Haute: ["Haute", "High"],
    normal: ["Normale", "Normal"], Normal: ["Normale", "Normal"], medium: ["Moyenne", "Medium"], Medium: ["Moyenne", "Medium"], Moyenne: ["Moyenne", "Medium"],
    low: ["Basse", "Low"], Low: ["Basse", "Low"], Basse: ["Basse", "Low"],
  };
  const label = labels[priority];
  return label ? w(...label) : priority;
}

function statusLabel(status: string, w: (french: string, english: string) => string) {
  const labels: Record<string, [string, string]> = {
    new: ["Nouvelle", "New"], accepted: ["Acceptée", "Accepted"],
    in_progress: ["En cours", "In progress"], revision_required: ["Révision requise", "Revision required"],
    submitted: ["Soumise", "Submitted"], validated: ["Validée", "Validated"],
    completed: ["Terminée", "Completed"],
  };
  const label = labels[status];
  return label ? w(...label) : status;
}
