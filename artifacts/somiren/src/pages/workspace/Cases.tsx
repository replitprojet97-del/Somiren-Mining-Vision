import { useState } from "react";
import { Folder, Search, MoreVertical } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, Tabs, EmptyState } from "./components/UI";
import { useCases } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export default function Cases() {
  const { w, dateLocale } = useWorkspaceLocale();
  const [tab, setTab] = useState("all");
  const { data: cases, isLoading } = useCases();

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;

  const filtered = cases?.filter((c: any) => {
    if (tab === "active") return c.status === "active";
    if (tab === "waiting") return c.status === "waiting";
    if (tab === "on_hold") return c.status === "on_hold";
    if (tab === "completed") return c.status === "completed";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Mes dossiers", "My cases")}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={w("Rechercher...", "Search...")}
              aria-label={w("Rechercher dans les dossiers", "Search cases")}
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
        </div>
      </div>

      <Tabs tabs={[w("Tous", "All"), w("En cours", "In progress"), w("À traiter", "Waiting"), w("En pause", "On hold"), w("Terminés", "Completed")]} active={tab === "all" ? w("Tous", "All") : tab === "active" ? w("En cours", "In progress") : tab === "waiting" ? w("À traiter", "Waiting") : tab === "on_hold" ? w("En pause", "On hold") : w("Terminés", "Completed")} setActive={label => setTab(label === w("Tous", "All") ? "all" : label === w("En cours", "In progress") ? "active" : label === w("À traiter", "Waiting") ? "waiting" : label === w("En pause", "On hold") ? "on_hold" : "completed")} />

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">{w("Dossier", "Case")}</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">{w("Échéance", "Due date")}</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">{w("Priorité", "Priority")}</th>
                <th className="px-5 py-3 font-medium">{w("Statut", "Status")}</th>
                <th className="px-5 py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {!filtered?.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={Folder} text={w("Aucun dossier trouvé.", "No cases found.")} />
                  </td>
                </tr>
              ) : (
                filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[200px]">
                      <p className="font-medium" style={{ color: C.ink }}>{c.title}</p>
                      <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>{c.reference}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                      {c.dueDate ? format(new Date(c.dueDate), "dd MMM yyyy", { locale: dateLocale }) : "—"}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Pill tone={priorityTone(c.priority)}>{priorityLabel(c.priority, w)}</Pill>
                    </td>
                    <td className="px-5 py-4">
                      <Pill tone={c.status === "completed" ? "basse" : "info"}>{statusLabel(c.status, w)}</Pill>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button disabled title={w("Plus d’options", "More options")} aria-label={w("Plus d’options", "More options")} className="p-1 rounded opacity-50 cursor-not-allowed"><MoreVertical size={16} color={C.inkSoft} /></button>
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
    active: ["En cours", "In progress"],
    waiting: ["À traiter", "Waiting"],
    on_hold: ["En pause", "On hold"],
    completed: ["Terminé", "Completed"],
  };
  const label = labels[status];
  return label ? w(...label) : status;
}
