import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Pencil, Plus, X } from "lucide-react";
import { C, Pill, SectionCard } from "./shared";
import { useAdminApi } from "./api";

type SalaryStatus = "Non versé" | "Versé";
type SalaryForm = {
  month: number;
  year: string;
  salaryStatus: SalaryStatus | "";
  communicatedDelayReason: string;
  preservedPeriodLabel: string | null;
};

const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, index, 1))));

function emptyForm(): SalaryForm {
  const today = new Date();
  return {
    month: today.getMonth() + 1,
    year: String(today.getFullYear()),
    salaryStatus: "Non versé",
    communicatedDelayReason: "",
    preservedPeriodLabel: null,
  };
}

function periodLabel(month: number, year: string): string {
  const label = MONTHS[month - 1] || MONTHS[0];
  return `${label.charAt(0).toLocaleUpperCase("fr-FR")}${label.slice(1)} ${year.trim()}`;
}

function normalized(value: string): string {
  return value.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function parsePeriod(value: string): { month: number; year: string } | null {
  const match = value.trim().match(/^([a-zÀ-ÿ]+)\s+(\d{4})$/i);
  if (!match) return null;
  const monthName = normalized(match[1]);
  const frenchMonth = MONTHS.findIndex(month => normalized(month) === monthName);
  if (frenchMonth >= 0) return { month: frenchMonth + 1, year: match[2] };
  const englishMonth = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ].indexOf(monthName);
  return englishMonth >= 0 ? { month: englishMonth + 1, year: match[2] } : null;
}

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

