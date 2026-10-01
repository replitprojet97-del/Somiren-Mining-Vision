import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Folder, CheckSquare, Calendar, Video, DollarSign,
  MessageSquare, FileText, Brain, Users, Bell, Shield,
  Menu, X, Clock, ChevronDown, LogOut, UserRound,
} from "lucide-react";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { useNotifications, useReceivedDocuments } from "@/hooks/use-workspace";
import { useUnreadMessageCount } from "@/hooks/use-message-read";
import { useProfilePhoto } from "@/hooks/use-profile-photo";
import { toast } from "sonner";
import { workspaceRoleLabel } from "@/lib/workspace-role";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/lib/api-error";
import { localizeWorkspaceNotification } from "@/lib/workspace-notifications";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  { id: "video", label: "Visioconférences", icon: Video, href: "/espace-collaborateur/video" },
  { id: "comms", label: "Messages & Audios", icon: MessageSquare, href: "/espace-collaborateur/comms", permission: "USE_INTERNAL_MESSAGING" },
  { id: "finance", label: "Ma situation financière", icon: DollarSign, href: "/espace-collaborateur/finance" },
  { id: "notes", label: "Notes stratégiques", icon: Brain, href: "/espace-collaborateur/notes" },
  { id: "security", label: "Sécurité & Sessions", icon: Shield, href: "/espace-collaborateur/security" },
];

function visibleNavigation(permissions: string[]) {
  return NAV.filter(item => !item.permission || (Array.isArray(item.permission)
    ? item.permission.some(permission => permissions.includes(permission))
    : permissions.includes(item.permission)));
}

