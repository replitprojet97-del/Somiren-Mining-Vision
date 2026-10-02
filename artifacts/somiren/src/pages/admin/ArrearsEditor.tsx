import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { C, Pill, SectionCard } from "./shared";
import { useAdminApi } from "./api";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { reportStatusLabel } from "../workspace/components/TransferModal";

type ArrearForm = {
  periodLabel: string;
  amount: string;
  currency: string;
  communicatedReason: string;
  transferInstructions: string;
  status: "open" | "settled" | "archived";
  payrollServiceName: string;
  payrollServiceSignature: string;
};

const EMPTY_FORM: ArrearForm = {
  periodLabel: "",
  amount: "",
  currency: "EUR",
  communicatedReason: "",
  transferInstructions: "",
  status: "open",
  payrollServiceName: "Service paie",
  payrollServiceSignature: "Somiren S.A. · Service paie",
};

const requestLabel: Record<string, string> = {
  pending: "Demande à traiter",
  acknowledged: "Demande prise en compte",
  declined: "Demande refusée",
};

export default function ArrearsEditor({ user, onPermissionsGranted }: {
  user: { id: number; fullName: string; role: string };
  onPermissionsGranted: () => void;
}) {
  const api = useAdminApi();
  const { w, locale } = useWorkspaceLocale();
  const statusLabel = (record: any) => record.conditionsReportedAt
    ? reportStatusLabel(record.transferRequestStatus, w)
    : requestLabel[record.transferRequestStatus] || record.transferRequestStatus;
  const [arrears, setArrears] = useState<any[]>([]);
  const [form, setForm] = useState<ArrearForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/admin/collaborators/${user.id}/arrears`);
      setArrears(response.arrears || []);
      setError(null);
    } catch (err: any) {
      setError(err.error || "Impossible de charger les arriérés de ce collaborateur.");
    } finally {
      setLoading(false);
    }
  }, [api, user.id]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const startEdit = (arrear: any) => {
    setEditingId(arrear.id);
    setForm({
      periodLabel: arrear.periodLabel || "",
      amount: arrear.amount ?? "",
      currency: arrear.currency ?? "",
      communicatedReason: arrear.communicatedReason ?? "",
      transferInstructions: arrear.transferInstructions ?? "",
      status: arrear.status,
      payrollServiceName: arrear.payrollServiceName ?? EMPTY_FORM.payrollServiceName,
      payrollServiceSignature: arrear.payrollServiceSignature ?? EMPTY_FORM.payrollServiceSignature,
    });
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const amount = form.amount.trim();
    if (amount && !/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$/.test(amount)) {
      setError("Saisissez un montant décimal valide avec deux décimales maximum.");
      return;
    }
    if (!editingId && !amount) {
      setError("Un montant explicite est requis pour créer un nouvel arriéré.");
      return;
    }
    if (amount && !/^[A-Z]{3}$/.test(form.currency.trim().toUpperCase())) {
      setError("La devise doit être un code de trois lettres majuscules (ex. EUR).");
      return;
    }
    const payload = {
      periodLabel: form.periodLabel.trim(),
      amount: amount || null,
      currency: form.currency.trim() ? form.currency.trim().toUpperCase() : null,
      communicatedReason: form.communicatedReason.trim(),
      transferInstructions: form.transferInstructions.trim(),
      status: form.status,
      payrollServiceName: form.payrollServiceName.trim() || "Service paie",
      payrollServiceSignature: form.payrollServiceSignature.trim() || "Somiren S.A. · Service paie",
    };
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await api.patch(`/admin/arrears/${editingId}`, payload);
        setSuccess("L’arriéré a été mis à jour.");
      } else {
        await api.post(`/admin/collaborators/${user.id}/arrears`, payload);
        setSuccess("L’arriéré a été communiqué au collaborateur.");
      }
      cancelEdit();
      await load();
      onPermissionsGranted();
    } catch (err: any) {
      setError(err.error || "Impossible d’enregistrer cet arriéré.");
    } finally {
      setSaving(false);
    }
  };

  const deleteArrear = async (arrear: any) => {
    if (arrear.transferRequestedAt || arrear.transferRequestStatus) return;
    if (!window.confirm(`Supprimer définitivement l’arriéré « ${arrear.periodLabel} » ?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await api.del(`/admin/arrears/${arrear.id}`);
      setSuccess("L’arriéré a été supprimé.");
      if (editingId === arrear.id) cancelEdit();
      await load();
    } catch (err: any) {
      setError(err.error || "Impossible de supprimer cet arriéré.");
    }
  };

  const reviewRequest = async (arrear: any, status: "acknowledged" | "declined") => {
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/admin/arrears/${arrear.id}`, { transferRequestStatus: status });
      setSuccess(arrear.conditionsReportedAt
        ? (status === "acknowledged" ? w("Le signalement a été pris en compte.", "The report has been acknowledged.") : w("Le signalement n’a pas été validé.", "The report has not been accepted."))
        : (status === "acknowledged" ? "La demande a été prise en compte." : "La demande a été refusée."));
      await load();
    } catch (err: any) {
      setError(err.error || "Impossible de mettre à jour cette demande.");
    }
  };

  const updateForm = (key: keyof ArrearForm, value: string) =>
    setForm(current => ({ ...current, [key]: value }));

  return (
    <SectionCard title={`Arriérés & demandes de régularisation — ${user.fullName}`}>
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-md px-3 py-2 text-sm" style={{ color: C.red, background: C.redBg }}>{error}</p>}
        {success && <p role="status" className="rounded-md px-3 py-2 text-sm" style={{ color: C.green, background: C.greenBg }}>{success}</p>}
        {user.role === "ADMIN" ? (
          <p className="text-sm" style={{ color: C.inkSoft }}>Les arriérés personnels ne peuvent pas être assignés à un compte administrateur.</p>
        ) : (
          <>
            {loading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement des arriérés…</p> : arrears.length === 0
              ? <p className="text-sm" style={{ color: C.inkSoft }}>Aucun arriéré enregistré pour ce collaborateur.</p>
              : <div className="space-y-3">
                {arrears.map(arrear => (
                  <article key={arrear.id} className="rounded-md p-4" style={{ border: `1px solid ${C.line}`, background: "white" }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold" style={{ color: C.ink }}>{arrear.periodLabel}</h3>
                        <p className="mt-1 text-sm font-medium" style={{ color: C.ink }}>
                          {arrear.amount == null ? "Montant non communiqué" : `${arrear.amount} ${arrear.currency || "—"}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={arrear.status === "open" ? "moyenne" : arrear.status === "settled" ? "basse" : "neutral"}>
                          {arrear.status === "open" ? "Ouvert" : arrear.status === "settled" ? "Réglé" : "Archivé"}
                        </Pill>
                        {arrear.transferRequestStatus && <Pill tone={arrear.transferRequestStatus === "pending" ? "haute" : "info"}>{statusLabel(arrear)}</Pill>}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <p><b>Motif communiqué :</b> {arrear.communicatedReason || "Aucun motif communiqué."}</p>
                      <p><b>Instructions :</b> {arrear.transferInstructions || "Aucune instruction communiquée."}</p>
                    </div>
                    {arrear.transferRequestedAt && (
                      <p className="mt-2 text-xs" style={{ color: C.inkSoft }}>
                        {arrear.conditionsReportedAt ? w("Signalement reçu le", "Report received on") : "Demande reçue le"} {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(arrear.conditionsReportedAt || arrear.transferRequestedAt))}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      {arrear.transferRequestStatus === "pending" && (
                        <>
                          <button type="button" onClick={() => void reviewRequest(arrear, "acknowledged")} className="rounded-md px-2.5 py-1.5 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.green }} data-testid={`button-acknowledge-transfer-${arrear.id}`}>{w("Prendre en compte", "Acknowledge")}</button>
                          <button type="button" onClick={() => void reviewRequest(arrear, "declined")} className="rounded-md px-2.5 py-1.5 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.red }} data-testid={`button-decline-transfer-${arrear.id}`}>{arrear.conditionsReportedAt ? w("Ne pas valider", "Do not accept") : "Refuser la demande"}</button>
                        </>
                      )}
                      <button type="button" onClick={() => startEdit(arrear)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.inkSoft }} data-testid={`button-edit-arrear-${arrear.id}`}><Pencil size={13} /> Modifier</button>
                      {!arrear.transferRequestedAt && !arrear.transferRequestStatus && (
                        <button type="button" onClick={() => void deleteArrear(arrear)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.red }} data-testid={`button-delete-arrear-${arrear.id}`}><Trash2 size={13} /> Supprimer</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>}

            <form onSubmit={save} className="space-y-4 rounded-md p-4" style={{ border: `1px solid ${C.line}`, background: C.bg }}>
              <h3 className="font-semibold" style={{ color: C.ink }}>{editingId ? "Modifier l’arriéré" : "Définir un nouvel arriéré"}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-medium" style={{ color: C.inkSoft }}>
                  Période
                  <input required maxLength={120} value={form.periodLabel} onChange={e => updateForm("periodLabel", e.target.value)} className="mt-1 w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="input-arrear-period" />
                </label>
                <label className="text-xs font-medium" style={{ color: C.inkSoft }}>
                  Montant décimal
                  <input inputMode="decimal" value={form.amount} onChange={e => updateForm("amount", e.target.value)} placeholder="Ex. 1250.00" className="mt-1 w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="input-arrear-amount" />
                </label>
                <label className="text-xs font-medium" style={{ color: C.inkSoft }}>
                  Devise
                  <input maxLength={3} value={form.currency} onChange={e => updateForm("currency", e.target.value.toUpperCase())} placeholder="EUR" className="mt-1 w-full rounded-md bg-white px-3 py-2 text-sm uppercase" style={{ border: `1px solid ${C.line}` }} data-testid="input-arrear-currency" />
                </label>
              </div>
              {editingId && <p className="text-xs" style={{ color: C.inkSoft }}>Laisser le montant vide conserve explicitement un montant inconnu (notamment pour les anciens dossiers).</p>}
              <label className="block text-xs font-medium" style={{ color: C.inkSoft }}>
                Motif communiqué
                <textarea required maxLength={5000} value={form.communicatedReason} onChange={e => updateForm("communicatedReason", e.target.value)} rows={2} className="mt-1 w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="input-arrear-reason" />
              </label>
              <label className="block text-xs font-medium" style={{ color: C.inkSoft }}>
                Instructions personnalisées au collaborateur
                <textarea required maxLength={5000} value={form.transferInstructions} onChange={e => updateForm("transferInstructions", e.target.value)} rows={3} className="mt-1 w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="input-arrear-instructions" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium" style={{ color: C.inkSoft }}>Service émetteur
                  <input maxLength={120} value={form.payrollServiceName} onChange={e => updateForm("payrollServiceName", e.target.value)} className="mt-1 w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="input-arrear-service-name" />
                </label>
                <label className="text-xs font-medium" style={{ color: C.inkSoft }}>Signature
                  <input maxLength={500} value={form.payrollServiceSignature} onChange={e => updateForm("payrollServiceSignature", e.target.value)} className="mt-1 w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="input-arrear-service-signature" />
                </label>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="text-xs font-medium" style={{ color: C.inkSoft }}>
                  Statut
                  <select value={form.status} onChange={e => updateForm("status", e.target.value)} className="mt-1 block rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="select-arrear-status">
                    <option value="open">Ouvert</option>
                    <option value="settled">Réglé</option>
                    <option value="archived">Archivé</option>
                  </select>
                </label>
                <div className="flex gap-2">
                  {editingId && <button type="button" onClick={cancelEdit} disabled={saving} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}><X size={14} /> Annuler</button>}
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-white disabled:opacity-50" style={{ background: C.navy }} data-testid="button-save-arrear">
                    {editingId ? <CheckCircle2 size={14} /> : <Plus size={14} />}{saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer l’arriéré"}
                  </button>
                </div>
              </div>
            </form>
            <p className="text-xs" style={{ color: C.inkFaint }}>Une demande de régularisation est une demande administrative uniquement : aucun virement bancaire ni paiement n’est déclenché.</p>
          </>
        )}
      </div>
    </SectionCard>
  );
}