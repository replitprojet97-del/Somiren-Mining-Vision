import { useEffect, useState } from "react";
import { C, SectionCard, Field, Select } from "./shared";
import { useAdminApi } from "./api";
import SalaryEditor from "./SalaryEditor";
import ArrearsEditor from "./ArrearsEditor";

export default function PayrollView() {
  const api = useAdminApi();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState("");

  const load = () => {
    setLoading(true); setError(null);
    api.get("/admin/collaborators").then(r => setUsers((r.collaborators || []).filter((u: any) => u.role !== "ADMIN")))
      .catch((e: any) => setError(e.error || "Collaborateurs indisponibles.")).finally(() => setLoading(false));
  };
  useEffect(load, [api]);
  const user = users.find(u => String(u.id) === sel);

  return (
    <div className="space-y-4">
      <SectionCard title="Paie & Arriérés">
        {loading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement…</p>
          : error ? <p className="text-sm" style={{ color: C.red }} role="alert">{error} <button className="underline" onClick={load}>Réessayer</button></p>
          : !users.length ? <p className="text-sm" style={{ color: C.inkSoft }}>Aucun collaborateur.</p>
          : <Field label="Collaborateur">
              <Select value={sel} onChange={(e: any) => setSel(e.target.value)} data-testid="select-payroll-user">
                <option value="">Sélectionner...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </Select>
            </Field>}
      </SectionCard>
      {user && <>
        <SalaryEditor key={`s-${user.id}`} user={user} onFinanceVisibilityGranted={() => {}} />
        <ArrearsEditor key={`a-${user.id}`} user={user} onPermissionsGranted={() => {}} />
      </>}
    </div>
  );
}
