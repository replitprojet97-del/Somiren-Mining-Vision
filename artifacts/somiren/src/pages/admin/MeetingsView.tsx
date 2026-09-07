import { useState, useEffect } from "react";
import { Plus, Save, X } from "lucide-react";
import { C, SectionCard, PrimaryBtn, GhostBtn, Pill, Feedback, Field, Input, Select, Textarea } from "./shared";
import { useAdminApi } from "./api";

export default function MeetingsView() {
  const api = useAdminApi();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", startsAt: "", durationMinutes: 60, participantIds: [] as string[] });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/admin/meetings").catch(err => { setError(err.error || "Erreur réunions"); return { meetings: [] }; }),
      api.get("/admin/collaborators").catch(() => { return { collaborators: [] }; })
    ]).then(([mRes, uRes]) => {
      setMeetings(mRes.meetings || []);
      setUsers(uRes.collaborators || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.startsAt || form.participantIds.length === 0) return setError("Remplissez les champs obligatoires (*)");
    setError(null); setSuccess(null); setCreating(true);
    try {
      const startsAt = new Date(form.startsAt);
      const endsAt = new Date(startsAt.getTime() + form.durationMinutes * 60_000);
      await api.post("/admin/meetings", {
        title: form.title,
        description: form.description,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        participantIds: form.participantIds,
      });
      setSuccess("Réunion planifiée.");
      setShowCreate(false);
      setForm({ title: "", description: "", startsAt: "", durationMinutes: 60, participantIds: [] });
      load();
    } catch (err: any) {
      setError(err.error || "Erreur planification");
    } finally {
      setCreating(false);
    }
  };

  const toggleParticipant = (id: string) => {
    setForm(f => ({
      ...f, 
      participantIds: f.participantIds.includes(id) ? f.participantIds.filter(x => x !== id) : [...f.participantIds, id]
    }));
  };

  return (
    <div className="space-y-4">
      <Feedback error={error} success={success} />
      <SectionCard title="Réunions" action={<PrimaryBtn icon={Plus} onClick={() => setShowCreate(!showCreate)}>Planifier une réunion</PrimaryBtn>}>
        
        {showCreate && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md border space-y-4" style={{ borderColor: C.line }}>
            <h4 className="font-medium text-sm" style={{ color: C.ink }}>Nouvelle réunion</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Titre *"><Input value={form.title} onChange={(e:any)=>setForm(f=>({...f, title: e.target.value}))} /></Field>
              <Field label="Date & Heure de début *"><Input type="datetime-local" value={form.startsAt} onChange={(e:any)=>setForm(f=>({...f, startsAt: e.target.value}))} /></Field>
              <Field label="Durée (minutes)"><Input type="number" min="15" step="15" value={form.durationMinutes} onChange={(e:any)=>setForm(f=>({...f, durationMinutes: parseInt(e.target.value, 10)}))} /></Field>
              <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e:any)=>setForm(f=>({...f, description: e.target.value}))} /></Field>
              <Field label="Participants *" full>
                <div className="flex flex-wrap gap-2 mt-1">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md cursor-pointer transition-colors" style={{ border: `1px solid ${C.line}`, color: C.inkSoft, background: form.participantIds.includes(u.id) ? C.blueBg : "white" }}>
                      <input type="checkbox" checked={form.participantIds.includes(u.id)} onChange={() => toggleParticipant(u.id)} /> {u.fullName}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <GhostBtn icon={X} onClick={() => setShowCreate(false)}>Annuler</GhostBtn>
              <PrimaryBtn icon={Save} onClick={handleCreate} disabled={creating}>Enregistrer</PrimaryBtn>
            </div>
          </div>
        )}

        {loading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement...</p> : meetings.length === 0 ? <p className="text-sm" style={{ color: C.inkSoft }}>Aucune réunion planifiée.</p> : (
          <div className="space-y-3">
            {meetings.map((m: any) => (
              <div key={m.id} className="p-4 rounded-md bg-white" style={{ border: `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: C.ink }}>{m.title}</p>
                  {m.startsAt && <Pill tone="info">{new Date(m.startsAt).toLocaleString("fr-FR")}</Pill>}
                </div>
                <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>
                  Participants : {(m.participants || []).map((p:any)=>p.fullName || p).join(", ") || "Aucun"}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
