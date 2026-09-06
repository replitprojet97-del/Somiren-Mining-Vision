import { useState } from "react";
import { Route, Switch } from "wouter";
import { useMe } from "@/hooks/use-workspace";
import { AlertCircle, Loader2 } from "lucide-react";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";

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
import Contacts from "./Contacts";
import Notifications from "./Notifications";
import Security from "./Security";

export default function WorkspaceLayout() {
  const { logout } = useWorkspaceAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: me, isLoading, error } = useMe();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F3F5F7]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#B4713B" }} />
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F3F5F7] px-4">
        <div className="w-full max-w-lg border border-red-200 bg-white p-8 text-center rounded-lg shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h1 className="text-2xl font-bold text-[#1B242C]">Accès refusé</h1>
          <p className="mt-3 text-sm text-[#5B6B76]">
            Ce compte n’est pas autorisé à accéder à l’espace collaborateur Somiren.
          </p>
          <button
            type="button"
            onClick={() => void logout().then(() => { window.location.href = "/"; })}
            className="mt-6 px-5 py-2.5 text-sm font-semibold text-white rounded-md transition-colors"
            style={{ background: "#0E2233" }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#F3F5F7] font-sans text-[#1B242C] overflow-hidden">
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[1200px] mx-auto">
            <Switch>
              <Route path="/espace-collaborateur" component={Dashboard} />
              <Route path="/espace-collaborateur/inbox" component={Inbox} />
              <Route path="/espace-collaborateur/cases" component={Cases} />
              <Route path="/espace-collaborateur/tasks" component={Tasks} />
              <Route path="/espace-collaborateur/requests" component={Requests} />
              <Route path="/espace-collaborateur/agenda" component={Agenda} />
              <Route path="/espace-collaborateur/video" component={VideoView} />
              <Route path="/espace-collaborateur/comms" component={Comms} />
              <Route path="/espace-collaborateur/documents" component={Documents} />
              <Route path="/espace-collaborateur/notes" component={Notes} />
              <Route path="/espace-collaborateur/finance" component={Finance} />
              <Route path="/espace-collaborateur/contacts" component={Contacts} />
              <Route path="/espace-collaborateur/notifications" component={Notifications} />
              <Route path="/espace-collaborateur/security" component={Security} />
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}
