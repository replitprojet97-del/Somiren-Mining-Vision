import "./_group.css";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Brain,
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  DollarSign,
  FileText,
  Folder,
  Globe,
  Home,
  Inbox,
  LogOut,
  Menu,
  MessageSquare,
  Shield,
  Users,
  Video,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const C = {
  navy: "#0E2233",
  navySoft: "#16324A",
  navyLine: "#25445F",
  copper: "#B4713B",
  copperSoft: "#F4E9DE",
  bg: "#F3F5F7",
  card: "#FFFFFF",
  line: "#E3E7EB",
  ink: "#1B242C",
  inkSoft: "#5B6B76",
  inkFaint: "#8A98A2",
  red: "#B3432E",
  redBg: "#FBEAE6",
  amber: "#9C6B15",
  amberBg: "#FBF1DE",
  green: "#2F6B4F",
  greenBg: "#E8F2ED",
  blue: "#2E5C8A",
  blueBg: "#E9F0F7",
};

type IconComponent = ComponentType<{
  size?: number;
  className?: string;
  color?: string;
}>;

type NavItem = {
  id: string;
  label: string;
  icon: IconComponent;
  href: string;
};

const NAV: NavItem[] = [
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

const MOCK_PROFILE = {
  fullName: "Nuria Molero Rodriguez",
  role: "Assistante exécutive & Conseillère stratégique",
};

// Sandbox-only stand-ins for useDashboard, useReceivedDocuments, useMeetings,
// useNotes, useFinanceSummary, useArrears, and usePaymentRequirements.
const MOCK_DASHBOARD = {
  urgentCases: [{ id: 1 }, { id: 2 }],
  counts: { cases: 1 },
  todayWork: [],
};
const MOCK_RECEIVED_DOCUMENTS = [
  {
    assignment: {
      id: 1,
      createdAt: "2026-09-10T08:40:00",
      priority: "Nouveau",
    },
    document: { title: "Note de synthèse — Réunion de la Direction générale" },
  },
  {
    assignment: {
      id: 2,
      createdAt: "2026-09-10T08:15:00",
      priority: "Haute",
    },
    document: { title: "Dossier de préparation — Comité stratégique" },
  },
];
const MOCK_MEETINGS: Array<{ id: number; title: string; startsAt: string; mode?: string }> = [];
const MOCK_NOTES: Array<{ id: number; title: string; updatedAt: string; isShared: boolean }> = [];
const MOCK_FINANCE_SUMMARY = {
  lastPaymentStatus: "Versé",
  lastPaymentAmount: 285000,
  lastPaymentDate: "2026-09-01T00:00:00",
  currency: "EUR",
};
const MOCK_ARREARS: Array<{
  id: number;
  period: string;
  amount: number;
  currency?: string;
  status: string;
  reason?: string;
}> = [];
const MOCK_REQUIREMENTS: Array<{ id: number; title: string; status: string }> = [];

function Pill({ tone = "neutral", children }: { tone?: string; children: ReactNode }) {
  const tones: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: "#EEF1F3", fg: C.inkSoft },
    haute: { bg: C.redBg, fg: C.red },
    moyenne: { bg: C.amberBg, fg: C.amber },
    basse: { bg: C.greenBg, fg: C.green },
    info: { bg: C.blueBg, fg: C.blue },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{ background: t.bg, color: t.fg }}
      className="text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap"
    >
      {children}
    </span>
  );
}

function priorityTone(priority: string) {
  if (priority === "Haute" || priority === "urgent" || priority === "high") return "haute";
  if (priority === "Moyenne" || priority === "normal") return "moyenne";
  if (priority === "Basse" || priority === "low") return "basse";
  return "neutral";
}

function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-lg ${className}`} style={{ border: `1px solid ${C.line}` }}>
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${C.line}` }}
      >
        <h3 className="text-[15px] font-semibold" style={{ color: C.ink }}>{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function LinkAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-sm font-medium flex items-center gap-1 hover:underline"
      style={{ color: C.copper }}
    >
      {children} <ArrowRight size={14} />
    </button>
  );
}

