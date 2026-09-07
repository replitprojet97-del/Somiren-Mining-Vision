import { useState, useEffect } from "react";
import { Edit3, CheckCircle2 } from "lucide-react";
import { C, SectionCard, PrimaryBtn, GhostBtn, Feedback } from "./shared";
import { useAdminApi } from "./api";

export default function PermissionsView() {
  const api = useAdminApi();
  const [roles, setRoles] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get("/admin/roles").then(res => {
      setRoles(res.roles || []);
      setAvailablePermissions(res.availablePermissions || []);
    }).catch(err => setError(err.error || "Erreur rôles")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleUpdate = async (id: string, perms: string[]) => {
    setError(null); setSuccess(null);
    try {
      await api.patch(`/admin/roles/${id}`, { permissions: perms });
      setSuccess("Rôle mis à jour.");
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.error || "Erreur lors de la mise à jour du rôle");
    }
  };

  if (loading) return <div className="text-sm" style={{ color: C.inkSoft }}>Chargement...</div>;

  return (
    <div className="space-y-5">
      <Feedback error={error} success={success} />
      {roles.map((r) => (
        <RoleEditor key={r.id} role={r} allPerms={availablePermissions} isEditing={editingId === r.id} onEdit={() => setEditingId(r.id)} onSave={(perms: string[]) => handleUpdate(r.id, perms)} onCancel={() => setEditingId(null)} />
      ))}
      <SectionCard title="Restrictions administratives">
        <p className="text-[13px] leading-relaxed" style={{ color: C.inkSoft }}>
          Les rôles collaborateur ne peuvent jamais : gérer les utilisateurs, modifier les rôles ou permissions,
          accéder à l'administration générale, ni consulter les dossiers d'autres collaborateurs. Ces contrôles
          doivent être appliqués côté serveur, indépendamment de l'interface.
        </p>
      </SectionCard>
    </div>
  );
}

function RoleEditor({ role, allPerms, isEditing, onEdit, onSave, onCancel }: any) {
  const [perms, setPerms] = useState<string[]>(role.permissions || []);
  useEffect(() => { setPerms(role.permissions || []); }, [role, isEditing]);

  const toggle = (p: string) => setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  return (
    <SectionCard title={role.label || role.name || role.code} action={
      isEditing ? (
        <div className="flex gap-2">
          <GhostBtn onClick={onCancel}>Annuler</GhostBtn>
          <PrimaryBtn icon={CheckCircle2} onClick={() => onSave(perms)}>Enregistrer</PrimaryBtn>
        </div>
      ) : (
        <GhostBtn icon={Edit3} onClick={onEdit}>Modifier</GhostBtn>
      )
    }>
      <p className="text-[12.5px] mb-3" style={{ color: C.inkFaint }}>Code: {role.code}</p>
      <div className="flex flex-wrap gap-2">
        {allPerms.map((p: string) => {
          const has = perms.includes(p);
          return isEditing ? (
            <label key={p} className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md cursor-pointer transition-colors" style={{ border: `1px solid ${C.line}`, color: C.inkSoft, background: has ? C.blueBg : "white" }}>
              <input type="checkbox" checked={has} onChange={() => toggle(p)} /> {p}
            </label>
          ) : (
            <span key={p} className="text-[12px] px-2.5 py-1.5 rounded-md transition-colors" style={{ background: has ? C.greenBg : "#F1F3F5", color: has ? C.green : C.inkFaint }}>
              {p}
            </span>
          );
        })}
      </div>
    </SectionCard>
  );
}
