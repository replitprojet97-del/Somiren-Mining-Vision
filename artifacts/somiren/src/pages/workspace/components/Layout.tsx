import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Folder, CheckSquare, Calendar, Video,
  MessageSquare, FileText, Brain, Users, Bell, Shield,
  Menu, X, Clock, ChevronDown, LogOut,
} from "lucide-react";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { useNotifications } from "@/hooks/use-workspace";
import { useProfilePhoto } from "@/hooks/use-profile-photo";
import { toast } from "sonner";

type NavItem = {
  id: string;
  label: string;
  icon: typeof Home;
  href: string;
  permission?: string | string[];
};

const NAV: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: Home, href: "/espace-collaborateur" },
  { id: "cases", label: "Mes dossiers", icon: Folder, href: "/espace-collaborateur/cases", permission: "VIEW_ASSIGNED_CASES" },
  { id: "documents", label: "Documents reçus", icon: FileText, href: "/espace-collaborateur/documents", permission: "VIEW_ASSIGNED_DOCUMENTS" },
  { id: "tasks", label: "Mes tâches", icon: CheckSquare, href: "/espace-collaborateur/tasks", permission: "VIEW_ASSIGNED_TASKS" },
  { id: "agenda", label: "Agenda & Réunions", icon: Calendar, href: "/espace-collaborateur/agenda", permission: "PARTICIPATE_IN_MEETINGS" },
  { id: "video", label: "Visioconférences", icon: Video, href: "/espace-collaborateur/video", permission: "CAN_USE_VIDEO_CONFERENCE" },
  { id: "comms", label: "Messages & Audios", icon: MessageSquare, href: "/espace-collaborateur/comms", permission: "USE_INTERNAL_MESSAGING" },
  { id: "notes", label: "Notes stratégiques", icon: Brain, href: "/espace-collaborateur/notes" },
  { id: "contacts", label: "Contacts", icon: Users, href: "/espace-collaborateur/contacts" },
  { id: "security", label: "Sécurité & Sessions", icon: Shield, href: "/espace-collaborateur/security" },
];

function visibleNavigation(permissions: string[]) {
  return NAV.filter(item => !item.permission || (Array.isArray(item.permission)
    ? item.permission.some(permission => permissions.includes(permission))
    : permissions.includes(item.permission)));
}

const parisDate = (date: Date) => new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
}).format(date);

const parisTime = (date: Date) => new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Paris",
}).format(date);

const parisOffset = (date: Date) => new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris", timeZoneName: "longOffset",
}).formatToParts(date).find(part => part.type === "timeZoneName")?.value.replace("GMT", "UTC") ?? "UTC";

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const [location] = useLocation();
  const { logout, profile } = useWorkspaceAuth();
  const drawerRef = useRef<HTMLElement>(null);
  const navItems = visibleNavigation(profile?.permissions ?? []);
  const active = navItems.find(item => item.href === location || (item.href !== "/espace-collaborateur" && location.startsWith(item.href)))?.id || "dashboard";

  useEffect(() => {
    if (mobileOpen) drawerRef.current?.querySelector<HTMLElement>("a")?.focus();
  }, [mobileOpen]);

  const handleDrawerKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setMobileOpen(false);
      return;
    }
    if (event.key !== "Tab" || !drawerRef.current) return;
    const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)")];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {mobileOpen && (
        <button
          className="sr-scrim"
          type="button"
          aria-label="Fermer le menu de navigation"
          onClick={() => setMobileOpen(false)}
          data-testid="button-close-navigation-scrim"
        />
      )}
      <aside
        ref={drawerRef}
        id="workspace-navigation"
        className={`sr-sidebar${mobileOpen ? " sr-open" : ""}`}
        aria-label="Navigation de l’espace collaborateur"
        aria-modal={mobileOpen || undefined}
        role={mobileOpen ? "dialog" : undefined}
        onKeyDown={handleDrawerKeyDown}
      >
        <button className="sr-mobile-drawer-close" type="button" onClick={() => setMobileOpen(false)} data-testid="button-close-navigation">
          Fermer le menu <X size={16} aria-hidden="true" />
        </button>
        <nav aria-label="Sections de l’espace">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.href} asChild onClick={() => setMobileOpen(false)}>
                <a
                  className={`sr-nav-item${active === item.id ? " sr-active" : ""}`}
                  aria-current={active === item.id ? "page" : undefined}
                  data-testid={`link-workspace-${item.id}`}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="sr-side-bottom">
          <div className="sr-connected"><i aria-hidden="true" />Connectée</div>
          <Link href="/espace-collaborateur/support" asChild>
            <a className="sr-support" onClick={() => setMobileOpen(false)} data-testid="link-workspace-support">
              <Users size={17} aria-hidden="true" />Aide &amp; Support
            </a>
          </Link>
          <button
            className="sr-logout"
            type="button"
            onClick={() => void logout().then(() => { window.location.href = "/"; }).catch(error => toast.error(error instanceof Error ? error.message : "Déconnexion impossible."))}
            data-testid="button-workspace-logout"
          >
            <LogOut size={16} aria-hidden="true" />Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}

