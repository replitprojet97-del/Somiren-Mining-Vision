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
  useArrears, useCases, useDashboard, useFinanceSummary,
  useMeetings, useNotes, useNotifications, usePaymentRequirements, useReceivedDocuments,
  useRequests, useTasks,
} from "@/hooks/use-workspace";
import { conferenceWindow } from "@/lib/conference-window";
import { workspaceRoleLabel } from "@/lib/workspace-role";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeWorkspaceNotification } from "@/lib/workspace-notifications";
import { useUnreadMessageCount } from "@/hooks/use-message-read";
import { DashboardEmpty, DashboardPanel, localDateTime as formatLocalDateTime, QueryMessage } from "./components/DashboardBits";
import "./WorkspaceReference.css";

const imagePath = (filename: string) => `${import.meta.env.BASE_URL}images/workspace-reference/${filename}`;

function initials(name?: string) {
  return name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toLocaleUpperCase("fr-FR") || "C";
}

function statusLabel(status: string | undefined, lang: "fr" | "en") {
  const labels: Record<string, readonly [string, string]> = {
    received: ["Nouveau", "New"],
    in_progress: ["En cours", "In progress"],
    submitted: ["Transmis", "Submitted"],
    completed: ["Terminé", "Completed"],
    active: ["En cours", "In progress"],
    waiting: ["À traiter", "To review"],
    on_hold: ["Suspendu", "On hold"],
    pending: ["En attente", "Pending"],
    paid: ["Versé", "Paid"],
    sent: ["Versé", "Paid"],
    overdue: ["En retard", "Overdue"],
    accepted: ["Acceptée", "Accepted"],
    rejected: ["Refusée", "Declined"],
    acknowledged: ["Prise en compte", "Acknowledged"],
    declined: ["Refusée", "Declined"],
    open: ["En attente", "Pending"],
    settled: ["Réglé", "Settled"],
    archived: ["Archivé", "Archived"],
  };
  return status ? labels[status.toLowerCase()]?.[lang === "en" ? 1 : 0] || status.replaceAll("_", " ") : lang === "en" ? "Status not provided" : "Statut non communiqué";
}

function salaryLabel(status: string | undefined, lang: "fr" | "en") {
  const v = (status || "").toLowerCase();
  if (["paid", "sent", "versé", "verse"].includes(v)) return lang === "en" ? "Paid" : "Versé";
  if (["unpaid", "not_paid", "pending", "overdue", "non versé", "non verse"].includes(v)) return lang === "en" ? "Unpaid" : "Non versé";
  return statusLabel(status, lang);
}

