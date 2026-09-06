import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import {
  Home, Inbox, Folder, CheckSquare, Briefcase, Calendar, Video,
  MessageSquare, FileText, Brain, Users, Bell, Shield, DollarSign, ChevronLeft,
  ChevronRight, Globe, Menu, X, Clock, MapPin, LogOut
} from "lucide-react";
import { C } from "@/lib/theme";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { useMe } from "@/hooks/use-workspace";

const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: Home, href: "/espace-collaborateur" },
  { id: "inbox", label: "Dossiers reçus", icon: Inbox, href: "/espace-collaborateur/inbox" },
  { id: "cases", label: "Mes dossiers", icon: Folder, href: "/espace-collaborateur/cases" },
  { id: "tasks", label: "Mes tâches", icon: CheckSquare, href: "/espace-collaborateur/tasks" },
  { id: "requests", label: "Demandes de la Direction", icon: Briefcase, href: "/espace-collaborateur/requests" },
  { id: "agenda", label: "Agenda & Réunions", icon: Calendar, href: "/espace-collaborateur/agenda" },
  { id: "video", label: "Visioconférences", icon: Video, href: "/espace-collaborateur/video" },
  { id: "comms", label: "Communications", icon: MessageSquare, href: "/espace-collaborateur/comms" },
  { id: "documents", label: "Documents", icon: FileText, href: "/espace-collaborateur/documents" },
  { id: "notes", label: "Notes stratégiques", icon: Brain, href: "/espace-collaborateur/notes" },
  { id: "finance", label: "Ma situation financière", icon: DollarSign, href: "/espace-collaborateur/finance" },
  { id: "contacts", label: "Contacts", icon: Users, href: "/espace-collaborateur/contacts" },
  { id: "notifications", label: "Notifications", icon: Bell, href: "/espace-collaborateur/notifications" },
  { id: "security", label: "Sécurité & Sessions", icon: Shield, href: "/espace-collaborateur/security" },
];

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: any) {
  const [location] = useLocation();
  const { logout, profile } = useWorkspaceAuth();
  
  const active = NAV.find(n => n.href === location || (n.href !== "/espace-collaborateur" && location.startsWith(n.href)))?.id || "dashboard";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed md:static z-40 h-[100dvh] flex flex-col transition-all duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${collapsed ? "md:w-[76px]" : "md:w-[268px]"} w-[268px]`}
        style={{ background: C.navy }}
      >
        <div
          className="flex items-center gap-3 px-5 h-16 shrink-0"
          style={{ borderBottom: `1px solid ${C.navyLine}` }}
        >
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 overflow-hidden bg-white/10 p-1">
            <img src="/logo.svg" alt="Somiren" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate tracking-wider">SOMIREN</p>
              <p className="text-[11px] leading-tight truncate uppercase tracking-widest" style={{ color: "#8FA6B8" }}>
                Espace Collaborateur
              </p>
            </div>
          )}
          <button
            className="ml-auto md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} color="#8FA6B8" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <Link key={item.id} href={item.href}>
                <div
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors cursor-pointer"
                  style={{
                    background: isActive ? C.navySoft : "transparent",
                    color: isActive ? "white" : "#A9BAC7",
                    borderLeft: isActive ? `3px solid ${C.copper}` : "3px solid transparent",
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 space-y-2.5" style={{ borderTop: `1px solid ${C.navyLine}` }}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2 text-[13px]" style={{ color: "#CFE0D2" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#3FA66C" }} />
                Connecté(e)
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <span className="w-2 h-2 rounded-full" style={{ background: "#3FA66C" }} />
            </div>
          )}
          <button
            onClick={() => void logout().then(() => { window.location.href = "/"; })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mt-2 hover:bg-white/10 transition-colors"
            style={{ color: "#CBB7A5", background: "rgba(255,255,255,0.04)" }}
          >
            <LogOut size={16} />
            {!collapsed && "Déconnexion"}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center h-8 w-8 rounded-full absolute -right-3 top-16"
          style={{ background: C.copper, color: "white" }}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </aside>
    </>
  );
}

export function Topbar({ onOpenMobile }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const { profile } = useWorkspaceAuth();
  
  const activeLabel = NAV.find(n => n.href === location || (n.href !== "/espace-collaborateur" && location.startsWith(n.href)))?.label || "Tableau de bord";

  return (
    <header
      className="h-16 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white"
      style={{ borderBottom: `1px solid ${C.line}` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button className="md:hidden" onClick={onOpenMobile}>
          <Menu size={20} color={C.ink} />
        </button>
        <div className="hidden md:flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
          <Calendar size={15} />
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <span className="md:hidden text-[15px] font-semibold truncate" style={{ color: C.ink }}>
          {activeLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <button className="hidden sm:flex items-center gap-1.5 text-sm px-2 py-1 rounded-md" style={{ color: C.inkSoft }}>
          <Globe size={15} /> FR
        </button>
        <Link href="/espace-collaborateur/notifications">
          <div className="relative cursor-pointer">
            <Bell size={19} color={C.inkSoft} />
          </div>
        </Link>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
              {profile?.fullName?.charAt(0) || "U"}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{profile?.fullName}</p>
              <p className="text-[11.5px]" style={{ color: C.inkSoft }}>{profile?.role}</p>
            </div>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg py-1.5 z-20"
              style={{ border: `1px solid ${C.line}` }}
            >
              <Link href="/espace-collaborateur/security">
                <div onClick={() => setMenuOpen(false)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer" style={{ color: C.ink }}>Sécurité & Sessions</div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