function EmptyState({ icon: Icon, text }: { icon: IconComponent; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center" style={{ color: C.inkFaint }}>
      <Icon size={28} className="mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  tone: "red" | "blue" | "green" | "amber" | "copper";
  onClick: () => void;
}) {
  const tones = {
    red: { bg: C.redBg, fg: C.red },
    blue: { bg: C.blueBg, fg: C.blue },
    green: { bg: C.greenBg, fg: C.green },
    amber: { bg: C.amberBg, fg: C.amber },
    copper: { bg: C.copperSoft, fg: C.copper },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg p-4 text-left flex flex-col gap-3 hover:shadow-sm transition-shadow"
      style={{ border: `1px solid ${C.line}` }}
    >
      <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: t.bg }}>
        <Icon size={17} color={t.fg} />
      </div>
      <div>
        <p className="text-2xl font-semibold" style={{ color: C.ink }}>{value}</p>
        <p className="text-[13px]" style={{ color: C.inkSoft }}>{label}</p>
      </div>
    </button>
  );
}

function Dashboard({ go }: { go: (path: string) => void }) {
  const dashboard = MOCK_DASHBOARD;
  const receivedDocs = MOCK_RECEIVED_DOCUMENTS;
  const meetings = MOCK_MEETINGS;
  const notes = MOCK_NOTES;
  const financeSummary = MOCK_FINANCE_SUMMARY;
  const arrears = MOCK_ARREARS;
  const requirements = MOCK_REQUIREMENTS;

  const urgentCasesCount = dashboard.urgentCases?.length || 0;
  const docsCount = receivedDocs?.length || 0;
  const casesCount = dashboard.counts?.cases || 0;
  const meetingsCount = meetings?.length || 0;
  const currentStatus = financeSummary?.lastPaymentStatus || "En attente";

  return (
    <div className="space-y-5">
      <div className="rounded-lg overflow-hidden relative bg-white" style={{ border: `1px solid ${C.line}` }}>
        <div className="p-6 md:p-7 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gray-200 hidden sm:flex items-center justify-center font-bold text-xl text-gray-600">
            {MOCK_PROFILE.fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold" style={{ color: C.ink }}>
              Bonjour {MOCK_PROFILE.fullName.split(" ")[0]},
            </h1>
            <p className="text-sm mt-0.5" style={{ color: C.inkSoft }}>{MOCK_PROFILE.role}</p>
            <p className="text-sm italic mt-2" style={{ color: C.copper }}>
              « Anticiper, coordonner, faciliter les décisions. »
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard icon={AlertCircle} label="À traiter" value={urgentCasesCount} tone="red" onClick={() => go("requests")} />
        <StatCard icon={FileText} label="Documents reçus" value={docsCount} tone="blue" onClick={() => go("inbox")} />
        <StatCard icon={Folder} label="Dossiers en cours" value={casesCount} tone="green" onClick={() => go("cases")} />
        <StatCard icon={Calendar} label="Réunions aujourd'hui" value={meetingsCount} tone="amber" onClick={() => go("agenda")} />
        <StatCard
          icon={DollarSign}
          label="Situation financière"
          value={currentStatus}
          tone={currentStatus === "Versé" ? "green" : "amber"}
          onClick={() => go("finance")}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Documents reçus" action={<LinkAction onClick={() => go("inbox")}>Voir tout</LinkAction>}>
          <div className="space-y-3">
            {!receivedDocs?.length && <p className="text-sm text-gray-500">Aucun document reçu.</p>}
            {receivedDocs?.slice(0, 3).map((document) => (
              <div
                key={document.assignment.id}
                className="flex items-start justify-between gap-3 pb-3"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: C.ink }}>{document.document.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>
                    {format(new Date(document.assignment.createdAt), "dd MMM, HH:mm", { locale: fr })}
                  </p>
                </div>
                <Pill tone={priorityTone(document.assignment.priority || "normal")}>
                  {document.assignment.priority || "Normal"}
                </Pill>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Prochaines réunions" action={<LinkAction onClick={() => go("agenda")}>Voir l'agenda</LinkAction>}>
          <div className="space-y-3">
            {!meetings?.length && <p className="text-sm text-gray-500">Aucune réunion prévue.</p>}
            {meetings?.map((meeting) => (
              <div
                key={meeting.id}
                className="flex items-center justify-between gap-3 pb-3"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: C.ink }}>{meeting.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>
                    {format(new Date(meeting.startsAt), "HH:mm")} - {meeting.mode || "En ligne"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Mes tâches" action={<LinkAction onClick={() => go("tasks")}>Voir tout</LinkAction>}>
          <div className="space-y-3">
            {!dashboard.todayWork?.length && <p className="text-sm text-gray-500">Aucune tâche pour aujourd'hui.</p>}
            {dashboard.todayWork?.slice(0, 4).map((task: any) => (
              <div key={task.id} className="flex items-center gap-3">
                <Circle size={15} style={{ color: C.inkFaint }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate" style={{ color: C.ink }}>{task.title}</p>
                  <p className="text-[12px]" style={{ color: C.inkSoft }}>
                    {task.dueAt ? format(new Date(task.dueAt), "dd MMM yyyy", { locale: fr }) : "Sans échéance"}
                  </p>
                </div>
                <Pill tone={priorityTone(task.priority || "normal")}>{task.priority || "Normal"}</Pill>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Notes stratégiques" action={<LinkAction onClick={() => go("notes")}>Voir tout</LinkAction>}>
          <div className="space-y-3">
            {!notes?.length && <p className="text-sm text-gray-500">Aucune note.</p>}
            {notes?.slice(0, 4).map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between gap-3 pb-3"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: C.ink }}>{note.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>
                    Dernière modification : {format(new Date(note.updatedAt), "dd MMM yyyy", { locale: fr })}
                  </p>
                </div>
                <Pill tone={note.isShared ? "info" : "neutral"}>{note.isShared ? "Partagée" : "Privée"}</Pill>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Ma situation financière" action={<LinkAction onClick={() => go("finance")}>Voir le détail</LinkAction>}>
          <div className="space-y-4">
            {!financeSummary ? (
              <EmptyState icon={DollarSign} text="Aucune donnée financière disponible." />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>Dernier paiement</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: C.ink }}>
                    {financeSummary.lastPaymentAmount ? financeSummary.lastPaymentAmount.toLocaleString() : "0"} {financeSummary.currency || "EUR"}
                  </p>
                  <p className="text-[12px]" style={{ color: C.inkSoft }}>
                    {financeSummary.lastPaymentDate ? format(new Date(financeSummary.lastPaymentDate), "dd MMM yyyy", { locale: fr }) : "N/A"}
                  </p>
                </div>
                <Pill tone="basse">Versé</Pill>
              </div>
            )}
            {requirements && requirements.length > 0 && (
              <div>
                <p className="text-[12.5px] font-medium" style={{ color: C.ink }}>Exigences à remplir</p>
                {requirements.map((requirement) => (
                  <div key={requirement.id} className="flex items-center justify-between gap-3 mt-2">
                    <span className="text-[12px]" style={{ color: C.inkSoft }}>{requirement.title}</span>
                    <Pill tone={requirement.status === "pending" ? "haute" : "info"}>{requirement.status}</Pill>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Arriérés" action={<LinkAction onClick={() => go("finance")}>Voir le détail</LinkAction>}>
          {arrears && arrears.length ? arrears.map((arrear) => (
            <div key={arrear.id} className="p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: C.ink }}>{arrear.period}</p>
                  <p className="text-[12px] mt-1" style={{ color: C.inkSoft }}>
                    {arrear.amount.toLocaleString()} {arrear.currency || "EUR"}
                  </p>
                </div>
                <Pill tone="haute">{arrear.status}</Pill>
              </div>
              {arrear.reason && (
                <p className="text-[12px] mt-3" style={{ color: C.inkSoft }}>
                  <strong>Motif communiqué :</strong> {arrear.reason}
                </p>
              )}
            </div>
          )) : <EmptyState icon={DollarSign} text="Aucun arriéré." />}
        </SectionCard>
      </div>

      <SectionCard title="Visioconférence" action={<LinkAction onClick={() => go("video")}>Voir mes réunions</LinkAction>}>
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.copperSoft }}>
            <Video size={22} color={C.copper} />
          </div>
          <p className="text-sm" style={{ color: C.inkSoft }}>Rejoignez vos réunions programmées en un clic.</p>
          <button
            onClick={() => go("video")}
            className="px-4 py-2 rounded-md text-sm font-medium text-white"
            style={{ background: C.navy }}
          >
            Voir mes réunions
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  location,
  onNavigate,
}: {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  location: string;
  onNavigate: (path: string) => void;
}) {
  const active = NAV.find((item) =>
    item.href === location || (item.href !== "/espace-collaborateur" && location.startsWith(item.href))
  )?.id || "dashboard";

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
        <div className="flex items-center gap-3 px-5 h-16 shrink-0" style={{ borderBottom: `1px solid ${C.navyLine}` }}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 overflow-hidden bg-white/10 p-1">
            <img src="/__mockup/images/somiren-reference/logo.svg" alt="Somiren" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate tracking-wider">SOMIREN</p>
              <p className="text-[11px] leading-tight truncate uppercase tracking-widest" style={{ color: "#8FA6B8" }}>
                Espace Collaborateur
              </p>
            </div>
          )}
          <button className="ml-auto md:hidden" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
            <X size={18} color="#8FA6B8" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(item.href);
                  setMobileOpen(false);
                }}
                className="block no-underline"
              >
                <div
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
              </a>
            );
          })}
        </nav>

        <div className="px-4 py-4 space-y-2.5" style={{ borderTop: `1px solid ${C.navyLine}` }}>
          {!collapsed ? (
            <div className="flex items-center gap-2 text-[13px]" style={{ color: "#CFE0D2" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#3FA66C" }} />
              Connecté(e)
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2 h-2 rounded-full" style={{ background: "#3FA66C" }} />
            </div>
          )}
          <button
            onClick={() => undefined}
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
          aria-label={collapsed ? "Développer le menu" : "Réduire le menu"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </aside>
    </>
  );
}

function Topbar({
  location,
  onNavigate,
  onOpenMobile,
}: {
  location: string;
  onNavigate: (path: string) => void;
  onOpenMobile: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeLabel = NAV.find((item) =>
    item.href === location || (item.href !== "/espace-collaborateur" && location.startsWith(item.href))
  )?.label || "Tableau de bord";

  return (
    <header
      className="h-16 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white"
      style={{ borderBottom: `1px solid ${C.line}` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button className="md:hidden" onClick={onOpenMobile} aria-label="Ouvrir le menu">
          <Menu size={20} color={C.ink} />
        </button>
        <div className="hidden md:flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
          <Calendar size={15} />
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
        <span className="md:hidden text-[15px] font-semibold truncate" style={{ color: C.ink }}>
          {activeLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <button className="hidden sm:flex items-center gap-1.5 text-sm px-2 py-1 rounded-md" style={{ color: C.inkSoft }}>
          <Globe size={15} /> FR
        </button>
        <a
          href="/espace-collaborateur/notifications"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/espace-collaborateur/notifications");
          }}
        >
          <div className="relative cursor-pointer">
            <Bell size={19} color={C.inkSoft} />
          </div>
        </a>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
              {MOCK_PROFILE.fullName.charAt(0) || "U"}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{MOCK_PROFILE.fullName}</p>
              <p className="text-[11.5px]" style={{ color: C.inkSoft }}>{MOCK_PROFILE.role}</p>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg py-1.5 z-20" style={{ border: `1px solid ${C.line}` }}>
              <a
                href="/espace-collaborateur/security"
                onClick={(event) => {
                  event.preventDefault();
                  setMenuOpen(false);
                  onNavigate("/espace-collaborateur/security");
                }}
                className="block no-underline"
              >
                <div className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer" style={{ color: C.ink }}>
                  Sécurité & Sessions
                </div>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function Current() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location, setLocation] = useState("/espace-collaborateur");

  const go = (path: string) => setLocation(`/espace-collaborateur/${path}`);
  const navigate = (path: string) => setLocation(path);

  return (
    <div className="somiren-reference min-h-screen">
      <div className="flex h-[100dvh] w-full bg-[#F3F5F7] font-sans text-[#1B242C] overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          location={location}
          onNavigate={navigate}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            location={location}
            onNavigate={navigate}
            onOpenMobile={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-[1200px] mx-auto">
              <Dashboard go={go} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}