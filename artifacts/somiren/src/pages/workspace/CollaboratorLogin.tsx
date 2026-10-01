import { useState, type FormEvent } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

function localizeLoginError(message: string, lang: "fr" | "en"): string {
  const localized = localizeApiMessage(message, lang);
  const pairs: Record<string, readonly [string, string]> = {
    "Connexion impossible.": ["Connexion impossible.", "Unable to sign in."],
    "Unable to sign in.": ["Connexion impossible.", "Unable to sign in."],
    "Vérification impossible.": ["Vérification impossible.", "Verification failed."],
    "Verification failed.": ["Vérification impossible.", "Verification failed."],
    "Impossible d'annuler la vérification.": ["Impossible d'annuler la vérification.", "Could not cancel verification."],
    "Could not cancel verification.": ["Impossible d'annuler la vérification.", "Could not cancel verification."],
    "Connexion impossible. Vérifiez votre connexion réseau et réessayez.": ["Connexion impossible. Vérifiez votre connexion réseau et réessayez.", "Unable to connect. Check your connection and try again."],
    "Unable to connect. Check your connection and try again.": ["Connexion impossible. Vérifiez votre connexion réseau et réessayez.", "Unable to connect. Check your connection and try again."],
    "Cette tentative de connexion a été annulée.": ["Cette tentative de connexion a été annulée.", "This sign-in attempt was cancelled."],
    "This sign-in attempt was cancelled.": ["Cette tentative de connexion a été annulée.", "This sign-in attempt was cancelled."],
    "Cette vérification a été annulée.": ["Cette vérification a été annulée.", "This verification was cancelled."],
    "This verification was cancelled.": ["Cette vérification a été annulée.", "This verification was cancelled."],
    "Cette annulation a été remplacée par une action plus récente.": ["Cette annulation a été remplacée par une action plus récente.", "This cancellation was superseded by a newer action."],
    "This cancellation was superseded by a newer action.": ["Cette annulation a été remplacée par une action plus récente.", "This cancellation was superseded by a newer action."],
    "Cette déconnexion a été remplacée par une action plus récente.": ["Cette déconnexion a été remplacée par une action plus récente.", "This sign-out was superseded by a newer action."],
    "This sign-out was superseded by a newer action.": ["Cette déconnexion a été remplacée par une action plus récente.", "This sign-out was superseded by a newer action."],
  };
  const pair = pairs[message];
  return pair ? pair[lang === "en" ? 1 : 0] : localized;
}

export default function CollaboratorLogin() {
  const { profile, isLoading, login, verifyTwoFactor, cancelTwoFactor } = useWorkspaceAuth();
  const { lang, setLang, w } = useWorkspaceLocale();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [retryLogin, setRetryLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && profile) return <Redirect to="/espace-collaborateur" />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setRetryLogin(false);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.requiresTwoFactor) {
        setPassword("");
        setCode("");
        setTwoFactorRequired(true);
      } else {
        setPassword("");
        setLocation("/espace-collaborateur");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : w("Connexion impossible.", "Unable to sign in."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError("");
    setRetryLogin(false);
    setSubmitting(true);
    try {
      await verifyTwoFactor(code.trim());
      setCode("");
      setLocation("/espace-collaborateur");
    } catch (caught) {
      const status = (caught as { status?: number })?.status;
      const message = caught instanceof Error ? caught.message : w("Vérification impossible.", "Verification failed.");
      const translatedMessage = localizeApiMessage(message, lang);
      const challengeExpiredOrLimited =
        status === 410 ||
        status === 429 ||
        /expir|rate.?limit|too many (?:requests|verification|incorrect|failed|sign-in)|trop de requêtes|trop de codes|limite de tentatives/i.test(`${message} ${translatedMessage}`);
      if (challengeExpiredOrLimited) {
        try {
          await cancelTwoFactor();
        } catch {
          // The challenge is still cleared locally; the backend cookie also expires on its own.
        }
        setTwoFactorRequired(false);
        setPassword("");
        setCode("");
        setError(message);
        setRetryLogin(true);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBackToPassword() {
    setError("");
    setRetryLogin(false);
    setSubmitting(true);
    try {
      await cancelTwoFactor();
      setTwoFactorRequired(false);
      setCode("");
    } catch (caught) {
      setTwoFactorRequired(false);
      setCode("");
      setError(caught instanceof Error ? caught.message : w("Impossible d'annuler la vérification.", "Could not cancel verification."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-background px-4 py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <section className="relative w-full max-w-[440px] border border-[#3d2f1f] bg-[#0a0a0a] p-8 md:p-10">
        <div className="absolute right-4 top-4 flex items-center gap-1" role="group" aria-label={w("Choisir la langue", "Choose language")}>
          {(["fr", "en"] as const).map(language => (
            <button
              key={language}
              type="button"
              onClick={() => setLang(language)}
              aria-pressed={lang === language}
              aria-label={language === "fr" ? w("Afficher en français", "Display in French") : w("Afficher en anglais", "Display in English")}
              className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${lang === language ? "bg-primary text-black" : "text-white/55 hover:text-white"}`}
            >
              {language.toUpperCase()}
            </button>
          ))}
        </div>
        <img src="/logo.svg" alt="Somiren" className="mx-auto mb-5 h-12 w-12" />
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">{w("Accès confidentiel", "Confidential access")}</p>
          <h1 className="font-serif text-2xl font-bold text-white">
            {twoFactorRequired ? w("Vérification de sécurité", "Security verification") : w("Espace Collaborateur", "Collaborator workspace")}
          </h1>
          <p className="mt-2 text-sm text-white/55">
            {twoFactorRequired
              ? w("Saisissez le code de votre application ou un code de secours.", "Enter a code from your authenticator app or a recovery code.")
              : w("Connexion réservée aux comptes créés par la Direction.", "Sign-in is limited to accounts created by Management.")}
          </p>
        </div>
        {twoFactorRequired ? (
          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label htmlFor="collaborator-two-factor-code" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                {w("Code d'authentification ou code de secours", "Authenticator code or recovery code")}
              </label>
              <input
                id="collaborator-two-factor-code"
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-12 w-full border border-[#3d2f1f] bg-[#141414] px-4 text-center text-white outline-none transition-colors focus:border-primary"
              />
              <p className="mt-2 text-xs text-white/45">{w("Les codes de secours ne peuvent être utilisés qu'une seule fois.", "Recovery codes can only be used once.")}</p>
            </div>
            {error && (
              <p role="alert" className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {localizeLoginError(error, lang)}{retryLogin ? ` ${w("Veuillez recommencer la connexion.", "Please start the sign-in process again.")}` : ""}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || isLoading || !code.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 bg-primary font-semibold uppercase tracking-wider text-black transition-opacity disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {w("Vérifier et se connecter", "Verify and sign in")}
            </button>
            <button
              type="button"
              onClick={() => void handleBackToPassword()}
              disabled={submitting}
              className="w-full py-2 text-sm text-white/60 underline underline-offset-4 transition-colors hover:text-white disabled:opacity-50"
            >
              {w("Retour au mot de passe", "Back to password")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="collaborator-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                {w("Adresse e-mail", "Email address")}
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
                {w("Mot de passe", "Password")}
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
                {localizeLoginError(error, lang)}{retryLogin ? ` ${w("Veuillez recommencer la connexion.", "Please start the sign-in process again.")}` : ""}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 bg-primary font-semibold uppercase tracking-wider text-black transition-opacity disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {w("Se connecter", "Sign in")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}