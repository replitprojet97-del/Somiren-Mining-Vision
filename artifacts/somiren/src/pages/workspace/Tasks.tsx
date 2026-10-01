import { useState } from "react";
import { CheckSquare, Search, CheckCircle2 } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, Tabs, EmptyState } from "./components/UI";
import { useTasks, useUpdateTask } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export default function Tasks() {
  const { w, dateLocale } = useWorkspaceLocale();
  const [tab, setTab] = useState("todo");
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;

  const filtered = tasks?.filter((t: any) => {
    if (tab === "todo") return t.status === "todo";
    if (tab === "in_progress") return t.status === "in_progress";
    if (tab === "blocked") return t.status === "blocked";
    if (tab === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Mes tâches", "My tasks")}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={w("Rechercher...", "Search...")}
              aria-label={w("Rechercher dans les tâches", "Search tasks")}
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
        </div>
      </div>

      <Tabs tabs={[w("À faire", "To do"), w("En cours", "In progress"), w("Bloquées", "Blocked"), w("Terminées", "Completed")]} active={tab === "todo" ? w("À faire", "To do") : tab === "in_progress" ? w("En cours", "In progress") : tab === "blocked" ? w("Bloquées", "Blocked") : w("Terminées", "Completed")} setActive={label => setTab(label === w("À faire", "To do") ? "todo" : label === w("En cours", "In progress") ? "in_progress" : label === w("Bloquées", "Blocked") ? "blocked" : "completed")} />

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium w-10"></th>
                <th className="px-5 py-3 font-medium">{w("Tâche", "Task")}</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">{w("Échéance", "Due date")}</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">{w("Priorité", "Priority")}</th>
                <th className="px-5 py-3 font-medium">{w("Statut", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {!filtered?.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={CheckSquare} text={w("Aucune tâche trouvée.", "No tasks found.")} />
                  </td>
                </tr>
              ) : (
                filtered.map((t: any) => {
                  const isDone = t.status === "completed";
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}`, opacity: isDone ? 0.6 : 1 }}>
                      <td className="px-5 py-4">
                        <button aria-label={isDone ? w("Marquer comme à faire", "Mark as to do") : w("Marquer comme terminée", "Mark as completed")} onClick={() => updateTask.mutate({ id: t.id, data: { status: isDone ? "todo" : "completed" } })}>
                          <CheckCircle2 size={18} color={isDone ? C.green : C.line} className={isDone ? "" : "hover:text-gray-400"} />
                        </button>
                      </td>
                      <td className="px-5 py-4 min-w-[200px]">
                        <p className="font-medium" style={{ color: C.ink, textDecoration: isDone ? "line-through" : "none" }}>{t.title}</p>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                        {t.dueDate ? format(new Date(t.dueDate), "dd MMM yyyy", { locale: dateLocale }) : "—"}
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <Pill tone={priorityTone(t.priority)}>{priorityLabel(t.priority, w)}</Pill>
                      </td>
                      <td className="px-5 py-4">
                        <Pill tone={isDone ? "basse" : t.status === "blocked" ? "haute" : "info"}>{statusLabel(t.status, w)}</Pill>
                      </td>
                    </tr>
                  );
                })
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
    todo: ["À faire", "To do"],
    in_progress: ["En cours", "In progress"],
    blocked: ["Bloquée", "Blocked"],
    completed: ["Terminée", "Completed"],
  };
  const label = labels[status];
  return label ? w(...label) : status;
}
