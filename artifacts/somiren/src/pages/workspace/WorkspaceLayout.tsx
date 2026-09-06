import { useState } from "react";
import { useLocation, Link, Route, Switch } from "wouter";
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  FileText, 
  Bell, 
  User, 
  Video,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useClerk } from "@clerk/react";
import { useMe } from "@/hooks/use-workspace";
import { AlertCircle, Loader2 } from "lucide-react";

import DashboardOverview from "./DashboardOverview";
import DossiersView from "./DossiersView";
import TasksView from "./TasksView";
import DocumentsView from "./DocumentsView";
import NotificationsView from "./NotificationsView";
import ProfileView from "./ProfileView";
import VideoView from "./VideoView";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function WorkspaceLayout() {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: me, isLoading, error } = useMe();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Vérification de l'accès" />
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-lg border border-destructive/30 bg-card p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="font-serif text-2xl font-bold">Accès refusé</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Ce compte n’est pas autorisé à accéder à l’espace collaborateur Somiren.
          </p>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="mt-6 bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }
  
  // Extract just the nested part
  const activeTab = location.replace(/^\/espace-collaborateur\/?/, "") || "dashboard";

  const navItems = [
    { id: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, href: "/espace-collaborateur" },
    { id: "dossiers", label: "Dossiers (Priorité)", icon: Briefcase, href: "/espace-collaborateur/dossiers" },
    { id: "taches", label: "Tâches & Instructions", icon: CheckSquare, href: "/espace-collaborateur/taches" },
    { id: "documents", label: "Documents", icon: FileText, href: "/espace-collaborateur/documents" },
    { id: "notifications", label: "Notifications", icon: Bell, href: "/espace-collaborateur/notifications" },
    { id: "profil", label: "Mon Profil", icon: User, href: "/espace-collaborateur/profil" },
    { id: "video", label: "Visioconférence", icon: Video, href: "/espace-collaborateur/video" },
  ];

  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden absolute top-4 left-4 z-50">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-card border border-border rounded-md text-foreground"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-6 border-b border-border flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <img src={`${basePath}/logo.svg`} alt="Somiren" className="w-8 h-8" />
            <span className="text-xl font-bold tracking-wider text-primary">SOMIREN</span>
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Espace Collaborateur
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/espace-collaborateur" && location.startsWith(item.href));
            
            return (
              <Link key={item.id} href={item.href} onClick={() => setSidebarOpen(false)}>
                <div className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors
                  ${isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"}
                `}>
                  <Icon size={18} />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="h-full overflow-y-auto p-4 lg:p-8 pt-16 lg:pt-8 bg-background">
          <Switch>
            <Route path="/espace-collaborateur" component={DashboardOverview} />
            <Route path="/espace-collaborateur/dossiers" component={DossiersView} />
            <Route path="/espace-collaborateur/taches" component={TasksView} />
            <Route path="/espace-collaborateur/documents" component={DocumentsView} />
            <Route path="/espace-collaborateur/notifications" component={NotificationsView} />
            <Route path="/espace-collaborateur/profil" component={ProfileView} />
            <Route path="/espace-collaborateur/video" component={VideoView} />
          </Switch>
        </div>
      </main>
    </div>
  );
}
