import { useMemo, useState } from "react";
import { CheckSquare, Search } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, Tabs, EmptyState } from "./components/UI";
import { useTasks, useUpdateTask } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { localizeApiMessage } from "@/i18n/api-error-translations";

type W = (french: string, english: string) => string;
const STATUSES = ["todo", "in_progress", "blocked", "completed"];

export default function Tasks() {
  const { w, locale } = useWorkspaceLocale();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const { data: tasks, isLoading, isError, refetch } = useTasks();

  const tabDefs: [string, string][] = [["all", w("Toutes", "All")], ["todo", w("À faire", "To do")], ["in_progress", w("En cours", "In progress")], ["blocked", w("Bloquées", "Blocked")], ["completed", w("Terminées", "Completed")]];
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase(locale);
    return (tasks || []).filter((t: any) => (tab === "all" || t.status === tab) && (priority === "all" || t.priority === priority) && (!q || [t.title, t.description, t.comment, t.caseTitle].some(v => String(v || "").toLocaleLowerCase(locale).includes(q))));
  }, [tasks, tab, priority, search, locale]);

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Mes tâches", "My tasks")}</h1>
        <div className="flex items-center gap-3">
          <select value={priority} onChange={e => setPriority(e.target.value)} aria-label={w("Priorité", "Priority")} className="py-2 px-2 text-sm rounded-md" style={{ border: `1px solid ${C.line}`, background: "white" }}>
            <option value="all">{w("Toutes priorités", "All priorities")}</option>
            {["urgent", "high", "normal", "low"].map(p => <option key={p} value={p}>{priorityLabel(p, w)}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={w("Rechercher...", "Search...")} aria-label={w("Rechercher dans les tâches", "Search tasks")} className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64" style={{ border: `1px solid ${C.line}`, background: "white" }} />
          </div>
        </div>
      </div>
      {isError && <p className="text-sm text-red-600" role="alert">{w("Impossible de charger les tâches.", "Unable to load tasks.")} <button className="underline" onClick={() => refetch()}>{w("Réessayer", "Try again")}</button></p>}
      <Tabs tabs={tabDefs.map(t => t[1])} active={tabDefs.find(t => t[0] === tab)![1]} setActive={label => setTab(tabDefs.find(t => t[1] === label)![0])} />
      {!isError && (!filtered.length ? <EmptyState icon={CheckSquare} text={w("Aucune tâche trouvée.", "No tasks found.")} /> : (
        <div className="space-y-3">{filtered.map((t: any) => <TaskCard key={t.id} t={t} />)}</div>
      ))}
    </div>
  );
}

function TaskCard({ t }: { t: any }) {
  const { w, dateLocale, lang } = useWorkspaceLocale();
  const update = useUpdateTask();
  const { profile } = useWorkspaceAuth();
  const canManage = !!profile?.permissions?.includes("MANAGE_ASSIGNED_TASKS");
  const [comment, setComment] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const value = comment ?? t.comment ?? "";
  const run = (data: any) => { setSaved(false); update.mutate({ id: t.id, data }, { onSuccess: () => { setSaved(true); if ("comment" in data) setComment(null); } }); };
  return (
    <div className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.line}`, opacity: t.status === "completed" ? 0.85 : 1 }} data-testid={`card-task-${t.id}`}>
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium" style={{ color: C.ink }}>{t.title}</p>
          {t.description && <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: C.inkSoft }}>{t.description}</p>}
          <p className="text-[12.5px] mt-2" style={{ color: C.inkSoft }}>
            {w("Échéance", "Due")} : {t.dueAt ? format(new Date(t.dueAt), "dd MMM yyyy", { locale: dateLocale }) : "—"}
            {t.caseTitle || t.caseId ? ` · ${w("Dossier", "Case")} : ${t.caseTitle || `#${t.caseId}`}` : ""}
          </p>
        </div>
        <div className="flex items-start gap-2"><Pill tone={priorityTone(t.priority)}>{priorityLabel(t.priority, w)}</Pill></div>
      </div>
      {canManage ? (<>
      <div className="flex flex-wrap gap-2 mt-4" role="group" aria-label={w("Statut", "Status")}>
        {STATUSES.map(s => (
          <button key={s} type="button" disabled={update.isPending} onClick={() => t.status !== s && run({ status: s })} aria-pressed={t.status === s}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-md disabled:opacity-50" style={t.status === s ? { background: C.copper, color: "white" } : { border: `1px solid ${C.line}`, color: C.ink }} data-testid={`button-status-${s}-${t.id}`}>
            {statusLabel(s, w)}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <textarea rows={2} disabled={update.isPending} value={value} onChange={e => { setComment(e.target.value); setSaved(false); }} placeholder={w("Commentaire", "Comment")} aria-label={w("Commentaire", "Comment")} className="w-full text-sm p-2 rounded-md" style={{ border: `1px solid ${C.line}` }} />
        <div className="flex items-center gap-3 mt-2">
          <button type="button" disabled={update.isPending || comment === null || comment === (t.comment ?? "")} onClick={() => run({ comment: value })} className="text-[12.5px] font-medium px-3 py-1.5 rounded-md text-white disabled:opacity-50" style={{ background: C.copper }}>{w("Enregistrer", "Save")}</button>
          {update.isError && <span className="text-xs text-red-600" role="alert">{update.error instanceof Error ? localizeApiMessage(update.error.message, lang) : w("Échec de l’enregistrement.", "Save failed.")}</span>}
          {saved && !update.isError && <span className="text-xs" style={{ color: C.green }}>{w("Enregistré", "Saved")}</span>}
        </div>
      </div>
      </>) : (
        <div className="mt-4 space-y-2">
          <Pill tone={t.status === "completed" ? "basse" : t.status === "blocked" ? "haute" : "info"}>{statusLabel(t.status, w)}</Pill>
          {t.comment && <p className="text-sm whitespace-pre-wrap p-2 rounded-md" style={{ background: C.bg, color: C.ink }}>{t.comment}</p>}
        </div>
      )}
    </div>
  );
}

function priorityLabel(priority: string, w: W) {
  const labels: Record<string, [string, string]> = { urgent: ["Urgente", "Urgent"], high: ["Haute", "High"], normal: ["Normale", "Normal"], low: ["Basse", "Low"] };
  const label = labels[priority];
  return label ? w(...label) : priority;
}

function statusLabel(status: string, w: W) {
  const labels: Record<string, [string, string]> = { todo: ["À faire", "To do"], in_progress: ["En cours", "In progress"], blocked: ["Bloquée", "Blocked"], completed: ["Terminée", "Completed"] };
  const label = labels[status];
  return label ? w(...label) : status;
}
