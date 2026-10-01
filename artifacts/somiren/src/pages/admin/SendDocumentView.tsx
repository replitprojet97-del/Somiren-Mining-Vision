import { useState, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";
import { uploadPrivateFile } from "@/lib/private-media";
import { MAX_DOC_BYTES } from "@/types/media";
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
    collaboratorId: "", caseId: "", priority: "normal", dueAt: "", title: "", instruction: "", manualContent: ""
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    api.get("/admin/collaborators").then(r => setUsers(r.collaborators || [])).catch(() => {});
    api.get("/admin/cases").then(r => setCases(r.cases || [])).catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.collaboratorId || !form.title) {
      setError("Remplissez les champs obligatoires (*)");
      setSuccess(null);
      return;
    }
    if (!form.manualContent.trim() && !file) { setError("Rédigez le document ou joignez un fichier."); setSuccess(null); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const payload: any = { ...form };
      if (!payload.caseId) delete payload.caseId;
      if (!payload.manualContent.trim()) delete payload.manualContent;
      if (file) payload.assetId = await uploadPrivateFile(file, "document", file.name);
      if (!payload.dueAt) delete payload.dueAt;
      if (!payload.instruction) delete payload.instruction;

      await api.post("/admin/document-assignments", payload);
      setSuccess("Assignation créée avec succès.");
      setForm({ collaboratorId: "", caseId: "", priority: "normal", dueAt: "", title: "", instruction: "", manualContent: "" });
      setFile(null);
    } catch (err: any) {
      setError(err.error || err.message || "Erreur lors de la création.");
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
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Destinataire *">
            <Select value={form.collaboratorId} onChange={(e: any) => setForm(f => ({ ...f, collaboratorId: e.target.value, caseId: "" }))}>
              <option value="">Sélectionner...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          </Field>
          <Field label="Dossier associé (facultatif)">
            <Select value={form.caseId} onChange={(e: any) => setForm(f => ({ ...f, caseId: e.target.value }))} disabled={!form.collaboratorId}>
              <option value="">Aucun dossier</option>
              {filteredCases.map(item => <option key={item.case.id} value={item.case.id}>{item.case.title} ({item.case.reference})</option>)}
            </Select>
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
          <Field label="Rédaction du document (10 000 caractères maximum)" full>
            <Textarea rows={8} maxLength={10000} value={form.manualContent} onChange={(e: any) => setForm(f => ({ ...f, manualContent: e.target.value }))} placeholder="Rédigez ici le contenu confidentiel..." />
          </Field>
          <Field label="Pièce jointe (facultative, 20 Mo max)" full>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.inkSoft }}>
              <Paperclip size={15} />
              <input type="file" onChange={(e) => { const x = e.target.files?.[0] || null; if (x && x.size > MAX_DOC_BYTES) { setError("Fichier trop volumineux (20 Mo maximum)."); e.target.value = ""; return; } setError(null); setFile(x); }} />
            </label>
            {file && <p className="text-xs mt-1" style={{ color: C.inkSoft }}>{file.name} <button type="button" className="underline ml-2" onClick={() => setFile(null)}>Retirer</button></p>}
          </Field>
          <Field label="Instruction" full>
            <Textarea rows={3} value={form.instruction} onChange={(e: any) => setForm(f => ({ ...f, instruction: e.target.value }))} placeholder="Ex. Analyser et préparer une synthèse..." />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <PrimaryBtn icon={Send} onClick={submit} disabled={loading || !form.collaboratorId || !form.title || (!form.manualContent.trim() && !file)}>{loading ? "Création..." : "Créer l'assignation"}</PrimaryBtn>
        </div>
      </SectionCard>
    </div>
  );
}
