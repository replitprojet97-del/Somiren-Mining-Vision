import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle, Bell, BriefcaseBusiness, CalendarDays, CheckSquare, ChevronRight,
  ClipboardList, Download, FileText, Folder, Home, Lightbulb,
  MessageSquare, NotebookPen, ShieldCheck, Video,
} from "lucide-react";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { useProfilePhoto } from "@/hooks/use-profile-photo";
import {
  useArrears, useCases, useConversations, useDashboard, useFinanceSummary,
  useMeetings, useNotes, useNotifications, usePaymentRequirements, useReceivedDocuments,
  useRequests, useTasks, useVideoAccess,
} from "@/hooks/use-workspace";
import { DashboardEmpty, DashboardPanel, DashboardRestricted, parisDateTime, QueryMessage } from "./components/DashboardBits";
import "./WorkspaceReference.css";

const imagePath = (filename: string) => `${import.meta.env.BASE_URL}images/workspace-reference/${filename}`;
const roleLabel = (role?: string) => {
  if (role === "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR") return "Assistante exécutive & Conseillère stratégique";
  if (role === "ADMIN") return "Administrateur";
  if (role === "COLLABORATOR") return "Collaborateur";
  return role || "Collaborateur";
};

function initials(name?: string) {
  return name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toLocaleUpperCase("fr-FR") || "C";
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    received: "Nouveau",
    in_progress: "En cours",
    submitted: "Transmis",
    completed: "Terminé",
    active: "En cours",
    waiting: "À traiter",
    on_hold: "Suspendu",
    pending: "En attente",
    paid: "Versé",
    sent: "Versé",
    overdue: "En retard",
    accepted: "Acceptée",
    rejected: "Refusée",
  };
  return status ? labels[status.toLowerCase()] || status.replaceAll("_", " ") : "Statut non communiqué";
}

