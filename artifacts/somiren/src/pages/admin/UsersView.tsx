import { useState, useEffect } from "react";
import { Search, Unlock, Lock, Edit3, CheckCircle2 } from "lucide-react";
import { C, SectionCard, PrimaryBtn, GhostBtn, Pill, Input, Select, Feedback } from "./shared";
import { useAdminApi } from "./api";

export default function UsersView() {
  const api = useAdminApi();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/admin/collaborators").catch(err => { setError(err.error || "Erreur collaborateurs"); return { collaborators: [] }; }),
      api.get("/admin/roles").catch(err => { setError(err.error || "Erreur rôles"); return { roles: [], availablePermissions: [] }; })
    ]).then(([uRes, rRes]) => {
      setUsers(uRes.collaborators || []);
      setRoles(rRes.roles || []);
      setAvailablePermissions(rRes.availablePermissions || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => u.fullName?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase()));

  const handleUpdateUser = async (id: string, payload: any) => {
    setError(null); setSuccess(null);
    try {
      await api.patch(`/admin/collaborators/${id}`, payload);
      setSuccess("Collaborateur mis à jour.");
      await load();
      if (selected && selected.id === id) {
        setSelected((prev: any) => ({ ...prev, ...payload }));
      }
    } catch (err: any) {
      setError(err.error || "Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="space-y-5">
      <Feedback error={error} success={success} />
      <SectionCard title="Collaborateurs">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md mb-4 bg-white" style={{ border: `1px solid ${C.line}` }}>
          <Search size={15} style={{ color: C.inkFaint }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un collaborateur…" className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <div className="overflow-x-auto">
          {loading ? <div className="text-sm py-4" style={{ color: C.inkSoft }}>Chargement...</div> : filtered.length === 0 ? <div className="text-sm py-4" style={{ color: C.inkSoft }}>Aucun collaborateur trouvé.</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: C.inkSoft, borderBottom: `1px solid ${C.line}` }}>
                <th className="text-left font-medium py-2">Nom</th>
                <th className="text-left font-medium py-2 hidden sm:table-cell">Rôle</th>
                <th className="text-left font-medium py-2">Statut</th>
                <th className="text-left font-medium py-2">Visio</th>
                <th className="text-right font-medium py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const canVideo = u.permissions?.includes("CAN_USE_VIDEO_CONFERENCE");
                return (
                <tr key={u.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="py-3 font-medium" style={{ color: C.ink }}>
                    {u.fullName}
                    <div className="text-xs font-normal" style={{ color: C.inkSoft }}>{u.email}</div>
                  </td>
                  <td className="py-3 hidden sm:table-cell" style={{ color: C.inkSoft }}>{roles.find(r => r.label === u.role)?.label || u.role}</td>
                  <td className="py-3"><Pill tone={u.isActive ? "actif" : "suspendu"}>{u.isActive ? "Actif" : "Suspendu"}</Pill></td>
                  <td className="py-3">
                    {canVideo
                      ? <span className="flex items-center gap-1 text-[12.5px]" style={{ color: C.green }}><Unlock size={13} /> Activée</span>
                      : <span className="flex items-center gap-1 text-[12.5px]" style={{ color: C.inkFaint }}><Lock size={13} /> Désactivée</span>}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setSelected(u)} title="Gérer" className="p-1 hover:bg-gray-100 rounded-md transition-colors"><Edit3 size={15} style={{ color: C.inkSoft }} className="hover:text-black" /></button>
                      <button 
                        onClick={() => handleUpdateUser(u.id, { isActive: !u.isActive })}
                        title={u.isActive ? "Suspendre" : "Réactiver"}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        {u.isActive ? <Lock size={15} style={{ color: C.red }} /> : <Unlock size={15} style={{ color: C.green }} />}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          )}
        </div>
      </SectionCard>

      {selected && (
        <UserEditPanel 
          user={selected} 
          roles={roles}
          availablePermissions={availablePermissions}
          onClose={() => setSelected(null)} 
          onSave={async (payload: any) => { await handleUpdateUser(selected.id, payload); setSelected(null); }} 
        />
      )}
    </div>
  );
}

function UserEditPanel({ user, roles, availablePermissions, onClose, onSave }: any) {
  const [role, setRole] = useState(user.role || "");
  const [isActive, setIsActive] = useState(user.isActive !== false);
  const [perms, setPerms] = useState<string[]>(user.permissions || []);
  const [newPassword, setNewPassword] = useState("");

  const handleTogglePerm = (p: string) => {
    setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const submit = () => {
    const payload: any = { role, isActive, permissions: perms };
    if (newPassword) payload.newPassword = newPassword;
    onSave(payload);
  };

  return (
    <SectionCard title={`Gérer — ${user.fullName}`} action={<button onClick={onClose} className="text-sm hover:underline" style={{ color: C.inkSoft }}>Fermer</button>}>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <p className="text-[13px] font-medium mb-2" style={{ color: C.ink }}>Rôle</p>
          <Select value={role} onChange={(e: any) => setRole(e.target.value)}>
            {roles.map((r: any) => <option key={r.id} value={r.label}>{r.label}</option>)}
          </Select>
        </div>
        <div>
          <p className="text-[13px] font-medium mb-2" style={{ color: C.ink }}>Statut du compte</p>
          <div className="flex gap-2">
            <button onClick={() => setIsActive(true)} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-md border transition-colors" style={isActive ? { background: C.navy, color: "white", borderColor: C.navy } : { background: "white", color: C.ink, borderColor: C.line }}>
              <Unlock size={13} /> Actif
            </button>
            <button onClick={() => setIsActive(false)} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-md border transition-colors" style={!isActive ? { background: C.redBg, color: C.red, borderColor: C.red } : { background: "white", color: C.ink, borderColor: C.line }}>
              <Lock size={13} /> Suspendre
            </button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[13px] font-medium mb-2" style={{ color: C.ink }}>Nouveau mot de passe (laisser vide pour ne pas changer)</p>
          <Input type="password" placeholder="Saisir un nouveau mot de passe" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <p className="text-[13px] font-medium mb-2" style={{ color: C.ink }}>Permissions individuelles</p>
          <div className="flex flex-wrap gap-2">
            {availablePermissions.map((p: string) => (
              <label key={p} className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md cursor-pointer transition-colors" style={{ border: `1px solid ${C.line}`, color: C.inkSoft, background: perms.includes(p) ? C.blueBg : "white" }}>
                <input type="checkbox" checked={perms.includes(p)} onChange={() => handleTogglePerm(p)} /> {p}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
          <GhostBtn onClick={onClose}>Annuler</GhostBtn>
          <PrimaryBtn icon={CheckCircle2} onClick={submit}>Enregistrer</PrimaryBtn>
        </div>
      </div>
    </SectionCard>
  );
}