const EN_NAV: Record<string, string> = {
  dashboard: "Dashboard", cases: "My Cases", documents: "Received Documents",
  tasks: "My Tasks", agenda: "Calendar & Meetings", video: "Video Conferences",
  comms: "Messages & Audio", finance: "My Financial Overview",
  notes: "Strategic Notes", security: "Security & Sessions",
};

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const { w, lang } = useWorkspaceLocale();
  const [location] = useLocation();
  const { logout, profile } = useWorkspaceAuth();
  const permissions = profile?.permissions ?? [];
  const canViewDocuments = permissions.includes("VIEW_ASSIGNED_DOCUMENTS");
  const canUseMessaging = permissions.includes("USE_INTERNAL_MESSAGING");
  const documents = useReceivedDocuments(canViewDocuments);
  const messages = useUnreadMessageCount(canUseMessaging);
  const pendingDocuments = canViewDocuments && !documents.isError
    ? (documents.data ?? []).filter((item: any) => item.assignment.status !== "completed").length : 0;
  const unreadMessages = canUseMessaging && !messages.isError ? messages.data ?? 0 : 0;
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
          aria-label={w("Fermer le menu de navigation", "Close navigation menu")}
          onClick={() => setMobileOpen(false)}
          data-testid="button-close-navigation-scrim"
        />
      )}
      <aside
        ref={drawerRef}
        id="workspace-navigation"
        className={`sr-sidebar${mobileOpen ? " sr-open" : ""}`}
        aria-label={w("Navigation de l’espace collaborateur", "Collaborator workspace navigation")}
        aria-modal={mobileOpen || undefined}
        role={mobileOpen ? "dialog" : undefined}
        onKeyDown={handleDrawerKeyDown}
      >
        <button className="sr-mobile-drawer-close" type="button" onClick={() => setMobileOpen(false)} data-testid="button-close-navigation">
          {w("Fermer le menu", "Close menu")} <X size={16} aria-hidden="true" />
        </button>
        <nav aria-label={w("Sections de l’espace", "Workspace sections")}>
          {navItems.map(item => {
            const Icon = item.icon;
            const count = item.id === "documents" ? pendingDocuments : item.id === "comms" ? unreadMessages : 0;
            return (
              <Link key={item.id} href={item.href} asChild onClick={() => setMobileOpen(false)}>
                <a
                  className={`sr-nav-item${active === item.id ? " sr-active" : ""}`}
                  aria-current={active === item.id ? "page" : undefined}
                  data-testid={`link-workspace-${item.id}`}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{w(item.label, EN_NAV[item.id])}</span>
                  {count > 0 && <b className="sr-nav-badge" aria-label={`${count} ${item.id === "documents" ? w("document(s) à traiter", "document(s) to process") : w("message(s) non lu(s)", "unread message(s)")}`} data-testid={`badge-workspace-${item.id}`}>{count}</b>}
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="sr-side-bottom">
          <div className="sr-connected"><i aria-hidden="true" />{w("Connectée", "Connected")}</div>
          <Link href="/espace-collaborateur/support" asChild>
            <a className="sr-support" onClick={() => setMobileOpen(false)} data-testid="link-workspace-support">
              <Users size={17} aria-hidden="true" />{w("Aide & Support", "Help & Support")}
            </a>
          </Link>
          <button
            className="sr-logout"
            type="button"
            onClick={() => void logout().then(() => { window.location.href = "/"; }).catch(error => toast.error(error instanceof Error ? localizeApiMessage(error.message, lang) : w("Déconnexion impossible.", "Unable to sign out.")))}
            data-testid="button-workspace-logout"
          >
            <LogOut size={16} aria-hidden="true" />{w("Déconnexion", "Sign out")}
          </button>
        </div>
      </aside>
    </>
  );
}

export function Topbar({ onOpenMobile, mobileOpen }: { onOpenMobile: () => void; mobileOpen: boolean }) {
  const { w, lang, setLang, locale, timeZone, formatDate } = useWorkspaceLocale();
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
  const activeItem = navItems.find(item => item.href === location || (item.href !== "/espace-collaborateur" && location.startsWith(item.href)));
  const activeLabel = activeItem ? w(activeItem.label, EN_NAV[activeItem.id]) : w("Tableau de bord", "Dashboard");
  const localTime = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const localOffset = new Intl.DateTimeFormat(locale, { timeZoneName: "longOffset" }).formatToParts(now)
    .find(part => part.type === "timeZoneName")?.value.replace("GMT", "UTC") ?? "UTC";

  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 10_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
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

  const initials = profile?.fullName?.trim().split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toLocaleUpperCase(locale) || "U";
  const profilePhoto = useProfilePhoto();
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  return (
    <header className="sr-top">
      <button
        ref={menuButtonRef}
        className="sr-mobile-menu"
        type="button"
        aria-label={mobileOpen ? w("Fermer le menu", "Close menu") : w("Ouvrir le menu", "Open menu")}
        aria-expanded={mobileOpen}
        aria-controls="workspace-navigation"
        onClick={onOpenMobile}
        data-testid="button-open-navigation"
      >
        {mobileOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
      </button>
      <Link href="/espace-collaborateur" asChild>
        <a className="sr-brand" aria-label={w("Somiren — tableau de bord collaborateur", "Somiren — collaborator dashboard")} data-testid="link-workspace-home">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
          <span><b>SOMIREN S.A.</b><small>{w("EXCELLENCE MINIÈRE, AVENIR DURABLE", "MINING EXCELLENCE, A SUSTAINABLE FUTURE")}</small></span>
        </a>
      </Link>
      <div className="sr-top-tools">
        <div className="sr-date" data-testid="workspace-local-date"><Calendar size={16} aria-hidden="true" /><span>{formatDate(now, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>
        <i aria-hidden="true" />
        <div className="sr-time" title={timeZone} data-testid="workspace-local-time"><Clock size={14} aria-hidden="true" />{localTime} ({localOffset})</div>
        <i aria-hidden="true" />
        <label className="sr-locale">
          <select className="sr-language-select" aria-label={w("Choisir la langue", "Select language")} value={lang}
            onChange={event => setLang(event.target.value === "en" ? "en" : "fr")} data-testid="select-workspace-language">
            <option value="fr">FR</option><option value="en">EN</option>
          </select>
        </label>
        <i aria-hidden="true" />
        <div className="sr-relative">
          <button
            className="sr-icon-btn"
            type="button"
            aria-label={`Notifications${unread.length ? `, ${unread.length} ${w("non lue(s)", "unread")}` : ""}`}
            aria-expanded={noticeOpen}
            onClick={() => { setNoticeOpen(!noticeOpen); setProfileOpen(false); }}
            data-testid="button-header-notifications"
          >
            <Bell size={18} aria-hidden="true" />
            {unread.length > 0 && <em aria-hidden="true">{unread.length > 99 ? "99+" : unread.length}</em>}
          </button>
          {noticeOpen && (
            <div className="sr-popover sr-notice-pop" role="region" aria-label={w("Notifications récentes", "Recent notifications")}>
              <b>Notifications</b>
              {notificationsError ? <span role="status">{w("Impossible de charger les notifications.", "Unable to load notifications.")}</span> : unread.length ? unread.slice(0, 3).map((item: any) => {
                const copy = localizeWorkspaceNotification(item, lang);
                return <span key={item.id}><b>{copy.title || "Notification"}</b>: {copy.body || w("Consultez le détail de cette notification.", "View this notification for details.")}</span>;
              }) : <span>{w("Aucune notification non lue.", "No unread notifications.")}</span>}
              <button type="button" onClick={() => { setNoticeOpen(false); setLocation("/espace-collaborateur/notifications"); }} data-testid="button-view-all-notifications">{w("Voir toutes les notifications", "View all notifications")}</button>
            </div>
          )}
        </div>
        <DropdownMenu modal={false} open={profileOpen} onOpenChange={open => { setProfileOpen(open); if (open) setNoticeOpen(false); }}>
          <DropdownMenuTrigger asChild>
          <button
            className="sr-user"
            type="button"
            aria-expanded={profileOpen}
            aria-label={`${w("Profil de", "Profile of")} ${profile?.fullName || w("l’utilisateur", "the user")}`}
            data-testid="button-header-profile"
          >
            <span className="sr-user-avatar" aria-hidden="true">{profilePhoto.photo?.url && profilePhoto.photo.url !== failedAvatar ? <img src={profilePhoto.photo.url} alt="" onError={() => setFailedAvatar(profilePhoto.photo?.url ?? null)} className="h-full w-full rounded-full object-cover" /> : initials}</span>
            <span className="sr-user-copy"><b>{profile?.fullName || w("Collaborateur", "Collaborator")}</b><small>{workspaceRoleLabel(profile?.role, lang)}</small></span>
            <ChevronDown size={12} aria-hidden="true" />
          </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={12} collisionPadding={12} className="sr-profile-menu" aria-label={w("Menu du profil", "Profile menu")}>
            <DropdownMenuLabel className="sr-profile-identity">
              <b>{profile?.fullName || w("Collaborateur", "Collaborator")}</b>
              <span>{workspaceRoleLabel(profile?.role, lang)}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="sr-profile-action" data-current={location === "/espace-collaborateur/profile"} onSelect={() => { setProfileOpen(false); setLocation("/espace-collaborateur/profile"); }} data-testid="button-profile-photo">
              <UserRound aria-hidden="true" />
              <span><b>{w("Mon profil et ma photo", "My profile and photo")}</b><small>{w("Informations personnelles et avatar", "Personal information and avatar")}</small></span>
            </DropdownMenuItem>
            <DropdownMenuItem className="sr-profile-action" data-current={location === "/espace-collaborateur/security"} onSelect={() => { setProfileOpen(false); setLocation("/espace-collaborateur/security"); }} data-testid="button-profile-security">
              <Shield aria-hidden="true" />
              <span><b>{w("Sécurité et sessions", "Security and sessions")}</b><small>{w("Authentification et appareils connectés", "Authentication and connected devices")}</small></span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="sr-mobile-page-title">{activeLabel}</span>
    </header>
  );
}