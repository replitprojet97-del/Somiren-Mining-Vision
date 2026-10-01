import { useState } from "react";
import { Redirect, Route, Switch } from "wouter";
import { useMe } from "@/hooks/use-workspace";
import { AlertCircle, Loader2 } from "lucide-react";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { toast } from "sonner";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/lib/api-error";

import { Sidebar, Topbar } from "./components/Layout";
import Dashboard from "./Dashboard";
import Inbox from "./Inbox";
import Cases from "./Cases";
import Tasks from "./Tasks";
import Requests from "./Requests";
import Agenda from "./Agenda";
import VideoView from "./Video";
import Comms from "./Comms";
import Documents from "./Documents";
import Notes from "./Notes";
import Finance from "./Finance";
import Notifications from "./Notifications";
import Security from "./Security";
import Support from "./Support";
import Profile from "./Profile";

export default function WorkspaceLayout() {
  const { w, lang } = useWorkspaceLocale();
  const { logout } = useWorkspaceAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: me, isLoading, error, refetch } = useMe();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F3F5F7]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#B4713B" }} />
      </div>
    );
  }

  if (error || !me) {
    const accessDenied = (error as { status?: number } | null)?.status === 403;
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F3F5F7] px-4">
        <div className="w-full max-w-lg border border-red-200 bg-white p-8 text-center rounded-lg shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h1 className="text-2xl font-bold text-[#1B242C]">{accessDenied ? w("Accès refusé", "Access denied") : w("Chargement temporairement impossible", "Temporarily unable to load")}</h1>
          <p className="mt-3 text-sm text-[#5B6B76]">
            {accessDenied
              ? w("Ce compte n’est pas autorisé à accéder à l’espace collaborateur Somiren.", "This account is not authorized to access the Somiren collaborator workspace.")
              : error?.message ? localizeApiMessage(error.message, lang) : w("Impossible de charger votre espace. Veuillez réessayer.", "Unable to load your workspace. Please try again.")}
          </p>
          {!accessDenied && (
            <button type="button" onClick={() => void refetch()} className="mt-6 mr-3 px-5 py-2.5 text-sm font-semibold border rounded-md">
              {w("Réessayer", "Try again")}
            </button>
          )}
          <button
            type="button"
            onClick={() => void logout().then(() => { window.location.href = "/"; }).catch((error) => toast.error(error instanceof Error ? localizeApiMessage(error.message, lang) : w("Déconnexion impossible.", "Unable to sign out.")))}
            className="mt-6 px-5 py-2.5 text-sm font-semibold text-white rounded-md transition-colors"
            style={{ background: "#0E2233" }}
          >
            {w("Se déconnecter", "Sign out")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sr-app">
      <Topbar onOpenMobile={() => setMobileOpen(open => !open)} mobileOpen={mobileOpen} />
      <div className="sr-workspace">
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="sr-main">
          <Switch>
            <Route path="/espace-collaborateur" component={Dashboard} />
            <Route path="/espace-collaborateur/inbox"><div className="sr-route-page"><Inbox /></div></Route>
            <Route path="/espace-collaborateur/cases"><div className="sr-route-page"><Cases /></div></Route>
            <Route path="/espace-collaborateur/tasks"><div className="sr-route-page"><Tasks /></div></Route>
            <Route path="/espace-collaborateur/requests"><div className="sr-route-page"><Requests /></div></Route>
            <Route path="/espace-collaborateur/agenda"><div className="sr-route-page"><Agenda /></div></Route>
            <Route path="/espace-collaborateur/video"><div className="sr-route-page"><VideoView /></div></Route>
            <Route path="/espace-collaborateur/comms"><div className="sr-route-page"><Comms /></div></Route>
            <Route path="/espace-collaborateur/documents"><div className="sr-route-page"><Inbox /><details className="mt-6 rounded-lg bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">{w("Bibliothèque des dossiers", "Case document library")}</summary><div className="mt-4"><Documents /></div></details></div></Route>
            <Route path="/espace-collaborateur/support"><div className="sr-route-page"><Support /></div></Route>
            <Route path="/espace-collaborateur/profile"><div className="sr-route-page"><Profile /></div></Route>
            <Route path="/espace-collaborateur/notes"><div className="sr-route-page"><Notes /></div></Route>
            <Route path="/espace-collaborateur/finance"><div className="sr-route-page"><Finance /></div></Route>
            <Route path="/espace-collaborateur/contacts"><Redirect to="/espace-collaborateur" /></Route>
            <Route path="/espace-collaborateur/notifications"><div className="sr-route-page"><Notifications /></div></Route>
            <Route path="/espace-collaborateur/security"><div className="sr-route-page"><Security /></div></Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}