export default function SalaryEditor({ user, onFinanceVisibilityGranted }: {
  user: { id: number; fullName: string; role: string };
  onFinanceVisibilityGranted: () => void;
}) {
  const api = useAdminApi();
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [form, setForm] = useState<SalaryForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/admin/collaborators/${user.id}/salary-records`);
      setSalaryRecords(response.salaryRecords || []);
      setError(null);
    } catch (err: any) {
      setError(err.error || "Impossible de charger les données de rémunération.");
    } finally {
      setLoading(false);
    }
  }, [api, user.id]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const startEdit = (record: any) => {
    const parsedPeriod = parsePeriod(record.periodLabel);
    const defaults = emptyForm();
    setEditingId(record.id);
    setForm({
      ...defaults,
      month: parsedPeriod?.month ?? defaults.month,
      year: parsedPeriod?.year ?? defaults.year,
      salaryStatus: record.salaryStatus === "Versé" || record.salaryStatus === "Non versé"
        ? record.salaryStatus
        : "",
      communicatedDelayReason: record.communicatedDelayReason ?? "",
      preservedPeriodLabel: parsedPeriod ? null : record.periodLabel,
    });
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const updatePeriod = (key: "month" | "year", value: number | string) =>
    setForm(current => ({ ...current, [key]: value, preservedPeriodLabel: null }));

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const year = form.year.trim();
    if (!/^\d{1,4}$/.test(year) || Number(year) < 1 || Number(year) > 9999) {
      setError("Saisissez une année valide.");
      return;
    }
    if (!editingId && !form.salaryStatus) {
      setError("Choisissez un statut de rémunération.");
      return;
    }
    const payload = {
      periodLabel: form.preservedPeriodLabel ?? periodLabel(form.month, year),
      ...(form.salaryStatus ? { salaryStatus: form.salaryStatus } : {}),
      communicatedDelayReason: form.communicatedDelayReason.trim() || null,
    };
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId !== null) {
        await api.patch(`/admin/salary-records/${editingId}`, payload);
        setSuccess("Les données de rémunération ont été mises à jour.");
      } else {
        await api.post(`/admin/collaborators/${user.id}/salary-records`, payload);
        setSuccess("Les données de rémunération ont été communiquées au collaborateur.");
      }
      cancelEdit();
      await load();
      onFinanceVisibilityGranted();
    } catch (err: any) {
      setError(err.error || "Impossible d’enregistrer ces données de rémunération.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title={`Rémunération — ${user.fullName}`}>
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-md px-3 py-2 text-sm" style={{ color: C.red, background: C.redBg }}>{error}</p>}
        {success && <p role="status" className="rounded-md px-3 py-2 text-sm" style={{ color: C.green, background: C.greenBg }}>{success}</p>}
        {user.role === "ADMIN" ? (
          <p className="text-sm" style={{ color: C.inkSoft }}>Les données de rémunération ne peuvent pas être assignées à un compte administrateur.</p>
        ) : (
          <>
            {loading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement des données de rémunération…</p> : salaryRecords.length === 0
              ? <p className="text-sm" style={{ color: C.inkSoft }}>Aucune donnée de rémunération enregistrée pour ce collaborateur.</p>
              : <div className="space-y-3">
                {salaryRecords.map(record => (
                  <article key={record.id} className="rounded-md p-4" style={{ border: `1px solid ${C.line}`, background: "white" }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold" style={{ color: C.ink }}>{record.periodLabel}</h3>
                        <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>
                          {record.communicatedDelayReason || "Aucun motif communiqué."}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: C.inkFaint }}>Mis à jour le {displayDate(record.updatedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill tone={record.salaryStatus === "Versé" ? "basse" : "moyenne"}>{record.salaryStatus}</Pill>
                        <button type="button" onClick={() => startEdit(record)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.inkSoft }} data-testid={`button-edit-salary-${record.id}`}><Pencil size={13} /> Modifier</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>}

            <form onSubmit={save} className="space-y-4 rounded-md p-4" style={{ border: `1px solid ${C.line}`, background: C.bg }}>
              <h3 className="font-semibold" style={{ color: C.ink }}>{editingId !== null ? "Modifier les données de rémunération" : "Communiquer une rémunération mensuelle"}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-medium" style={{ color: C.inkSoft }}>
                  Mois
                  <select value={form.month} onChange={event => updatePeriod("month", Number(event.target.value))} className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="select-salary-month">
                    {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month.charAt(0).toLocaleUpperCase("fr-FR")}{month.slice(1)}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium" style={{ color: C.inkSoft }}>
                  Année
                  <input type="number" inputMode="numeric" min={1} max={9999} required value={form.year} onChange={event => updatePeriod("year", event.target.value)} className="mt-1 w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="input-salary-year" />
                </label>
                <label className="text-xs font-medium" style={{ color: C.inkSoft }}>
                  Statut
                  <select required={editingId === null} value={form.salaryStatus} onChange={event => setForm(current => ({ ...current, salaryStatus: event.target.value as SalaryStatus | "" }))} className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="select-salary-status">
                    {editingId !== null && <option value="">Conserver le statut actuel</option>}
                    <option value="Non versé">Non versé</option>
                    <option value="Versé">Versé</option>
                  </select>
                </label>
              </div>
              {form.preservedPeriodLabel && <p className="text-xs" style={{ color: C.inkSoft }}>Période historique conservée : {form.preservedPeriodLabel}. Choisissez un mois ou une année pour la remplacer.</p>}
              <label className="block text-xs font-medium" style={{ color: C.inkSoft }}>
                Motif communiqué (facultatif)
                <textarea maxLength={5000} value={form.communicatedDelayReason} onChange={event => setForm(current => ({ ...current, communicatedDelayReason: event.target.value }))} rows={2} className="mt-1 w-full rounded-md bg-white px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }} data-testid="input-salary-reason" />
              </label>
              <div className="flex justify-end gap-2">
                {editingId !== null && <button type="button" onClick={cancelEdit} disabled={saving} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}><X size={14} /> Annuler</button>}
                <button type="submit" disabled={saving} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-white disabled:opacity-50" style={{ background: C.navy }} data-testid="button-save-salary">
                  {editingId !== null ? <CheckCircle2 size={14} /> : <Plus size={14} />}{saving ? "Enregistrement…" : editingId !== null ? "Enregistrer" : "Communiquer"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </SectionCard>
  );
}