import { useState, useEffect } from "react";
import { Search, Unlock, Lock, Edit3, CheckCircle2, UserPlus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { C, SectionCard, PrimaryBtn, GhostBtn, Pill, Input, Select, Feedback } from "./shared";
import { useAdminApi } from "./api";
import ArrearsEditor from "./ArrearsEditor";
import SalaryEditor from "./SalaryEditor";

const SUPPORTED_ROLES = [
  { value: "ADMIN", label: "Administrateur" },
  { value: "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR", label: "Assistante exécutive & Conseillère stratégique" },
  { value: "COLLABORATOR", label: "Collaborateur" },
];

const createCollaboratorSchema = z.object({
  fullName: z.string().trim().min(1, "Le nom complet est obligatoire."),
  email: z.string().trim().email("Saisissez une adresse e-mail valide."),
  role: z.enum(["ADMIN", "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR", "COLLABORATOR"]),
  newPassword: z.string().min(12, "Le mot de passe doit contenir au moins 12 caractères."),
});

type CreateCollaboratorInput = z.infer<typeof createCollaboratorSchema>;

export default function UsersView() {
  const api = useAdminApi();
  const [users, setUsers] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        api.get("/admin/collaborators"),
        api.get("/admin/roles")
      ]);
      setUsers(uRes.collaborators || []);
      setAvailablePermissions(rRes.availablePermissions || []);
      setError(null);
    } catch (err: any) {
      setError(err.error || "Erreur lors du chargement des collaborateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => u.fullName?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase()));

  const handleUpdateUser = async (id: string, payload: any) => {
    if (pendingUserIds.includes(id)) return false;
    setPendingUserIds(prev => [...prev, id]);
    setError(null); setSuccess(null);
    try {
      await api.patch(`/admin/collaborators/${id}`, payload);
      setSuccess("Collaborateur mis à jour.");
      await load();
      return true;
    } catch (err: any) {
      setError(err.error || "Erreur lors de la mise à jour");
      return false;
    } finally {
      setPendingUserIds(prev => prev.filter(userId => userId !== id));
    }
  };

  const handleCreateCollaborator = async (payload: any) => {
    setError(null); setSuccess(null);
    try {
      await api.post("/admin/collaborators", payload);
      setSuccess("Collaborateur ajouté.");
      setShowCreateForm(false);
      await load();
      return true;
    } catch (err: any) {
      setError(err.error || "Erreur lors de la création du collaborateur.");
      return false;
    }
  };

  const handleRestoreAccess = async (user: any) => {
    if (restoringId === user.id) return;
    setRestoringId(user.id);
    setError(null); setSuccess(null);
    try {
      await api.post(`/admin/collaborators/${user.id}/restore-access`);
      setSuccess(`L’accès de ${user.fullName} a été débloqué.`);
      await load();
    } catch (err: any) {
      setError(err.error || "Erreur lors du déblocage de l’accès.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div aria-live="polite" aria-atomic="true"><Feedback error={error} success={success} /></div>
      <SectionCard
        title="Collaborateurs"
        action={
          <button
            type="button"
            onClick={() => { setShowCreateForm(true); setError(null); setSuccess(null); }}
            aria-expanded={showCreateForm}
            aria-controls="create-collaborator-form"
            data-testid="button-add-collaborator"
            className="flex items-center justify-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90"
            style={{ background: C.navy }}
          >
            <UserPlus size={14} /> Ajouter un collaborateur
          </button>
        }
      >
        <div className="flex items-center gap-2 px-3 py-2 rounded-md mb-4 bg-white" style={{ border: `1px solid ${C.line}` }}>
          <Search size={15} style={{ color: C.inkFaint }} />
          <input aria-label="Rechercher un collaborateur" data-testid="input-search-collaborator" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un collaborateur…" className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <div className="overflow-x-auto">
          {loading ? <div className="text-sm py-4" style={{ color: C.inkSoft }}>Chargement...</div> : filtered.length === 0 ? <div className="text-sm py-4" style={{ color: C.inkSoft }}>Aucun collaborateur trouvé.</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: C.inkSoft, borderBottom: `1px solid ${C.line}` }}>
                <th className="text-left font-medium py-2">Nom</th>
                <th className="text-left font-medium py-2 hidden sm:table-cell">Rôle</th>
                <th className="text-left font-medium py-2">Compte</th>
                <th className="text-left font-medium py-2">Accès espace</th>
                <th className="text-left font-medium py-2">Visio</th>
                <th className="text-right font-medium py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const canVideo = u.permissions?.includes("CAN_USE_VIDEO_CONFERENCE");
                const hasWorkspaceAccess = u.permissions?.includes("workspace:read") ?? false;
                const needsRestore = !u.isActive || u.isTemporarilyLocked || !hasWorkspaceAccess;
                const accountStatus = !u.isActive ? "Suspendu" : u.isTemporarilyLocked ? "Verrouillé temporairement" : "Actif";
                const accountTone = !u.isActive ? "suspendu" : u.isTemporarilyLocked ? "moyenne" : "actif";
                return (
                <tr key={u.id} data-testid={`row-collaborator-${u.id}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="py-3 font-medium" style={{ color: C.ink }}>
                    {u.fullName}
                    <div className="text-xs font-normal" style={{ color: C.inkSoft }}>{u.email}</div>
                  </td>
                  <td className="py-3 hidden sm:table-cell" style={{ color: C.inkSoft }}>{SUPPORTED_ROLES.find(r => r.value === u.role)?.label || u.role}</td>
                  <td className="py-3"><Pill tone={accountTone}>{accountStatus}</Pill></td>
                  <td className="py-3">
                    <Pill tone={hasWorkspaceAccess ? "actif" : "neutral"}>{hasWorkspaceAccess ? "Autorisé" : "Non autorisé"}</Pill>
                  </td>
                  <td className="py-3">
                    {canVideo
                      ? <span className="flex items-center gap-1 text-[12.5px]" style={{ color: C.green }}><Unlock size={13} /> Activée</span>
                      : <span className="flex items-center gap-1 text-[12.5px]" style={{ color: C.inkFaint }}><Lock size={13} /> Désactivée</span>}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setSelected(u)} title="Gérer" aria-label={`Gérer ${u.fullName}`} data-testid={`button-edit-collaborator-${u.id}`} className="p-1 hover:bg-gray-100 rounded-md transition-colors"><Edit3 size={15} style={{ color: C.inkSoft }} className="hover:text-black" /></button>
                      {needsRestore && (
                        <button
                          type="button"
                          onClick={() => handleRestoreAccess(u)}
                          disabled={restoringId === u.id}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50"
                          style={{ color: C.green, border: `1px solid ${C.line}` }}
                          data-testid={`button-restore-access-${u.id}`}
                        >
                          <Unlock size={13} /> {restoringId === u.id ? "Déblocage…" : "Débloquer l’accès"}
                        </button>
                      )}
                      {u.isActive && (
                        <button
                          type="button"
                          onClick={() => handleUpdateUser(u.id, { isActive: false })}
                          title="Suspendre le compte"
                          aria-label={`Suspendre ${u.fullName}`}
                          disabled={pendingUserIds.includes(u.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                          style={{ color: C.red, border: `1px solid ${C.line}` }}
                          data-testid={`button-suspend-collaborator-${u.id}`}
                        >
                          <Lock size={13} /> Suspendre
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          )}
        </div>
      </SectionCard>

      {showCreateForm && (
        <CreateCollaboratorPanel
          onClose={() => { setShowCreateForm(false); setError(null); }}
          onSave={handleCreateCollaborator}
        />
      )}

      {selected && (
        <>
          <UserEditPanel
            key={selected.id}
            user={selected}
            availablePermissions={availablePermissions}
            isSaving={pendingUserIds.includes(selected.id)}
            onClose={() => setSelected(null)}
            onSave={(payload: any) => handleUpdateUser(selected.id, payload)}
          />
          <ArrearsEditor
            key={`arrears-${selected.id}`}
            user={selected}
            onPermissionsGranted={() => {
              const financePermissions = ["VIEW_OWN_ARREARS", "VIEW_OWN_FINANCIAL_INFORMATION"];
              setSelected((current: any) => current && current.id === selected.id
                ? { ...current, permissions: [...new Set([...(current.permissions || []), ...financePermissions])] }
                : current);
              setUsers(current => current.map(user => user.id === selected.id
                ? { ...user, permissions: [...new Set([...(user.permissions || []), ...financePermissions])] }
                : user));
            }}
          />
          {selected.role !== "ADMIN" && (
            <SalaryEditor
              key={`salary-${selected.id}`}
              user={selected}
              onFinanceVisibilityGranted={() => {
                const financePermission = "VIEW_OWN_FINANCIAL_INFORMATION";
                setSelected((current: any) => current && current.id === selected.id
                  ? { ...current, permissions: [...new Set([...(current.permissions || []), financePermission])] }
                  : current);
                setUsers(current => current.map(user => user.id === selected.id
                  ? { ...user, permissions: [...new Set([...(user.permissions || []), financePermission])] }
                  : user));
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function CreateCollaboratorPanel({ onClose, onSave }: any) {
  const form = useForm<CreateCollaboratorInput>({
    resolver: zodResolver(createCollaboratorSchema),
    defaultValues: { fullName: "", email: "", role: "COLLABORATOR", newPassword: "" },
  });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;
  const submit = async (values: CreateCollaboratorInput) => { await onSave(values); };

  return (
    <SectionCard title="Ajouter un collaborateur" action={<button type="button" onClick={onClose} disabled={isSubmitting} className="text-sm hover:underline disabled:opacity-50" style={{ color: C.inkSoft }} data-testid="button-close-create-collaborator">Fermer</button>}>
      <Form {...form}>
        <form id="create-collaborator-form" onSubmit={handleSubmit(submit)} className="grid sm:grid-cols-2 gap-5" aria-label="Ajouter un collaborateur">
          <div>
            <label htmlFor="collaborator-full-name" className="block text-[13px] font-medium mb-2" style={{ color: C.ink }}>Nom complet</label>
            <Input id="collaborator-full-name" data-testid="input-collaborator-full-name" autoComplete="name" aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "collaborator-full-name-error" : undefined} {...register("fullName")} />
            {errors.fullName && <p id="collaborator-full-name-error" role="alert" className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
          </div>
          <div>
            <label htmlFor="collaborator-email" className="block text-[13px] font-medium mb-2" style={{ color: C.ink }}>Adresse e-mail</label>
            <Input id="collaborator-email" data-testid="input-collaborator-email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "collaborator-email-error" : undefined} {...register("email")} />
            {errors.email && <p id="collaborator-email-error" role="alert" className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="collaborator-role" className="block text-[13px] font-medium mb-2" style={{ color: C.ink }}>Rôle</label>
            <Select id="collaborator-role" data-testid="select-collaborator-role" aria-invalid={!!errors.role} {...register("role")}>
              {SUPPORTED_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
            {errors.role && <p role="alert" className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
          </div>
          <div>
            <label htmlFor="collaborator-password" className="block text-[13px] font-medium mb-2" style={{ color: C.ink }}>Nouveau mot de passe</label>
            <Input id="collaborator-password" data-testid="input-collaborator-password" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} aria-describedby={errors.newPassword ? "collaborator-password-error" : "collaborator-password-hint"} {...register("newPassword")} />
            {errors.newPassword
              ? <p id="collaborator-password-error" role="alert" className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
              : <p id="collaborator-password-hint" className="mt-1 text-xs" style={{ color: C.inkSoft }}>12 caractères minimum.</p>}
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-md transition-opacity disabled:opacity-50 bg-white hover:bg-gray-50" style={{ border: `1px solid ${C.line}`, color: C.ink }} data-testid="button-cancel-create-collaborator">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center justify-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-md text-white transition-opacity disabled:opacity-50 hover:opacity-90" style={{ background: C.navy }} data-testid="button-submit-create-collaborator">
              <UserPlus size={14} /> {isSubmitting ? "Ajout…" : "Ajouter le collaborateur"}
            </button>
          </div>
        </form>
      </Form>
    </SectionCard>
  );
}

function UserEditPanel({ user, availablePermissions, isSaving, onClose, onSave }: any) {
  const [role, setRole] = useState(user.role || "");
  const [isActive, setIsActive] = useState(user.isActive !== false);
  const [perms, setPerms] = useState<string[]>(user.permissions || []);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setRole(user.role || "");
    setIsActive(user.isActive !== false);
    setPerms(user.permissions || []);
  }, [user.role, user.isActive, user.permissions]);

  const submit = async () => {
    if (isSaving) return;
    const payload: any = {};
    if (role !== user.role) payload.role = role;
    if (isActive !== (user.isActive !== false)) payload.isActive = isActive;
    const originalPermissions = [...(user.permissions || [])].sort();
    const updatedPermissions = [...perms].sort();
    if (originalPermissions.length !== updatedPermissions.length
      || originalPermissions.some((permission: string, index: number) => permission !== updatedPermissions[index])) {
      payload.permissions = perms;
    }
    if (newPassword) payload.newPassword = newPassword;
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    const saved = await onSave(payload);
    if (saved) onClose();
  };

  const handleTogglePerm = (p: string) => {
    setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  return (
    <SectionCard title={`Gérer — ${user.fullName}`} action={<button type="button" onClick={onClose} disabled={isSaving} className="text-sm hover:underline disabled:opacity-50" style={{ color: C.inkSoft }}>Fermer</button>}>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <p className="text-[13px] font-medium mb-2" style={{ color: C.ink }}>Rôle</p>
          <Select value={role} onChange={(e: any) => setRole(e.target.value)} disabled={isSaving}>
            {SUPPORTED_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </div>
        <div>
          <p className="text-[13px] font-medium mb-2" style={{ color: C.ink }}>Statut du compte</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsActive(true)} disabled={isSaving} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50" style={isActive ? { background: C.navy, color: "white", borderColor: C.navy } : { background: "white", color: C.ink, borderColor: C.line }}>
              <Unlock size={13} /> Actif
            </button>
            <button type="button" onClick={() => setIsActive(false)} disabled={isSaving} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50" style={!isActive ? { background: C.redBg, color: C.red, borderColor: C.red } : { background: "white", color: C.ink, borderColor: C.line }}>
              <Lock size={13} /> Suspendre
            </button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[13px] font-medium mb-2" style={{ color: C.ink }}>Nouveau mot de passe (laisser vide pour ne pas changer)</p>
          <Input type="password" placeholder="Saisir un nouveau mot de passe" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} disabled={isSaving} />
        </div>
        <div className="sm:col-span-2">
          <p className="text-[13px] font-medium mb-2" style={{ color: C.ink }}>Permissions individuelles</p>
          <div className="flex flex-wrap gap-2">
            {availablePermissions.map((p: string) => (
              <label key={p} className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md cursor-pointer transition-colors" style={{ border: `1px solid ${C.line}`, color: C.inkSoft, background: perms.includes(p) ? C.blueBg : "white" }}>
                <input type="checkbox" checked={perms.includes(p)} disabled={isSaving} onChange={() => handleTogglePerm(p)} /> {p}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
          <GhostBtn onClick={onClose} disabled={isSaving}>Annuler</GhostBtn>
          <PrimaryBtn icon={CheckCircle2} onClick={submit} disabled={isSaving}>{isSaving ? "Enregistrement…" : "Enregistrer"}</PrimaryBtn>
        </div>
      </div>
    </SectionCard>
  );
}
