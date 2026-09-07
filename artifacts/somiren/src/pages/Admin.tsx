import { useState, useEffect } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import { useAdminApi } from "./admin/api";
import AdminShell from "./admin/AdminShell";
import { C, logoPath } from "./admin/shared";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";

export default function AdminPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const api = useAdminApi();
  const { logout: collaboratorLogout } = useWorkspaceAuth();

  const loadSession = async () => {
    setLoading(true);
    try {
      const data = await api.get("/admin/session");
      if (data && data.profile) setProfile(data.profile);
    } catch (err: any) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
    const onUnauth = () => setProfile(null);
    window.addEventListener("admin:unauthorized", onUnauth);
    return () => window.removeEventListener("admin:unauthorized", onUnauth);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post("/admin/login", { password });
      if (data && data.profile) setProfile(data.profile);
      else setError("Identifiants incorrects.");
    } catch (err: any) {
      setError(err.error || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.post("/auth/logout").catch(() => {});
    await collaboratorLogout().catch(() => {});
    setProfile(null);
  };

  if (loading && !profile) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-sans text-sm">Chargement...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 font-sans" style={{ background: C.bg }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src={logoPath} alt="Somiren" className="w-10 h-10 mx-auto mb-4" />
            <h1 className="text-2xl font-bold tracking-widest" style={{ color: C.navy }}>SOMIREN</h1>
            <p className="text-[11.5px] font-semibold tracking-widest mt-1" style={{ color: C.accent }}>ESPACE ADMINISTRATEUR</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-lg shadow-sm p-8 space-y-6" style={{ border: `1px solid ${C.line}` }}>
            <div>
              <label className="block text-[11.5px] font-medium uppercase tracking-widest mb-2" style={{ color: C.inkSoft }}>Mot de passe admin</label>
              <input
                type="password"
                 autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-md outline-none focus:ring-2 transition-shadow"
                style={{ border: `1px solid ${C.line}`, color: C.ink, backgroundColor: "white", "--tw-ring-color": "rgba(140, 59, 51, 0.2)" } as any}
                placeholder="••••••••••••"
                disabled={loading}
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-[13px] bg-red-50 p-2.5 rounded-md border border-red-100" style={{ color: C.red }}>
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <button type="submit" disabled={loading || !password} className="w-full flex items-center justify-center gap-2 text-white rounded-md py-2.5 font-semibold text-[13.5px] transition-opacity disabled:opacity-50 hover:opacity-90" style={{ background: C.navy }}>
              <Lock className="w-4 h-4" />
              {loading ? "Vérification..." : "Accéder à l'administration"}
            </button>
          </form>
          <p className="text-center text-[12px] mt-6" style={{ color: C.inkFaint }}>Accès restreint à la Direction Générale et à l'Administration SOMIREN.</p>
        </div>
      </div>
    );
  }

  return <AdminShell profile={profile} onLogout={handleLogout} />;
}
