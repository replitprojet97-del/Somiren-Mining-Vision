import { useState } from "react";
import { Home, Users, Folder, FileText, Briefcase, Calendar, Shield, Activity, Lock, Package } from "lucide-react";
import { Sidebar, Topbar } from "./layout";
import { C } from "./shared";
import DashboardView from "./DashboardView";
import UsersView from "./UsersView";
import CasesView from "./CasesView";
import SendDocumentView from "./SendDocumentView";
import RequestsView from "./RequestsView";
import MeetingsView from "./MeetingsView";
import PermissionsView from "./PermissionsView";
import ActivityView from "./ActivityView";
import SecurityView from "./SecurityView";
import ShipmentsView from "./ShipmentsView";

const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: Home },
  { id: "users", label: "Collaborateurs", icon: Users },
  { id: "cases", label: "Dossiers", icon: Folder },
  { id: "documents", label: "Envoyer un document", icon: FileText },
  { id: "requests", label: "Demandes de la Direction", icon: Briefcase },
  { id: "meetings", label: "Réunions", icon: Calendar },
  { id: "shipments", label: "Suivi des envois", icon: Package },
  { id: "permissions", label: "Rôles & Permissions", icon: Shield },
  { id: "activity", label: "Journal d'activité", icon: Activity },
  { id: "security", label: "Sécurité", icon: Lock },
];

export default function AdminShell({ profile, onLogout }: any) {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderContent = () => {
    switch (active) {
      case "dashboard": return <DashboardView go={setActive} />;
      case "users": return <UsersView />;
      case "cases": return <CasesView />;
      case "documents": return <SendDocumentView />;
      case "requests": return <RequestsView />;
      case "meetings": return <MeetingsView />;
      case "shipments": return <ShipmentsView />;
      case "permissions": return <PermissionsView />;
      case "activity": return <ActivityView />;
      case "security": return <SecurityView />;
      default: return <DashboardView go={setActive} />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full font-sans" style={{ background: C.bg, color: C.ink }}>
      <Sidebar 
        nav={NAV} 
        active={active} 
        setActive={setActive} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        <Topbar 
          onOpenMobile={() => setMobileOpen(true)} 
          label={NAV.find(n => n.id === active)?.label || "Administration"} 
          profile={profile}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto pb-10">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