function StatCard({ icon: Icon, label, value, tone, action, onClick, isLoading, isError }: {
  icon: typeof AlertCircle;
  label: string;
  value: string | number;
  tone: string;
  action: string;
  onClick: () => void;
  isLoading?: boolean;
  isError?: boolean;
}) {
  return (
    <button className={`sr-stat sr-${tone}`} type="button" onClick={onClick} data-testid={`button-dashboard-stat-${tone}`}>
      <span className="sr-stat-icon"><Icon size={17} aria-hidden="true" /></span>
      <span className="sr-stat-name">{label}</span>
      <strong>{value}</strong>
      <small>{isError ? "Données indisponibles" : isLoading ? "Chargement…" : action}{!isError && !isLoading && <ChevronRight size={10} aria-hidden="true" />}</small>
    </button>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { profile } = useWorkspaceAuth();
  const [caseTab, setCaseTab] = useState("ACTIVE");
  const permissions = profile?.permissions ?? [];
  const can = (permission: string) => permissions.includes(permission);
  const hasWorkspaceRead = can("workspace:read");
  const canWriteWorkspace = can("workspace:write");
  const canViewDocuments = can("VIEW_ASSIGNED_DOCUMENTS");
  const canViewCases = can("VIEW_ASSIGNED_CASES");
  const canViewTasks = can("VIEW_ASSIGNED_TASKS");
  const canViewRequests = can("VIEW_EXECUTIVE_REQUESTS");
  const canParticipateInMeetings = can("PARTICIPATE_IN_MEETINGS");
  const canUseMessaging = can("USE_INTERNAL_MESSAGING");
  const canUseVideo = can("CAN_USE_VIDEO_CONFERENCE");
  const canViewFinance = can("VIEW_OWN_FINANCIAL_INFORMATION");
  const canViewArrears = can("VIEW_OWN_ARREARS");
  const canViewPaymentRequirements = can("VIEW_OWN_PAYMENT_REQUIREMENTS");
  const canSeeFinance = canViewFinance || canViewArrears || canViewPaymentRequirements;
  const dashboardQuery = useDashboard(hasWorkspaceRead);
  const documentsQuery = useReceivedDocuments(canViewDocuments);
  const meetingsQuery = useMeetings(canParticipateInMeetings);
  const notesQuery = useNotes(hasWorkspaceRead);
  const financeQuery = useFinanceSummary(canViewFinance);
  const arrearsQuery = useArrears(canViewArrears);
  const requirementsQuery = usePaymentRequirements(canViewPaymentRequirements);
  const casesQuery = useCases(canViewCases);
  const tasksQuery = useTasks(canViewTasks);
  const requestsQuery = useRequests(canViewRequests);
  const conversationsQuery = useConversations(canUseMessaging);
  const notificationsQuery = useNotifications(hasWorkspaceRead);
  const videoQuery = useVideoAccess(canUseVideo);
  const [now, setNow] = useState(() => new Date());

  const dashboard = dashboardQuery.data;
  const documents = documentsQuery.data ?? [];
  const cases = casesQuery.data ?? [];
  const tasks = tasksQuery.data ?? dashboard?.todayWork ?? [];
  const requests = requestsQuery.data ?? [];
  const meetings = meetingsQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const requirements = requirementsQuery.data ?? [];
  const arrears = arrearsQuery.data ?? [];
  const finance = canViewFinance ? financeQuery.data : undefined;
  const videoAccess = videoQuery.data;
  const taskSummaryFallback = canViewTasks && tasksQuery.isError && !dashboardQuery.isError && !dashboardQuery.isLoading;
  const profilePhoto = useProfilePhoto();
  const [failedPortrait, setFailedPortrait] = useState<string | null>(null);
  const name = profile?.fullName || "Collaborateur";
  const role = roleLabel(profile?.role);
  const matchingPortraitPersona = name.trim().toLocaleLowerCase("fr-FR") === "nuria molero rodriguez"
    && profile?.role === "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR";
  const portraitSource = profilePhoto.photo?.url || (matchingPortraitPersona && profilePhoto.referencePortrait && profilePhoto.isReady && !profilePhoto.removed
    ? imagePath("profile-reference.jpg") : null);
  const upcomingMeetings = useMemo(
    () => meetings.filter((meeting: any) => new Date(meeting.startsAt).getTime() >= now.getTime()),
    [meetings, now],
  );
  const pendingRequestCount = requests.filter((item: any) => item.status === "new").length;
  const unreadCount = notifications.filter((item: any) => !item.isRead).length;
  const visibleCases = cases.filter((item: any) => {
    if (caseTab === "ACTIVE") return item.status?.toLowerCase() === "active";
    if (caseTab === "WAITING") return item.status?.toLowerCase() === "waiting";
    if (caseTab === "COMPLETED") return item.status?.toLowerCase() === "completed";
    return item.status?.toLowerCase() !== "completed" && ["high", "urgent"].includes(item.priority?.toLowerCase());
  }).slice(0, 3);
  const go = (path: string) => setLocation(`/espace-collaborateur/${path}`);

  const communicationCount = conversationsQuery.isLoading ? "…" : conversationsQuery.isError ? "—" : conversations.length;
  const countValue = (query: { isLoading: boolean; isError: boolean }, value: number | undefined) =>
    query.isLoading ? "…" : query.isError || value === undefined ? "—" : value;
  const visibleArrears = canViewArrears ? arrears : [];
  const visibleRequirements = canViewPaymentRequirements ? requirements : [];
  const hasRestrictedFinanceData = !canViewFinance || !canViewArrears || !canViewPaymentRequirements;
  const financeHasError = (canViewFinance && financeQuery.isError)
    || (canViewArrears && arrearsQuery.isError)
    || (canViewPaymentRequirements && requirementsQuery.isError);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="sr-content">
      <section className="sr-welcome" aria-label="Profil collaborateur">
        <img className="sr-mine-bg" src={imagePath("mine-banner.jpg")} alt="" />
        <div className="sr-welcome-shade" />
        {portraitSource && portraitSource !== failedPortrait
          ? <img className="sr-avatar" src={portraitSource} alt={`Portrait de ${name}`} onError={() => setFailedPortrait(portraitSource)} />
          : <span className="sr-avatar sr-avatar-initials" aria-label={`Initiales de ${name}`}>{initials(name)}</span>}
        <div className="sr-welcome-copy">
          <h1 data-testid="text-dashboard-user-name">{name}</h1>
          <b>{role}</b>
          <p>{matchingPortraitPersona
            ? "Coordination, organisation et soutien stratégique au service de la Direction."
            : "Votre espace sécurisé pour consulter vos dossiers, réunions et informations confidentielles."}</p>
        </div>
      </section>

      <section className="sr-stats" aria-label="Indicateurs de l’espace collaborateur">
        {canViewRequests && <StatCard icon={BriefcaseBusiness} label="À traiter" value={countValue(requestsQuery, pendingRequestCount)} tone="red" action="Voir les demandes" onClick={() => go("requests")} isLoading={requestsQuery.isLoading} isError={requestsQuery.isError} />}
        {canViewDocuments && <StatCard icon={FileText} label="Documents reçus" value={countValue(documentsQuery, documentsQuery.data?.length)} tone="blue" action="Voir les documents" onClick={() => go("documents")} isLoading={documentsQuery.isLoading} isError={documentsQuery.isError} />}
        {canViewCases && <StatCard icon={Folder} label="Dossiers en cours" value={countValue(casesQuery, casesQuery.data?.filter((item: any) => item.status?.toLowerCase() === "active").length)} tone="green" action="Voir mes dossiers" onClick={() => go("cases")} isLoading={casesQuery.isLoading} isError={casesQuery.isError} />}
        {canParticipateInMeetings && <StatCard icon={CalendarDays} label="Réunions à venir" value={countValue(meetingsQuery, upcomingMeetings.length)} tone="violet" action="Voir l’agenda" onClick={() => go("agenda")} isLoading={meetingsQuery.isLoading} isError={meetingsQuery.isError} />}
        {canUseMessaging && <StatCard icon={MessageSquare} label="Messages & Audios" value={communicationCount} tone="cyan" action="Voir les messages" onClick={() => go("comms")} isLoading={conversationsQuery.isLoading} isError={conversationsQuery.isError} />}
      </section>

      <div className="sr-dashboard-grid">
        <div className="sr-primary-col">
          {canViewDocuments && <DashboardPanel
            className="sr-documents"
            icon={FileText}
            title="Documents reçus"
            description="Documents affectés à votre compte."
            action="Voir tout"
            onAction={() => go("documents")}
          >
            <QueryMessage loading={documentsQuery.isLoading} error={documentsQuery.isError}>
              {documents.length === 0
                ? <DashboardEmpty icon={FileText} title="Aucun document reçu" text="Les documents qui vous seront transmis apparaîtront ici." />
                : documents.slice(0, 3).map((entry: any) => (
                  <button className="sr-document-row" type="button" key={entry.assignment.id} onClick={() => go("documents")} aria-label={`Consulter le document ${entry.document.title}`} data-testid={`button-dashboard-document-${entry.assignment.id}`}>
                    <FileText aria-hidden="true" />
                    <span className="sr-row-copy"><b>{entry.document.title}</b><small>{entry.assignment.instruction || `Référence ${entry.document.id}`}</small></span>
                    <span className={`sr-tag ${entry.assignment.status === "received" ? "sr-new" : "sr-process"}`}>{statusLabel(entry.assignment.status)}</span>
                    <small className="sr-row-date">{parisDateTime(entry.assignment.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                    <ChevronRight className="sr-row-chevron" aria-hidden="true" />
                  </button>
                ))}
            </QueryMessage>
          </DashboardPanel>}

          {canViewCases && <DashboardPanel className="sr-cases" icon={Folder} title="Mes dossiers" action="Voir tout" onAction={() => go("cases")}>
            <QueryMessage loading={casesQuery.isLoading} error={casesQuery.isError}>
              <div className="sr-tabs" role="group" aria-label="Filtrer mes dossiers">
                {[
                  { status: "ACTIVE", label: "En cours", count: cases.filter((item: any) => item.status?.toLowerCase() === "active").length },
                  { status: "WAITING", label: "À traiter", count: cases.filter((item: any) => item.status?.toLowerCase() === "waiting").length },
                  { status: "COMPLETED", label: "Terminés", count: cases.filter((item: any) => item.status?.toLowerCase() === "completed").length },
                  { status: "URGENT", label: "Urgents", count: cases.filter((item: any) => item.status?.toLowerCase() !== "completed" && ["high", "urgent"].includes(item.priority?.toLowerCase())).length },
                ].map(tab => (
                  <button type="button" key={tab.status} className={caseTab === tab.status ? "selected" : ""} aria-pressed={caseTab === tab.status} onClick={() => setCaseTab(tab.status)} data-testid={`button-dashboard-case-filter-${tab.status.toLowerCase()}`}>
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              {visibleCases.length
                ? visibleCases.map((item: any) => (
                  <button className="sr-document-row sr-case-row" type="button" key={item.id} onClick={() => go("cases")} aria-label={`Consulter le dossier ${item.title}`} data-testid={`button-dashboard-case-${item.id}`}>
                    <Folder aria-hidden="true" />
                    <span className="sr-row-copy"><b>{item.title}</b><small>{item.reference || statusLabel(item.status)}</small></span>
                    <span className="sr-tag sr-new">{statusLabel(item.status)}</span>
                    <small className="sr-row-date">{item.updatedAt ? parisDateTime(item.updatedAt, { day: "numeric", month: "short" }) : ""}</small>
                    <ChevronRight className="sr-row-chevron" aria-hidden="true" />
                  </button>
                ))
                : <div className="sr-inline-empty">Aucun dossier dans cette catégorie.</div>}
            </QueryMessage>
          </DashboardPanel>}

          <div className="sr-lower-grid">
            {canViewTasks && <DashboardPanel className="sr-small-panel" icon={ClipboardList} title="Mes tâches" action="Voir tout" onAction={() => go("tasks")}>
              <QueryMessage loading={tasksQuery.isLoading || (tasksQuery.isError && dashboardQuery.isLoading)} error={tasksQuery.isError && dashboardQuery.isError}>
                {taskSummaryFallback && <div className="sr-data-warning" role="status">Liste complète indisponible ; aperçu des tâches du jour affiché.</div>}
                {tasks.length === 0
                  ? <DashboardEmpty icon={CheckSquare} title={taskSummaryFallback ? "Aucune tâche à échéance prochaine" : "Aucune tâche assignée"} text={taskSummaryFallback ? "Le résumé du tableau de bord ne signale pas de tâche proche." : "Les tâches qui vous sont attribuées apparaîtront ici."} />
                  : <div className="sr-compact-list">{tasks.slice(0, 3).map((task: any) => (
                    <button type="button" className="sr-compact-row" key={task.id} onClick={() => go("tasks")} data-testid={`button-dashboard-task-${task.id}`}>
                      <CheckSquare aria-hidden="true" /><span><b>{task.title}</b><small>{task.dueAt ? parisDateTime(task.dueAt, { day: "numeric", month: "short" }) : "Sans échéance"}</small></span>
                    </button>
                  ))}</div>}
              </QueryMessage>
            </DashboardPanel>}
            <DashboardPanel className="sr-small-panel" icon={Lightbulb} title="Notes stratégiques" action="Voir tout" onAction={() => go("notes")}>
              <QueryMessage loading={notesQuery.isLoading} error={notesQuery.isError}>
                {notes.length === 0
                  ? <DashboardEmpty icon={NotebookPen} title="Aucune note pour le moment" text="Vos notes stratégiques apparaîtront ici." />
                  : <div className="sr-compact-list">{notes.slice(0, 2).map((note: any) => (
                    <button type="button" className="sr-compact-row" key={note.id} onClick={() => go("notes")} data-testid={`button-dashboard-note-${note.id}`}>
                      <NotebookPen aria-hidden="true" /><span><b>{note.title}</b><small>{note.isShared ? "Partagée" : "Privée"} · {parisDateTime(note.updatedAt, { day: "numeric", month: "short" })}</small></span>
                    </button>
                  ))}</div>}
              </QueryMessage>
            </DashboardPanel>
          </div>
        </div>

        <div className="sr-secondary-col">
          {canParticipateInMeetings && <DashboardPanel className="sr-meetings" icon={CalendarDays} title="Prochaines réunions" action="Voir tout" onAction={() => go("agenda")}>
            <QueryMessage loading={meetingsQuery.isLoading} error={meetingsQuery.isError}>
              {upcomingMeetings.length === 0
                ? <DashboardEmpty icon={CalendarDays} title="Aucune réunion programmée" text="Les prochaines réunions confirmées apparaîtront ici." button="Voir mon agenda" onClick={() => go("agenda")} />
                : <div className="sr-meeting-list">{upcomingMeetings.slice(0, 3).map((meeting: any) => (
                  <button type="button" className="sr-meeting-row" key={meeting.id} onClick={() => go("agenda")} data-testid={`button-dashboard-meeting-${meeting.id}`}>
                    <CalendarDays aria-hidden="true" /><span><b>{meeting.title}</b><small>{parisDateTime(meeting.startsAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></span>
                  </button>
                ))}</div>}
            </QueryMessage>
          </DashboardPanel>}

          {canSeeFinance && <DashboardPanel className="sr-finance" icon={Home} title="Ma situation financière" action="Voir détail" onAction={() => go("finance")}>
            <QueryMessage loading={financeQuery.isLoading || arrearsQuery.isLoading || requirementsQuery.isLoading} error={financeHasError}>
              {!finance && visibleArrears.length === 0 && visibleRequirements.length === 0
                ? <>
                  <div className="sr-finance-no-data">Aucune donnée financière disponible.</div>
                  {hasRestrictedFinanceData && <DashboardRestricted>Certaines informations financières ne sont pas accessibles avec les permissions de votre compte.</DashboardRestricted>}
                </>
                : <>
                  {finance && <div className="sr-finance-row">
                    <span className="sr-euro" aria-hidden="true">€</span>
                    <div><b>{finance.periodLabel || "Rémunération"}</b><small>{statusLabel(finance.salaryStatus)}</small><small>{finance.communicatedDelayReason || "Aucun motif communiqué"}</small></div>
                    <span className="sr-status">{statusLabel(finance.salaryStatus)}</span>
                  </div>}
                  {visibleArrears.slice(0, 1).map((item: any) => <div className="sr-finance-row arrears" key={item.id}>
                    <span className="sr-euro" aria-hidden="true">€</span>
                    <div><b>{item.periodLabel || "Arriérés"}</b><small>{statusLabel(item.status)}</small><small>{item.communicatedReason || "Aucun motif communiqué"}</small></div>
                  </div>)}
                  {visibleRequirements.slice(0, 1).map((item: any) => <div className="sr-finance-requirement" key={item.id}><b>{item.title}</b><span>{statusLabel(item.status)}</span></div>)}
                  {hasRestrictedFinanceData && <DashboardRestricted>Certaines informations financières ne sont pas accessibles avec les permissions de votre compte.</DashboardRestricted>}
                </>}
            </QueryMessage>
          </DashboardPanel>}

          {canUseVideo && <DashboardPanel className="sr-video" icon={Video} title="Visioconférence" action="Voir tout" onAction={() => go("video")}>
            <QueryMessage loading={videoQuery.isLoading} error={videoQuery.isError}>
              {videoAccess?.meeting
                ? <div className="sr-video-active"><strong>{videoAccess.meeting.title}</strong><span>Accès autorisé jusqu’à {parisDateTime(videoAccess.meeting.expiresAt, { hour: "2-digit", minute: "2-digit" })}</span><button className="sr-outline" type="button" onClick={() => go("video")}>Rejoindre ou consulter</button></div>
                : <DashboardEmpty icon={Video} title="Aucune visioconférence en cours" text="Les accès autorisés aux réunions vidéo apparaîtront ici." button="Voir mes réunions" onClick={() => go("video")} />}
            </QueryMessage>
          </DashboardPanel>}
        </div>

        <aside className="sr-rail" aria-label="Raccourcis et notifications">
          <DashboardPanel className="sr-shortcuts" icon={CalendarDays} title="Mes raccourcis">
            <div className="sr-shortcut-grid">
              {canUseMessaging && <button type="button" onClick={() => go("comms?compose=message")} data-testid="button-dashboard-shortcut-comms"><MessageSquare aria-hidden="true" /><span>Nouveau<br />message</span></button>}
              {canUseMessaging && <button type="button" title="Rédigez un message interne au sujet d’une réunion. Cette action ne modifie pas votre participation." aria-label="Répondre à une réunion par un message interne, sans modifier votre participation." onClick={() => go("comms?compose=meeting")} data-testid="button-dashboard-shortcut-agenda"><CheckSquare aria-hidden="true" /><span>Répondre à<br />une réunion</span></button>}
              {canViewDocuments && <button type="button" title="Consulter vos documents reçus et ouvrir leurs pièces jointes, selon vos permissions." aria-label="Ouvrir les documents reçus" onClick={() => go("documents")} data-testid="button-dashboard-shortcut-documents"><Download aria-hidden="true" /><span>Documents<br />reçus</span></button>}
              {canWriteWorkspace && <button type="button" onClick={() => go("notes")} data-testid="button-dashboard-shortcut-notes"><CalendarDays aria-hidden="true" /><span>Créer une<br />note</span></button>}
            </div>
          </DashboardPanel>
          <DashboardPanel className="sr-notifications" icon={ShieldCheck} title="Notifications" action="Voir tout" onAction={() => go("notifications")}>
            <QueryMessage loading={notificationsQuery.isLoading} error={notificationsQuery.isError}>
              {notifications.length === 0
                ? <div className="sr-notifications-empty">{unreadCount === 0 ? "Aucune notification." : "Aucune notification récente."}</div>
                : notifications.slice(0, 3).map((item: any, index: number) => (
                  <button type="button" className="sr-notification" key={item.id} onClick={() => go("notifications")} data-testid={`button-dashboard-notification-${item.id}`}>
                    <span className={`sr-n-icon ${["cyan", "violet", "teal"][index % 3]}`}><Bell aria-hidden="true" /></span>
                    <span className="sr-notification-copy"><b>{item.title || "Notification"}</b><small>{item.body || "Consultez le détail de cette notification."}</small><time>{parisDateTime(item.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></span>
                    {!item.isRead && <i aria-label="Non lue" />}
                  </button>
                ))}
            </QueryMessage>
          </DashboardPanel>
          <section className="sr-mountain" aria-label="Engagement pour une exploitation minière responsable">
            <img src={imagePath("mountains.jpg")} alt="Montagnes et forêt de pins" />
            <div>Ensemble vers une exploitation minière responsable et durable.</div>
          </section>
        </aside>
      </div>

      <footer className="sr-footer">
        <span>SOMIREN S.A.　|　 Excellence minière, avenir durable</span>
        <span>Espace Collaborateur — {name}</span>
      </footer>
    </div>
  );
}