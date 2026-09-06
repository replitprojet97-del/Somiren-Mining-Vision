import { useState } from "react";
import { CheckSquare, Search, CheckCircle2 } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, Tabs, EmptyState } from "./components/UI";
import { useTasks, useUpdateTask } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Tasks() {
  const [tab, setTab] = useState("À faire");
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  const filtered = tasks?.filter((t: any) => {
    if (tab === "À faire") return t.status === "PENDING" || t.status === "todo";
    if (tab === "En cours") return t.status === "in_progress";
    if (tab === "Terminées") return t.status === "DONE" || t.status === "completed";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Mes tâches</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
        </div>
      </div>

      <Tabs tabs={["À faire", "En cours", "Terminées"]} active={tab} setActive={setTab} />

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium w-10"></th>
                <th className="px-5 py-3 font-medium">Tâche</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Échéance</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Priorité</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {!filtered?.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={CheckSquare} text="Aucune tâche trouvée." />
                  </td>
                </tr>
              ) : (
                filtered.map((t: any) => {
                  const isDone = t.status === "DONE" || t.status === "completed";
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}`, opacity: isDone ? 0.6 : 1 }}>
                      <td className="px-5 py-4">
                        <button onClick={() => updateTask.mutate({ id: t.id, data: { status: isDone ? "todo" : "completed" } })}>
                          <CheckCircle2 size={18} color={isDone ? C.green : C.line} className={isDone ? "" : "hover:text-gray-400"} />
                        </button>
                      </td>
                      <td className="px-5 py-4 min-w-[200px]">
                        <p className="font-medium" style={{ color: C.ink, textDecoration: isDone ? "line-through" : "none" }}>{t.title}</p>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                        {t.dueDate ? format(new Date(t.dueDate), "dd MMM yyyy", { locale: fr }) : "—"}
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <Pill tone={priorityTone(t.priority)}>{t.priority}</Pill>
                      </td>
                      <td className="px-5 py-4">
                        <Pill tone={isDone ? "basse" : "info"}>{isDone ? "Terminée" : "À faire"}</Pill>
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
