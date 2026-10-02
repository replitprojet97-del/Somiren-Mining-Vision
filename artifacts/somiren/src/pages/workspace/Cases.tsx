import { useMemo, useState } from "react";
import { Folder, Search, ArrowLeft, FileText } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, Tabs, EmptyState } from "./components/UI";
import { DocOpenButton } from "./components/DocOpen";
import { useCases, useCase } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

type W = (french: string, english: string) => string;

export default function Cases() {
  const { w, dateLocale, locale } = useWorkspaceLocale();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: cases, isLoading, isError, refetch } = useCases();

  const tabDefs: [string, string][] = [["all", w("Tous", "All")], ["active", w("En cours", "In progress")], ["waiting", w("À traiter", "Waiting")], ["on_hold", w("En pause", "On hold")], ["completed", w("Terminés", "Completed")]];

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase(locale);
    return (cases || []).filter((c: any) => (tab === "all" || c.status === tab) && (!q || [c.title, c.reference, c.summary].some(v => String(v || "").toLocaleLowerCase(locale).includes(q))));
  }, [cases, tab, search, locale]);

  if (openId) return <CaseDetail id={openId} onBack={() => setOpenId(null)} />;
  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;
  if (isError) return <div className="space-y-5">
    <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Mes dossiers", "My cases")}</h1>
    <p className="text-sm text-red-600" role="alert">{w("Impossible de charger les dossiers.", "Unable to load cases.")} <button className="underline" onClick={() => refetch()}>{w("Réessayer", "Try again")}</button></p>
  </div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Mes dossiers", "My cases")}</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={w("Rechercher...", "Search...")} aria-label={w("Rechercher dans les dossiers", "Search cases")} className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64" style={{ border: `1px solid ${C.line}`, background: "white" }} />
        </div>
      </div>
      <Tabs tabs={tabDefs.map(t => t[1])} active={tabDefs.find(t => t[0] === tab)![1]} setActive={label => setTab(tabDefs.find(t => t[1] === label)![0])} />
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">{w("Dossier", "Case")}</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">{w("Échéance", "Due date")}</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">{w("Priorité", "Priority")}</th>
                <th className="px-5 py-3 font-medium">{w("Statut", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={4} className="py-8"><EmptyState icon={Folder} text={w("Aucun dossier trouvé.", "No cases found.")} /></td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="px-5 py-4 min-w-[200px]">
                    <button type="button" onClick={() => setOpenId(String(c.id))} className="text-left font-medium hover:underline" style={{ color: C.ink }} data-testid={`button-case-${c.id}`}>{c.title}</button>
                    <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>{c.reference}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>{c.dueDate ? format(new Date(c.dueDate), "dd MMM yyyy", { locale: dateLocale }) : "—"}</td>
                  <td className="px-5 py-4 hidden sm:table-cell"><Pill tone={priorityTone(c.priority)}>{priorityLabel(c.priority, w)}</Pill></td>
                  <td className="px-5 py-4"><Pill tone={c.status === "completed" ? "basse" : "info"}>{statusLabel(c.status, w)}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CaseDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { w, dateLocale, lang } = useWorkspaceLocale();
  const { data, isLoading, isError, error, refetch } = useCase(id);
  const [readId, setReadId] = useState<number | null>(null);
  const back = <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: C.copper }}><ArrowLeft size={15} /> {w("Mes dossiers", "My cases")}</button>;
  if (isLoading) return <div className="space-y-4">{back}<div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div></div>;
  if (isError || !data?.case) return <div className="space-y-4">{back}<p className="text-sm text-red-600" role="alert">{error instanceof Error ? localizeApiMessage(error.message, lang) : w("Dossier indisponible.", "Case unavailable.")} <button className="underline" onClick={() => refetch()}>{w("Réessayer", "Try again")}</button></p></div>;
  const c = data.case;
  const tasks: any[] = data.tasks || [];
  const docs: any[] = data.documents || [];
  const dt = (v: any) => v ? format(new Date(v), "dd MMM yyyy", { locale: dateLocale }) : "—";
  const box = "bg-white rounded-lg p-5";
  const h = "text-sm font-semibold mb-3";
  return (
    <div className="space-y-5">
      {back}
      <div className={box} style={{ border: `1px solid ${C.line}` }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{c.title}</h1>
            <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>{c.reference}</p>
          </div>
          <div className="flex gap-2">
            <Pill tone={priorityTone(c.priority)}>{priorityLabel(c.priority, w)}</Pill>
            <Pill tone={c.status === "completed" ? "basse" : "info"}>{statusLabel(c.status, w)}</Pill>
          </div>
        </div>
        <dl className="grid sm:grid-cols-3 gap-4 mt-5 text-sm">
          <div><dt style={{ color: C.inkSoft }}>{w("Échéance", "Due date")}</dt><dd style={{ color: C.ink }}>{dt(c.dueDate)}</dd></div>
          <div><dt style={{ color: C.inkSoft }}>{w("Avancement", "Progress")}</dt><dd style={{ color: C.ink }}>{c.progress != null ? `${c.progress}%` : "—"}</dd></div>
          <div><dt style={{ color: C.inkSoft }}>{w("Mis à jour", "Updated")}</dt><dd style={{ color: C.ink }}>{dt(c.updatedAt)}</dd></div>
        </dl>
      </div>
      {[[w("Résumé", "Summary"), c.summary], [w("Description", "Description"), c.description], [w("Instructions", "Instructions"), c.instructions], [w("Notes", "Notes"), c.notes]].filter(x => x[1]).map(([t, v]) => (
        <div key={t} className={box} style={{ border: `1px solid ${C.line}` }}>
          <h2 className={h} style={{ color: C.ink }}>{t}</h2>
          <p className="text-sm whitespace-pre-wrap break-words" style={{ color: C.ink }}>{v}</p>
        </div>
      ))}
      <div className={box} style={{ border: `1px solid ${C.line}` }}>
        <h2 className={h} style={{ color: C.ink }}>{w("Tâches", "Tasks")} ({tasks.length})</h2>
        {!tasks.length ? <EmptyState icon={Folder} text={w("Aucune tâche associée.", "No associated tasks.")} /> : tasks.map(t => (
          <div key={t.id} className="py-3 flex flex-wrap justify-between gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="min-w-0"><p className="text-sm font-medium" style={{ color: C.ink }}>{t.title}</p>
              {t.description && <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{t.description}</p>}
              {t.comment && <p className="text-[12.5px] italic" style={{ color: C.inkSoft }}>{t.comment}</p>}</div>
            <div className="flex items-center gap-2"><span className="text-xs" style={{ color: C.inkSoft }}>{dt(t.dueAt)}</span><Pill tone={t.status === "completed" ? "basse" : t.status === "blocked" ? "haute" : "info"}>{taskStatus(t.status, w)}</Pill></div>
          </div>
        ))}
      </div>
      <div className={box} style={{ border: `1px solid ${C.line}` }}>
        <h2 className={h} style={{ color: C.ink }}>{w("Documents", "Documents")} ({docs.length})</h2>
        {!docs.length ? <EmptyState icon={FileText} text={w("Aucun document autorisé.", "No authorized documents.")} /> : docs.map((d, i) => (
          <div key={`${d.id}-${d.assignmentId ?? i}`} className="py-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="flex flex-wrap justify-between gap-2 items-start">
              <div><p className="text-sm font-medium" style={{ color: C.ink }}>{d.title}</p>
                <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{[d.category, d.confidentiality, d.fileName].filter(Boolean).join(" · ")}</p></div>
              <div className="flex items-center gap-4">
                {d.manualContent && <button type="button" className="text-[12.5px] font-medium hover:underline" style={{ color: C.copper }} onClick={() => setReadId(readId === i ? null : i)}>{readId === i ? w("Masquer", "Hide") : w("Lire", "Read")}</button>}
                <DocOpenButton doc={d} compact />
              </div>
            </div>
            {readId === i && <div className="mt-2 p-3 rounded-md text-[13px] whitespace-pre-wrap break-words" style={{ background: C.bg, color: C.ink }}>{d.manualContent}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function taskStatus(s: string, w: W) {
  const l: Record<string, [string, string]> = { todo: ["À faire", "To do"], in_progress: ["En cours", "In progress"], blocked: ["Bloquée", "Blocked"], completed: ["Terminée", "Completed"] };
  return l[s] ? w(...l[s]) : s;
}

function priorityLabel(priority: string, w: W) {
  const labels: Record<string, [string, string]> = {
    urgent: ["Urgente", "Urgent"], Urgent: ["Urgente", "Urgent"], high: ["Haute", "High"], High: ["Haute", "High"], Haute: ["Haute", "High"],
    normal: ["Normale", "Normal"], Normal: ["Normale", "Normal"], medium: ["Moyenne", "Medium"], Medium: ["Moyenne", "Medium"], Moyenne: ["Moyenne", "Medium"],
    low: ["Basse", "Low"], Low: ["Basse", "Low"], Basse: ["Basse", "Low"],
  };
  const label = labels[priority];
  return label ? w(...label) : priority;
}

function statusLabel(status: string, w: W) {
  const labels: Record<string, [string, string]> = { active: ["En cours", "In progress"], waiting: ["À traiter", "Waiting"], on_hold: ["En pause", "On hold"], completed: ["Terminé", "Completed"] };
  const label = labels[status];
  return label ? w(...label) : status;
}