function arrearsLabel(status: string | undefined, lang: "fr" | "en") {
  const v = (status || "").toLowerCase();
  if (v === "open") return lang === "en" ? "Pending" : "En attente";
  if (v === "settled") return lang === "en" ? "Settled" : "Réglé";
  if (v === "archived") return lang === "en" ? "Archived" : "Archivé";
  return statusLabel(status, lang);
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
  const { w } = useWorkspaceLocale();
  return (
    <button className={`sr-stat sr-${tone}`} type="button" onClick={onClick} data-testid={`button-dashboard-stat-${tone}`}>
      <span className="sr-stat-icon"><Icon size={17} aria-hidden="true" /></span>
      <span className="sr-stat-name">{label}</span>
      <strong>{value}</strong>
      <small>{isError ? w("Données indisponibles", "Data unavailable") : isLoading ? w("Chargement…", "Loading…") : action}{!isError && !isLoading && <ChevronRight size={10} aria-hidden="true" />}</small>
    </button>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { profile } = useWorkspaceAuth();
  const { lang, w, formatNumber, formatMoney } = useWorkspaceLocale();
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
  const unreadMessagesQuery = useUnreadMessageCount(canUseMessaging);
  const notificationsQuery = useNotifications(hasWorkspaceRead);
  const [now, setNow] = useState(() => new Date());

  const dashboard = dashboardQuery.data;
  const documents = documentsQuery.data ?? [];
  const cases = casesQuery.data ?? [];
  const tasks = tasksQuery.data ?? dashboard?.todayWork ?? [];
  const requests = requestsQuery.data ?? [];
  const meetings = meetingsQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const requirements = requirementsQuery.data ?? [];
  const arrears = arrearsQuery.data ?? [];
  const finance = canViewFinance ? financeQuery.data : undefined;
  const activeVideoMeeting = canUseVideo && canParticipateInMeetings && !meetingsQuery.isError
    ? meetings.find((meeting: any) => meeting.videoAssetId && conferenceWindow(meeting, now.getTime()) === "active")
    : undefined;
  const taskSummaryFallback = canViewTasks && tasksQuery.isError && !dashboardQuery.isError && !dashboardQuery.isLoading;
  const profilePhoto = useProfilePhoto();
  const [failedPortrait, setFailedPortrait] = useState<string | null>(null);
  const name = profile?.fullName || w("Collaborateur", "Collaborator");
  const role = workspaceRoleLabel(profile?.role, lang);
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

  const communicationCount = unreadMessagesQuery.isLoading ? "…" : unreadMessagesQuery.isError ? "—" : unreadMessagesQuery.data ?? 0;
  const countValue = (query: { isLoading: boolean; isError: boolean }, value: number | undefined) =>
    query.isLoading ? "…" : query.isError || value === undefined ? "—" : value;
  const visibleArrears = canViewArrears
    ? [...arrears].sort((left: any, right: any) => Number(right.status === "open") - Number(left.status === "open"))
    : [];
  const visibleRequirements = canViewPaymentRequirements ? requirements : [];
  const firstArrear = visibleArrears[0];
  const localDateTime = (value: string | Date, options: Intl.DateTimeFormatOptions = {}) => formatLocalDateTime(value, options, lang);
  const queryErrorMessage = (error: unknown) => error instanceof Error ? error.message : typeof error === "string" ? error : undefined;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="sr-content">
      <section className="sr-welcome" aria-label={w("Profil collaborateur", "Collaborator profile")}>
        <img className="sr-mine-bg" src={imagePath("mine-banner-hd.jpg")} alt="" />
        <div className="sr-welcome-shade" />
        {portraitSource && portraitSource !== failedPortrait
          ? <img className="sr-avatar" src={portraitSource} alt={`${w("Portrait de", "Portrait of")} ${name}`} onError={() => setFailedPortrait(portraitSource)} />
          : <span className="sr-avatar sr-avatar-initials" aria-label={`${w("Initiales de", "Initials of")} ${name}`}>{initials(name)}</span>}
        <div className="sr-welcome-copy">
          <h1 data-testid="text-dashboard-user-name">{name}</h1>
          <b>{role}</b>
          <p>{matchingPortraitPersona
            ? w("Coordination, organisation et soutien stratégique au service de la Direction.", "Coordination, organisation and strategic support for Executive Management.")
            : w("Votre espace sécurisé pour consulter vos dossiers, réunions et informations confidentielles.", "Your secure space to access your cases, meetings and confidential information.")}</p>
        </div>
      </section>

      <section className="sr-stats" aria-label={w("Indicateurs de l’espace collaborateur", "Workspace overview")}>
        {canViewRequests && <StatCard icon={BriefcaseBusiness} label={w("À traiter", "To review")} value={countValue(requestsQuery, pendingRequestCount)} tone="red" action={w("Voir les demandes", "View requests")} onClick={() => go("requests")} isLoading={requestsQuery.isLoading} isError={requestsQuery.isError} />}
        {canViewDocuments && <StatCard icon={FileText} label={w("Documents reçus", "Received documents")} value={countValue(documentsQuery, documentsQuery.data?.length)} tone="blue" action={w("Voir les documents", "View documents")} onClick={() => go("documents")} isLoading={documentsQuery.isLoading} isError={documentsQuery.isError} />}
        {canViewCases && <StatCard icon={Folder} label={w("Dossiers en cours", "Active cases")} value={countValue(casesQuery, casesQuery.data?.filter((item: any) => item.status?.toLowerCase() === "active").length)} tone="green" action={w("Voir mes dossiers", "View my cases")} onClick={() => go("cases")} isLoading={casesQuery.isLoading} isError={casesQuery.isError} />}
        {canParticipateInMeetings && <StatCard icon={CalendarDays} label={w("Réunions à venir", "Upcoming meetings")} value={countValue(meetingsQuery, upcomingMeetings.length)} tone="violet" action={w("Voir l’agenda", "View calendar")} onClick={() => go("agenda")} isLoading={meetingsQuery.isLoading} isError={meetingsQuery.isError} />}
        {canUseMessaging && <StatCard icon={MessageSquare} label={w("Messages & Audios", "Messages & audio")} value={communicationCount} tone="cyan" action={w("Voir les messages", "View messages")} onClick={() => go("comms")} isLoading={unreadMessagesQuery.isLoading} isError={unreadMessagesQuery.isError} />}
      </section>

      <div className="sr-dashboard-grid">
        <div className="sr-primary-col">
          {canViewDocuments && <DashboardPanel
            className="sr-documents"
            icon={FileText}
            title={w("Documents reçus", "Received documents")}
            description={w("Documents affectés à votre compte.", "Documents assigned to your account.")}
            action={w("Voir tout", "View all")}
            onAction={() => go("documents")}
          >
            <QueryMessage loading={documentsQuery.isLoading} error={documentsQuery.isError} errorMessage={queryErrorMessage(documentsQuery.error)}>
              {documents.length === 0
                ? <DashboardEmpty icon={FileText} title={w("Aucun document reçu", "No documents received")} text={w("Les documents qui vous seront transmis apparaîtront ici.", "Documents shared with you will appear here.")} />
                : documents.slice(0, 3).map((entry: any) => (
                  <button className="sr-document-row" type="button" key={entry.assignment.id} onClick={() => go("documents")} aria-label={`${w("Consulter le document", "View document")} ${entry.document.title}`} data-testid={`button-dashboard-document-${entry.assignment.id}`}>
                    <FileText aria-hidden="true" />
                    <span className="sr-row-copy"><b>{entry.document.title}</b><small>{entry.assignment.instruction || `${w("Référence", "Reference")} ${entry.document.id}`}</small></span>
                    <span className={`sr-tag ${entry.assignment.status === "received" ? "sr-new" : "sr-process"}`}>{statusLabel(entry.assignment.status, lang)}</span>
                    <small className="sr-row-date">{localDateTime(entry.assignment.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                    <ChevronRight className="sr-row-chevron" aria-hidden="true" />
                  </button>
                ))}
            </QueryMessage>
          </DashboardPanel>}

          {canViewCases && <DashboardPanel className="sr-cases" icon={Folder} title={w("Mes dossiers", "My cases")} action={w("Voir tout", "View all")} onAction={() => go("cases")}>
            <QueryMessage loading={casesQuery.isLoading} error={casesQuery.isError} errorMessage={queryErrorMessage(casesQuery.error)}>
              <div className="sr-tabs" role="group" aria-label={w("Filtrer mes dossiers", "Filter my cases")}>
                {[
                  { status: "ACTIVE", label: w("En cours", "In progress"), count: cases.filter((item: any) => item.status?.toLowerCase() === "active").length },
                  { status: "WAITING", label: w("À traiter", "To review"), count: cases.filter((item: any) => item.status?.toLowerCase() === "waiting").length },
                  { status: "COMPLETED", label: w("Terminés", "Completed"), count: cases.filter((item: any) => item.status?.toLowerCase() === "completed").length },
                  { status: "URGENT", label: w("Urgents", "Urgent"), count: cases.filter((item: any) => item.status?.toLowerCase() !== "completed" && ["high", "urgent"].includes(item.priority?.toLowerCase())).length },
                ].map(tab => (
                  <button type="button" key={tab.status} className={caseTab === tab.status ? "selected" : ""} aria-pressed={caseTab === tab.status} onClick={() => setCaseTab(tab.status)} data-testid={`button-dashboard-case-filter-${tab.status.toLowerCase()}`}>
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              {visibleCases.length
                ? visibleCases.map((item: any) => (
                  <button className="sr-document-row sr-case-row" type="button" key={item.id} onClick={() => go("cases")} aria-label={`${w("Consulter le dossier", "View case")} ${item.title}`} data-testid={`button-dashboard-case-${item.id}`}>
                    <Folder aria-hidden="true" />
                    <span className="sr-row-copy"><b>{item.title}</b><small>{item.reference || statusLabel(item.status, lang)}</small></span>
                    <span className="sr-tag sr-new">{statusLabel(item.status, lang)}</span>
                    <small className="sr-row-date">{item.updatedAt ? localDateTime(item.updatedAt, { day: "numeric", month: "short" }) : ""}</small>
                    <ChevronRight className="sr-row-chevron" aria-hidden="true" />
                  </button>
                ))
                : <div className="sr-inline-empty">{w("Aucun dossier dans cette catégorie.", "No cases in this category.")}</div>}
            </QueryMessage>
          </DashboardPanel>}

          <div className="sr-lower-grid">
            {canViewTasks && <DashboardPanel className="sr-small-panel" icon={ClipboardList} title={w("Mes tâches", "My tasks")} action={w("Voir tout", "View all")} onAction={() => go("tasks")}>
              <QueryMessage
                loading={tasksQuery.isLoading || (tasksQuery.isError && dashboardQuery.isLoading)}
                error={tasksQuery.isError && dashboardQuery.isError}
                errorMessage={queryErrorMessage(tasksQuery.error) || queryErrorMessage(dashboardQuery.error)}
              >
                {taskSummaryFallback && <div className="sr-data-warning" role="status">{w("Liste complète indisponible ; aperçu des tâches du jour affiché.", "Full task list unavailable; showing today's task summary.")}</div>}
                {tasks.length === 0
                  ? <DashboardEmpty icon={CheckSquare} title={taskSummaryFallback ? w("Aucune tâche à échéance prochaine", "No tasks due soon") : w("Aucune tâche assignée", "No tasks assigned")} text={taskSummaryFallback ? w("Le résumé du tableau de bord ne signale pas de tâche proche.", "The dashboard summary shows no upcoming tasks.") : w("Les tâches qui vous sont attribuées apparaîtront ici.", "Tasks assigned to you will appear here.")} />
                  : <div className="sr-compact-list">{tasks.slice(0, 3).map((task: any) => (
                    <button type="button" className="sr-compact-row" key={task.id} onClick={() => go("tasks")} data-testid={`button-dashboard-task-${task.id}`}>
                      <CheckSquare aria-hidden="true" /><span><b>{task.title}</b><small>{task.dueAt ? localDateTime(task.dueAt, { day: "numeric", month: "short" }) : w("Sans échéance", "No due date")}</small></span>
                    </button>
                  ))}</div>}
              </QueryMessage>
            </DashboardPanel>}
            <DashboardPanel className="sr-small-panel sr-notes" icon={Lightbulb} title={w("Notes stratégiques", "Strategic notes")} action={w("Voir tout", "View all")} onAction={() => go("notes")}>
              <QueryMessage loading={notesQuery.isLoading} error={notesQuery.isError} errorMessage={queryErrorMessage(notesQuery.error)}>
                {notes.length === 0
                  ? <DashboardEmpty icon={Lightbulb} title={w("Aucune note pour le moment", "No notes yet")} text={w("Vos notes stratégiques apparaîtront ici.", "Your strategic notes will appear here.")} />
                  : <div className="sr-compact-list">{notes.slice(0, 2).map((note: any) => (
                    <button type="button" className="sr-compact-row" key={note.id} onClick={() => go("notes")} data-testid={`button-dashboard-note-${note.id}`}>
                      <NotebookPen aria-hidden="true" /><span><b>{note.title}</b><small>{note.isShared ? w("Partagée", "Shared") : w("Privée", "Private")} · {localDateTime(note.updatedAt, { day: "numeric", month: "short" })}</small></span>
                    </button>
                  ))}</div>}
              </QueryMessage>
            </DashboardPanel>
          </div>
        </div>

        <div className="sr-secondary-col">
          {canParticipateInMeetings && <DashboardPanel className="sr-meetings" icon={CalendarDays} title={w("Prochaines réunions", "Upcoming meetings")} action={w("Voir tout", "View all")} onAction={() => go("agenda")}>
            <QueryMessage loading={meetingsQuery.isLoading} error={meetingsQuery.isError} errorMessage={queryErrorMessage(meetingsQuery.error)}>
              {upcomingMeetings.length === 0
                ? <DashboardEmpty icon={CalendarDays} title={w("Aucune réunion programmée", "No meetings scheduled")} text={w("Les prochaines réunions confirmées apparaîtront ici.", "Upcoming confirmed meetings will appear here.")} button={w("Voir mon agenda", "View my calendar")} onClick={() => go("agenda")} />
                : <div className="sr-meeting-list">{upcomingMeetings.slice(0, 3).map((meeting: any) => (
                  <button type="button" className="sr-meeting-row" key={meeting.id} onClick={() => go("agenda")} data-testid={`button-dashboard-meeting-${meeting.id}`}>
                    <CalendarDays aria-hidden="true" /><span><b>{meeting.title}</b><small>{localDateTime(meeting.startsAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></span>
                  </button>
                ))}</div>}
            </QueryMessage>
          </DashboardPanel>}

          <DashboardPanel className="sr-finance" icon={Home} title={w("Ma situation financière", "My financial information")} action={canSeeFinance ? w("Voir détail", "View details") : undefined} onAction={() => go("finance")}>
            <div className="sr-finance-row" data-testid="row-dashboard-salary">
              <span className="sr-euro" aria-hidden="true">¤</span>
              <div>
                {!canViewFinance ? <b>{w("Aucun salaire communiqué", "No salary information provided")}</b>
                  : financeQuery.isLoading ? <b>{w("Chargement…", "Loading…")}</b>
                  : financeQuery.isError ? <b>{w("Données indisponibles", "Data unavailable")}</b>
                  : finance ? <>
                    <b>{finance.periodLabel || w("Salaire", "Salary")}</b>
                    <small>{finance.communicatedDelayReason || ""}</small>
                  </>
                  : <b>{w("Aucun salaire communiqué", "No salary information provided")}</b>}
              </div>
              {canViewFinance && finance && !financeQuery.isLoading && !financeQuery.isError && <span className="sr-status">{salaryLabel(finance.salaryStatus, lang)}</span>}
            </div>
            <div className="sr-finance-row arrears" data-testid="row-dashboard-arrears">
              <span className="sr-euro" aria-hidden="true" style={{ fontSize: firstArrear?.currency ? "9px" : undefined }}>{firstArrear?.currency?.toUpperCase() || "¤"}</span>
              <div>
                {!canViewArrears ? <b>{w("Aucun arriéré communiqué", "No arrears information provided")}</b>
                  : arrearsQuery.isLoading ? <b>{w("Chargement…", "Loading…")}</b>
                  : arrearsQuery.isError ? <b>{w("Données indisponibles", "Data unavailable")}</b>
                  : visibleArrears[0] ? <>
                    <b>{firstArrear.periodLabel || w("Arriérés", "Arrears")}</b>
                    <small>{firstArrear.amount == null
                      ? w("Montant non communiqué", "Amount not provided")
                      : firstArrear.currency
                        ? formatMoney(Number(firstArrear.amount), firstArrear.currency)
                        : formatNumber(Number(firstArrear.amount))}</small>
                    {firstArrear.transferRequestStatus && <small>{statusLabel(firstArrear.transferRequestStatus, lang)}</small>}
                  </>
                  : <b>{w("Aucun arriéré en attente", "No outstanding arrears")}</b>}
              </div>
              {canViewArrears && firstArrear && !arrearsQuery.isLoading && !arrearsQuery.isError && <span className="sr-status">{arrearsLabel(firstArrear.status, lang)}</span>}
            </div>
            {visibleRequirements.slice(0, 1).map((item: any) => <div className="sr-finance-requirement" key={item.id}><b>{item.title}</b><span>{statusLabel(item.status, lang)}</span></div>)}
          </DashboardPanel>

          <DashboardPanel className="sr-video" icon={Video} title={w("Visioconférence", "Video conference")} action={w("Voir tout", "View all")} onAction={() => go("video")}>
            <QueryMessage
              loading={canUseVideo && canParticipateInMeetings && meetingsQuery.isLoading}
              error={canUseVideo && canParticipateInMeetings && meetingsQuery.isError}
              errorMessage={queryErrorMessage(meetingsQuery.error)}
            >
              {activeVideoMeeting
                ? <div className="sr-video-active"><strong>{w("Une visioconférence en cours", "A video conference is in progress")}</strong><span>{activeVideoMeeting.title}</span><button className="sr-outline" type="button" onClick={() => go("video")} data-testid="button-dashboard-video-join">{w("Rejoindre", "Join")}</button></div>
                : <DashboardEmpty icon={Video} title={w("Aucune visioconférence en cours", "No video conference in progress")} text={w("Vous pourrez rejoindre une réunion programmée.", "You can join a scheduled meeting.")} button={w("Voir mes réunions", "View my meetings")} onClick={() => go("video")} />}
            </QueryMessage>
          </DashboardPanel>
        </div>

        <aside className="sr-rail" aria-label={w("Raccourcis et notifications", "Shortcuts and notifications")}>
          <DashboardPanel className="sr-shortcuts" icon={CalendarDays} title={w("Mes raccourcis", "My shortcuts")}>
            <div className="sr-shortcut-grid">
              {canUseMessaging && <button type="button" onClick={() => go("comms?compose=message")} data-testid="button-dashboard-shortcut-comms"><MessageSquare aria-hidden="true" /><span>{w("Nouveau", "New")}<br />{w("message", "message")}</span></button>}
              {canUseMessaging && <button type="button" title={w("Rédigez un message interne au sujet d’une réunion. Cette action ne modifie pas votre participation.", "Write an internal message about a meeting. This does not change your attendance.")} aria-label={w("Répondre à une réunion par un message interne, sans modifier votre participation.", "Reply to a meeting with an internal message without changing your attendance.")} onClick={() => go("comms?compose=meeting")} data-testid="button-dashboard-shortcut-agenda"><CheckSquare aria-hidden="true" /><span>{w("Répondre à", "Reply to")}<br />{w("une réunion", "a meeting")}</span></button>}
              {canViewDocuments && <button type="button" title={w("Consulter vos documents reçus et ouvrir leurs pièces jointes, selon vos permissions.", "View your received documents and open their attachments, subject to your permissions.")} aria-label={w("Ouvrir les documents reçus", "Open received documents")} onClick={() => go("documents")} data-testid="button-dashboard-shortcut-documents"><Download aria-hidden="true" /><span>{w("Documents", "Received")}<br />{w("reçus", "documents")}</span></button>}
              {canWriteWorkspace && <button type="button" onClick={() => go("notes")} data-testid="button-dashboard-shortcut-notes"><CalendarDays aria-hidden="true" /><span>{w("Créer une", "Create a")}<br />{w("note", "note")}</span></button>}
            </div>
          </DashboardPanel>
          <DashboardPanel className="sr-notifications" icon={ShieldCheck} title={w("Notifications", "Notifications")} action={w("Voir tout", "View all")} onAction={() => go("notifications")}>
            <QueryMessage loading={notificationsQuery.isLoading} error={notificationsQuery.isError} errorMessage={queryErrorMessage(notificationsQuery.error)}>
              {notifications.length === 0
                ? <div className="sr-notifications-empty">{unreadCount === 0 ? w("Aucune notification.", "No notifications.") : w("Aucune notification récente.", "No recent notifications.")}</div>
                : notifications.slice(0, 3).map((item: any, index: number) => {
                  const localized = localizeWorkspaceNotification({ title: item.title, body: item.body }, lang);
                  return (
                    <button type="button" className="sr-notification" key={item.id} onClick={() => go("notifications")} data-testid={`button-dashboard-notification-${item.id}`}>
                      <span className={`sr-n-icon ${["cyan", "violet", "teal"][index % 3]}`}><Bell aria-hidden="true" /></span>
                      <span className="sr-notification-copy"><b>{localized.title || w("Notification", "Notification")}</b><small>{localized.body || w("Consultez le détail de cette notification.", "View notification details.")}</small><time>{localDateTime(item.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></span>
                      {!item.isRead && <i aria-label={w("Non lue", "Unread")} />}
                    </button>
                  );
                })}
            </QueryMessage>
          </DashboardPanel>
          <section className="sr-mountain" aria-label={w("Engagement pour une exploitation minière responsable", "Commitment to responsible mining")}>
            <img src={imagePath("mountains-hd.jpg")} alt={w("Montagnes et forêt de pins", "Mountains and pine forest")} />
            <div>{w("Ensemble vers une exploitation minière responsable et durable.", "Together for responsible and sustainable mining.")}</div>
          </section>
        </aside>
      </div>

      <footer className="sr-footer">
        <span>SOMIREN S.A.　|　 {w("Excellence minière, avenir durable", "Mining excellence, sustainable future")}</span>
        <span>{w("Espace Collaborateur", "Collaborator workspace")} — {name}</span>
      </footer>
    </div>
  );
}