export function Topbar({ onOpenMobile, mobileOpen }: { onOpenMobile: () => void; mobileOpen: boolean }) {
  const { profile } = useWorkspaceAuth();
  const { data: notifications, isError: notificationsError } = useNotifications(profile?.permissions.includes("workspace:read") ?? false);
  const [location, setLocation] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const navItems = visibleNavigation(profile?.permissions ?? []);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);
  const unread = notifications?.filter((notification: any) => !notification.isRead) ?? [];
  const activeLabel = navItems.find(item => item.href === location || (item.href !== "/espace-collaborateur" && location.startsWith(item.href)))?.label || "Tableau de bord";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (wasMobileOpen.current && !mobileOpen) menuButtonRef.current?.focus();
    wasMobileOpen.current = mobileOpen;
  }, [mobileOpen]);

  useEffect(() => {
    if (!profileOpen && !noticeOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNoticeOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [profileOpen, noticeOpen]);

  const initials = profile?.fullName?.trim().split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toLocaleUpperCase("fr-FR") || "U";
  const profilePhoto = useProfilePhoto();
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  return (
    <header className="sr-top">
      <button
        ref={menuButtonRef}
        className="sr-mobile-menu"
        type="button"
        aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={mobileOpen}
        aria-controls="workspace-navigation"
        onClick={onOpenMobile}
        data-testid="button-open-navigation"
      >
        {mobileOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
      </button>
      <Link href="/espace-collaborateur" asChild>
        <a className="sr-brand" aria-label="Somiren — tableau de bord collaborateur" data-testid="link-workspace-home">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
          <span><b>SOMIREN S.A.</b><small>EXCELLENCE MINIÈRE, AVENIR DURABLE</small></span>
        </a>
      </Link>
      <div className="sr-top-tools">
        <div className="sr-date"><Calendar size={16} aria-hidden="true" /><span>{parisDate(now)}</span></div>
        <i aria-hidden="true" />
        <div className="sr-time"><Clock size={14} aria-hidden="true" />{parisTime(now)} ({parisOffset(now)})</div>
        <i aria-hidden="true" />
        <span className="sr-locale" aria-label="Langue française"><span className="sr-flag" aria-hidden="true" />FR</span>
        <i aria-hidden="true" />
        <div className="sr-relative">
          <button
            className="sr-icon-btn"
            type="button"
            aria-label={`Notifications${unread.length ? `, ${unread.length} non lue${unread.length > 1 ? "s" : ""}` : ""}`}
            aria-expanded={noticeOpen}
            onClick={() => { setNoticeOpen(!noticeOpen); setProfileOpen(false); }}
            data-testid="button-header-notifications"
          >
            <Bell size={18} aria-hidden="true" />
            {unread.length > 0 && <em aria-hidden="true">{unread.length > 99 ? "99+" : unread.length}</em>}
          </button>
          {noticeOpen && (
            <div className="sr-popover sr-notice-pop" role="region" aria-label="Notifications récentes">
              <b>Notifications</b>
              {notificationsError ? <span role="status">Impossible de charger les notifications.</span> : unread.length ? unread.slice(0, 3).map((item: any) => <span key={item.id}><b>{item.title || "Notification"}</b>: {item.body || "Consultez le détail de cette notification."}</span>) : <span>Aucune notification non lue.</span>}
              <button type="button" onClick={() => { setNoticeOpen(false); setLocation("/espace-collaborateur/notifications"); }} data-testid="button-view-all-notifications">Voir toutes les notifications</button>
            </div>
          )}
        </div>
        <div className="sr-relative">
          <button
            className="sr-user"
            type="button"
            aria-expanded={profileOpen}
            aria-label={`Profil de ${profile?.fullName || "l’utilisateur"}`}
            onClick={() => { setProfileOpen(!profileOpen); setNoticeOpen(false); }}
            data-testid="button-header-profile"
          >
            <span className="sr-user-avatar" aria-hidden="true">{profilePhoto.photo?.url && profilePhoto.photo.url !== failedAvatar ? <img src={profilePhoto.photo.url} alt="" onError={() => setFailedAvatar(profilePhoto.photo?.url ?? null)} className="h-full w-full rounded-full object-cover" /> : initials}</span>
            <span className="sr-user-copy"><b>{profile?.fullName || "Collaborateur"}</b><small>{profile?.role || ""}</small></span>
            <ChevronDown size={12} aria-hidden="true" />
          </button>
          {profileOpen && (
            <div className="sr-popover sr-profile-pop" role="menu" aria-label="Menu du profil">
              <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); setLocation("/espace-collaborateur/profile"); }} data-testid="button-profile-photo">Mon profil &amp; ma photo</button>
              <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); setLocation("/espace-collaborateur/security"); }} data-testid="button-profile-security">Sécurité &amp; Sessions</button>
            </div>
          )}
        </div>
      </div>
      <span className="sr-mobile-page-title">{activeLabel}</span>
    </header>
  );
}