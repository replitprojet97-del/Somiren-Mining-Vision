import { useState, useEffect } from "react";
import { Plus, Save, X } from "lucide-react";
import { C, SectionCard, PrimaryBtn, GhostBtn, Pill, priorityTone, PriorityLabel, Feedback, Field, Input, Select, Textarea } from "./shared";
import { useAdminApi } from "./api";

export default function RequestsView() {
  const api = useAdminApi();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ assigneeId: "", title: "", description: "", priority: "normal", dueAt: "" });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/admin/requests").catch(err => { setError(err.error || "Erreur demandes"); return { requests: [] }; }),
      api.get("/admin/collaborators").catch(() => { return { collaborators: [] }; })
    ]).then(([rRes, uRes]) => {
      setRequests(rRes.requests || []);
      setUsers(uRes.collaborators || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.assigneeId) return setError("Remplissez les champs obligatoires (*)");
    setError(null); setSuccess(null); setCreating(true);
    try {
      const payload: any = { ...form };
      if (!payload.dueAt) delete payload.dueAt;
      await api.post("/admin/requests", payload);
      setSuccess("Demande créée avec succès.");
      setShowCreate(false);
      setForm({ assigneeId: "", title: "", description: "", priority: "normal", dueAt: "" });
      load();
    } catch (err: any) {
      setError(err.error || "Erreur création demande");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Feedback error={error} success={success} />
      <SectionCard title="Demandes de la Direction" action={<PrimaryBtn icon={Plus} onClick={() => setShowCreate(!showCreate)}>Nouvelle demande</PrimaryBtn>}>
        
        {showCreate && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md border space-y-4" style={{ borderColor: C.line }}>
            <h4 className="font-medium text-sm" style={{ color: C.ink }}>Créer une demande</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Assigner à *"><Select value={form.assigneeId} onChange={(e:any)=>setForm(f=>({...f, assigneeId: e.target.value}))}>
                <option value="">Sélectionner...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </Select></Field>
              <Field label="Titre *"><Input value={form.title} onChange={(e:any)=>setForm(f=>({...f, title: e.target.value}))} /></Field>
              <Field label="Priorité"><Select value={form.priority} onChange={(e:any)=>setForm(f=>({...f, priority: e.target.value}))}>
                <option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option>
              </Select></Field>
              <Field label="Échéance"><Input type="date" value={form.dueAt} onChange={(e:any)=>setForm(f=>({...f, dueAt: e.target.value}))} /></Field>
              <Field label="Description" full><Textarea rows={2} value={form.description} onChange={(e:any)=>setForm(f=>({...f, description: e.target.value}))} /></Field>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <GhostBtn icon={X} onClick={() => setShowCreate(false)}>Annuler</GhostBtn>
              <PrimaryBtn icon={Save} onClick={handleCreate} disabled={creating}>Enregistrer</PrimaryBtn>
            </div>
          </div>
        )}

        {loading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement...</p> : requests.length === 0 ? <p className="text-sm" style={{ color: C.inkSoft }}>Aucune demande trouvée.</p> : (
          <div className="space-y-3">
            {requests.map((item: any) => {
              const r = item.request;
              const assignee = item.assignee;
              return (
              <div key={r.id} className="p-4 rounded-md flex items-center justify-between gap-3 bg-white" style={{ border: `1px solid ${C.line}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: C.ink }}>{r.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>
                    Assignée à {assignee?.fullName || "Inconnu"} {r.dueAt ? `· Échéance ${new Date(r.dueAt).toLocaleDateString("fr-FR")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={priorityTone(r.priority)}><PriorityLabel p={r.priority} /></Pill>
                  <Pill tone="info">{r.status}</Pill>
                </div>
              </div>
            )})}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
