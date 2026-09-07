import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { C, SectionCard, PrimaryBtn, Field, Input, Select, Textarea, Feedback } from "./shared";
import { useAdminApi } from "./api";

export default function SendDocumentView() {
  const api = useAdminApi();
  const [users, setUsers] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    collaboratorId: "", caseId: "", priority: "normal", dueAt: "", title: "", instruction: ""
  });

  useEffect(() => {
    api.get("/admin/collaborators").then(r => setUsers(r.collaborators || [])).catch(() => {});
    api.get("/admin/cases").then(r => setCases(r.cases || [])).catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.collaboratorId || !form.caseId || !form.title) {
      setError("Remplissez les champs obligatoires (*)");
      setSuccess(null);
      return;
    }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const payload: any = { ...form };
      if (!payload.dueAt) delete payload.dueAt;
      if (!payload.instruction) delete payload.instruction;

      await api.post("/admin/document-assignments", payload);
      setSuccess("Assignation créée avec succès.");
      setForm({ collaboratorId: "", caseId: "", priority: "normal", dueAt: "", title: "", instruction: "" });
    } catch (err: any) {
      setError(err.error || "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = form.collaboratorId
    ? cases.filter((item) => String(item.assignee?.id ?? item.case.assigneeId) === form.collaboratorId)
    : [];

  return (
    <div className="space-y-4">
      <Feedback error={error} success={success} />
      <SectionCard title="Envoyer un document (Assignation) à un collaborateur">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-[13px] p-3 rounded-md mb-5 leading-relaxed">
          <strong>Note :</strong> Cette interface permet de créer l'assignation (métadonnées et instructions). L'upload direct du fichier physique (bytes) est indisponible si <code>objectPath</code> est absent. Le collaborateur verra l'instruction et devra y répondre.
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Destinataire *">
            <Select value={form.collaboratorId} onChange={(e: any) => setForm(f => ({ ...f, collaboratorId: e.target.value, caseId: "" }))}>
              <option value="">Sélectionner...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          </Field>
          <Field label="Dossier associé *">
            <Select value={form.caseId} onChange={(e: any) => setForm(f => ({ ...f, caseId: e.target.value }))} disabled={!form.collaboratorId}>
              <option value="">Sélectionner un dossier...</option>
              {filteredCases.map(item => <option key={item.case.id} value={item.case.id}>{item.case.title} ({item.case.reference})</option>)}
            </Select>
            {form.collaboratorId && filteredCases.length === 0 && <p className="text-xs text-red-500 mt-1">Ce collaborateur n'a aucun dossier assigné.</p>}
          </Field>
          <Field label="Titre du document *">
            <Input value={form.title} onChange={(e: any) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Rapport Zone X" />
          </Field>
          <Field label="Priorité">
            <Select value={form.priority} onChange={(e: any) => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option>
            </Select>
          </Field>
          <Field label="Échéance">
            <Input type="date" value={form.dueAt} onChange={(e: any) => setForm(f => ({ ...f, dueAt: e.target.value }))} />
          </Field>
          <Field label="Instruction" full>
            <Textarea rows={3} value={form.instruction} onChange={(e: any) => setForm(f => ({ ...f, instruction: e.target.value }))} placeholder="Ex. Analyser et préparer une synthèse..." />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <PrimaryBtn icon={Send} onClick={submit} disabled={loading || !form.collaboratorId || !form.caseId || !form.title}>{loading ? "Création..." : "Créer l'assignation"}</PrimaryBtn>
        </div>
      </SectionCard>
    </div>
  );
}
