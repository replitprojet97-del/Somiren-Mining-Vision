import { useState, type FormEvent } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";

export default function CollaboratorLogin() {
  const { profile, isLoading, login } = useWorkspaceAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && profile) return <Redirect to="/espace-collaborateur" />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      setLocation("/espace-collaborateur");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-background px-4 py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <section className="relative w-full max-w-[440px] border border-[#3d2f1f] bg-[#0a0a0a] p-8 md:p-10">
        <img src="/logo.svg" alt="Somiren" className="mx-auto mb-5 h-12 w-12" />
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">Accès confidentiel</p>
          <h1 className="font-serif text-2xl font-bold text-white">Espace Collaborateur</h1>
          <p className="mt-2 text-sm text-white/55">Connexion réservée aux comptes créés par la Direction.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="collaborator-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Adresse e-mail
            </label>
            <input
              id="collaborator-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full border border-[#3d2f1f] bg-[#141414] px-4 text-white outline-none transition-colors focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="collaborator-password" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Mot de passe
            </label>
            <input
              id="collaborator-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full border border-[#3d2f1f] bg-[#141414] px-4 text-white outline-none transition-colors focus:border-primary"
            />
          </div>
          {error && (
            <p role="alert" className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || isLoading}
            className="flex h-12 w-full items-center justify-center gap-2 bg-primary font-semibold uppercase tracking-wider text-black transition-opacity disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            Se connecter
          </button>
        </form>
      </section>
    </main>
  );
}