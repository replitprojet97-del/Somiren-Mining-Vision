import { useState } from "react";
import { Plus, Power } from "lucide-react";
import { C, SectionCard, PrimaryBtn, Field, Input, Textarea, Feedback, Pill } from "./shared";
import { useAdminSenderServices, useAdminSaveSenderService, type SenderService } from "@/hooks/use-workspace";
import { errMsg } from "../shared/signed";

export default function ServicesPanel() {
  const { data, isLoading, isError, refetch } = useAdminSenderServices();
  const save = useAdminSaveSenderService();
  const [editing, setEditing] = useState<SenderService | null>(null);
  const [f, setF] = useState({ name: "", signature: "" });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const reset = () => { setEditing(null); setF({ name: "", signature: "" }); };
  const submit = async () => {
    setError(null); setOk(null);
    try {
      await save.mutateAsync({ id: editing?.id, data: { name: f.name.trim(), signature: f.signature.trim() || undefined } });
      setOk(editing ? "Service mis à jour." : "Service créé."); reset();
    } catch (e) { setError(errMsg(e, "Enregistrement impossible.")); }
  };
  const toggle = async (s: SenderService) => {
    if (s.isActive && !window.confirm(`Désactiver le service « ${s.name} » ? Les anciens messages conservent leur mention.`)) return;
    setError(null); setOk(null);
    try { await save.mutateAsync({ id: s.id, data: { isActive: !s.isActive } }); setOk(s.isActive ? "Service désactivé." : "Service réactivé."); }
    catch (e) { setError(errMsg(e, "Mise à jour impossible.")); }
  };

  return (
    <SectionCard title="Services expéditeurs">
      <div className="space-y-4">
        <Feedback error={error} success={ok} />
        {isLoading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement…</p>
          : isError ? <p className="text-sm" style={{ color: C.red }}>Services indisponibles. <button className="underline" onClick={() => refetch()}>Réessayer</button></p>
          : <div className="space-y-2">{(data || []).map(s => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md p-3" style={{ border: `1px solid ${C.line}` }} data-testid={`row-service-${s.id}`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: C.ink }}>{s.name} <Pill tone={s.isActive ? "basse" : "neutral"}>{s.isActive ? "Actif" : "Inactif"}</Pill></p>
                <p className="text-xs whitespace-pre-wrap" style={{ color: C.inkSoft }}>{s.signature || "Aucune signature."}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded-md px-2.5 py-1.5 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.inkSoft }} onClick={() => { setEditing(s); setF({ name: s.name, signature: s.signature || "" }); }} data-testid={`button-edit-service-${s.id}`}>Modifier</button>
                <button type="button" className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: s.isActive ? C.red : C.green }} onClick={() => void toggle(s)} data-testid={`button-toggle-service-${s.id}`}><Power size={13} />{s.isActive ? "Désactiver" : "Réactiver"}</button>
              </div>
            </div>))}</div>}
        <div className="rounded-md p-4 space-y-3" style={{ border: `1px solid ${C.line}`, background: C.bg }}>
          <h3 className="font-semibold text-sm" style={{ color: C.ink }}>{editing ? "Modifier le service" : "Nouveau service"}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nom *"><Input maxLength={120} value={f.name} onChange={(e: any) => setF(s => ({ ...s, name: e.target.value }))} data-testid="input-service-name" /></Field>
            <Field label="Signature"><Textarea rows={2} maxLength={500} value={f.signature} onChange={(e: any) => setF(s => ({ ...s, signature: e.target.value }))} data-testid="input-service-signature" /></Field>
          </div>
          <div className="flex justify-end gap-2">
            {editing && <button type="button" onClick={reset} className="rounded-md px-3 py-2 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}>Annuler</button>}
            <PrimaryBtn icon={Plus} onClick={submit} disabled={save.isPending || !f.name.trim()}>{editing ? "Enregistrer" : "Créer le service"}</PrimaryBtn>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
