import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Save, X, Pencil, Trash2, RefreshCw } from "lucide-react";
import { C, SectionCard, PrimaryBtn, GhostBtn, Pill, priorityTone, PriorityLabel, Feedback, Input, Select, Textarea, Field } from "./shared";
import { useAdminApi } from "./api";

const STATUS: Record<string, string> = { todo: "À faire", in_progress: "En cours", blocked: "Bloquée", completed: "Terminée" };
const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const empty = { title: "", assigneeId: "", caseId: "", description: "", priority: "normal", dueAt: "", status: "todo" };

export default function TasksView() {
  const api = useAdminApi();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([api.get("/admin/tasks"), api.get("/admin/collaborators"), api.get("/admin/cases")])
      .then(([t, u, c]) => { setTasks(t.tasks || []); setUsers(u.collaborators || []); setCases((c.cases || []).map((x: any) => x.case || x)); setLoaded(true); })
      .catch((e: any) => { setLoaded(false); setError(e.error || "Erreur de chargement des tâches"); })
      .finally(() => setLoading(false));
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const recipients = useMemo(() => users.filter(u => u.isActive && u.role !== "ADMIN"), [users]);
  const caseChoices = useMemo(() => cases.filter(c => String(c.assigneeId) === form.assigneeId), [cases, form.assigneeId]);

  const startEdit = (t: any) => {
    setError(null); setSuccess(null); setEditing(t.id);
    setForm({ title: t.title, assigneeId: String(t.assigneeId), caseId: t.caseId ? String(t.caseId) : "", description: t.description || "", priority: t.priority, dueAt: t.dueAt ? localDate(new Date(t.dueAt)) : "", status: t.status });
  };

  const save = async () => {
    if (!loaded) return setError("Données indisponibles, actualisez.");
    if (!form.title.trim() || !form.assigneeId) return setError("Remplissez les champs obligatoires (*)");
    setError(null); setSuccess(null); setSaving(true);
    const body = { title: form.title.trim(), assigneeId: Number(form.assigneeId), caseId: form.caseId ? Number(form.caseId) : null, description: form.description, priority: form.priority, status: form.status, dueAt: form.dueAt ? new Date(form.dueAt + "T00:00:00").toISOString() : null };
    try {
      if (editing === "new") await api.post("/admin/tasks", body); else await api.patch(`/admin/tasks/${editing}`, body);
      setSuccess(editing === "new" ? "Tâche créée." : "Tâche mise à jour.");
      setEditing(null); load();
    } catch (e: any) { setError(e.error || "Enregistrement impossible"); } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (deleting !== null) return;
    setDeleting(id);
    setError(null); setSuccess(null);
    try {
      await api.del(`/admin/tasks/${id}`);
      if (editing === id) setEditing(null);
      setSuccess("Tâche supprimée."); setConfirmId(null); load();
    }
    catch (e: any) { setError(e.error || "Suppression impossible"); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      <Feedback error={error} success={success} />
      <SectionCard title="Tâches" action={<div className="flex gap-2"><GhostBtn icon={RefreshCw} onClick={load}>Actualiser</GhostBtn><PrimaryBtn icon={Plus} disabled={!loaded || loading || !recipients.length} onClick={() => { setError(null); setForm(empty); setEditing("new"); }}>Nouvelle tâche</PrimaryBtn></div>}>
        {editing !== null && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md border space-y-4" style={{ borderColor: C.line }}>
            <h4 className="font-medium text-sm" style={{ color: C.ink }}>{editing === "new" ? "Créer une tâche" : "Modifier la tâche"}</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Titre *"><Input value={form.title} onChange={(e: any) => setForm(f => ({ ...f, title: e.target.value }))} /></Field>
              <Field label="Assigner à *"><Select value={form.assigneeId} onChange={(e: any) => setForm(f => ({ ...f, assigneeId: e.target.value, caseId: "" }))}>
                <option value="">Sélectionner...</option>
                {recipients.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </Select></Field>
              <Field label="Dossier"><Select value={form.caseId} disabled={!form.assigneeId} onChange={(e: any) => setForm(f => ({ ...f, caseId: e.target.value }))}>
                <option value="">Aucun</option>
                {caseChoices.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select></Field>
              <Field label="Priorité"><Select value={form.priority} onChange={(e: any) => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option>
              </Select></Field>
              <Field label="Statut"><Select value={form.status} onChange={(e: any) => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select></Field>
              <Field label="Échéance"><Input type="date" value={form.dueAt} onChange={(e: any) => setForm(f => ({ ...f, dueAt: e.target.value }))} /></Field>
              <Field label="Description" full><Textarea rows={3} value={form.description} onChange={(e: any) => setForm(f => ({ ...f, description: e.target.value }))} /></Field>
            </div>
            <div className="flex gap-2 justify-end">
              <GhostBtn icon={X} onClick={() => setEditing(null)}>Annuler</GhostBtn>
              <PrimaryBtn icon={Save} onClick={save} disabled={saving}>Enregistrer</PrimaryBtn>
            </div>
          </div>
        )}
        {loading && !tasks.length ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement...</p> : tasks.length === 0 ? (error ? null : <p className="text-sm" style={{ color: C.inkSoft }}>Aucune tâche.</p>) : (
          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} className="p-4 rounded-md bg-white space-y-2" style={{ border: `1px solid ${C.line}` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: C.ink }}>{t.title}</p>
                    <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{t.assigneeName}{t.caseTitle ? ` · ${t.caseTitle}` : ""}{t.dueAt ? ` · ${new Date(t.dueAt).toLocaleDateString("fr-FR")}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Pill tone={priorityTone(t.priority)}><PriorityLabel p={t.priority} /></Pill>
                    <Pill tone={t.status === "completed" ? "basse" : t.status === "blocked" ? "haute" : "info"}>{STATUS[t.status] || t.status}</Pill>
                    <GhostBtn icon={Pencil} onClick={() => startEdit(t)}>Modifier</GhostBtn>
                    <GhostBtn icon={Trash2} tone="danger" onClick={() => setConfirmId(t.id)}>Supprimer</GhostBtn>
                  </div>
                </div>
                {t.description && <p className="text-[12.5px] whitespace-pre-wrap" style={{ color: C.ink }}>{t.description}</p>}
                {t.comment && <p className="text-[12.5px] p-2 rounded-md" style={{ background: C.bg, color: C.ink }}>Commentaire : {t.comment}</p>}
                {confirmId === t.id && (
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-md" style={{ background: C.redBg }}>
                    <span className="text-sm" style={{ color: C.red }}>Supprimer définitivement cette tâche ?</span>
                    <GhostBtn onClick={() => setConfirmId(null)}>Annuler</GhostBtn>
                    <GhostBtn icon={Trash2} tone="danger" disabled={deleting !== null} onClick={() => remove(t.id)}>Confirmer la suppression</GhostBtn>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
