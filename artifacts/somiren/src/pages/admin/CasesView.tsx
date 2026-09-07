import { useState, useEffect } from "react";
import { Plus, Save, X } from "lucide-react";
import { C, SectionCard, PrimaryBtn, GhostBtn, Pill, priorityTone, PriorityLabel, Feedback, Input, Select, Textarea, Field } from "./shared";
import { useAdminApi } from "./api";

export default function CasesView() {
  const api = useAdminApi();
  const [cases, setCases] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ reference: "", title: "", summary: "", assigneeId: "", priority: "normal" });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/admin/cases").catch(err => { setError(err.error || "Erreur dossiers"); return { cases: [] }; }),
      api.get("/admin/collaborators").catch(() => { return { collaborators: [] }; })
    ]).then(([cRes, uRes]) => {
      setCases(cRes.cases || []);
      setUsers(uRes.collaborators || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.reference || !form.summary || !form.assigneeId) return setError("Remplissez les champs obligatoires (*)");
    setError(null); setSuccess(null); setCreating(true);
    try {
      await api.post("/admin/cases", form);
      setSuccess("Dossier créé avec succès.");
      setShowCreate(false);
      setForm({ reference: "", title: "", summary: "", assigneeId: "", priority: "normal" });
      load();
    } catch (err: any) {
      setError(err.error || "Erreur création dossier");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Feedback error={error} success={success} />
      <SectionCard title="Dossiers" action={<PrimaryBtn icon={Plus} onClick={() => setShowCreate(!showCreate)}>Nouveau dossier</PrimaryBtn>}>
        
        {showCreate && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md border space-y-4" style={{ borderColor: C.line }}>
            <h4 className="font-medium text-sm" style={{ color: C.ink }}>Créer un dossier</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Référence *"><Input value={form.reference} onChange={(e:any)=>setForm(f=>({...f, reference: e.target.value}))} placeholder="DOS-2024-..." /></Field>
              <Field label="Titre *"><Input value={form.title} onChange={(e:any)=>setForm(f=>({...f, title: e.target.value}))} /></Field>
              <Field label="Assigner à *"><Select value={form.assigneeId} onChange={(e:any)=>setForm(f=>({...f, assigneeId: e.target.value}))}>
                <option value="">Sélectionner...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </Select></Field>
              <Field label="Priorité"><Select value={form.priority} onChange={(e:any)=>setForm(f=>({...f, priority: e.target.value}))}>
                <option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option>
              </Select></Field>
              <Field label="Résumé *" full><Textarea rows={2} value={form.summary} onChange={(e:any)=>setForm(f=>({...f, summary: e.target.value}))} /></Field>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <GhostBtn icon={X} onClick={() => setShowCreate(false)}>Annuler</GhostBtn>
              <PrimaryBtn icon={Save} onClick={handleCreate} disabled={creating}>Enregistrer</PrimaryBtn>
            </div>
          </div>
        )}

        {loading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement...</p> : cases.length === 0 ? <p className="text-sm" style={{ color: C.inkSoft }}>Aucun dossier trouvé.</p> : (
          <div className="space-y-3">
            {cases.map((item) => {
              const c = item.case;
              const assignee = item.assignee;
              return (
              <div key={c.id} className="p-4 rounded-md flex items-center justify-between gap-3 bg-white" style={{ border: `1px solid ${C.line}` }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: C.ink }}>{c.title} <span className="font-normal text-xs ml-2 text-gray-500">{c.reference}</span></p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>Assigné à {assignee?.fullName || "Personne"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Pill tone={priorityTone(c.priority)}><PriorityLabel p={c.priority} /></Pill>
                  <Pill tone="info">{c.status}</Pill>
                </div>
              </div>
            )})}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
