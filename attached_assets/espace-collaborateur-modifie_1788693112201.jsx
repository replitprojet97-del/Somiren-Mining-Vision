import React, { useEffect, useState } from "react";
import {
  Home, Inbox, Folder, CheckSquare, Briefcase, Calendar, Video,
  MessageSquare, FileText, Brain, Users, Bell, Shield, DollarSign, ChevronLeft,
  ChevronRight, Search, Globe, Menu, X, Clock, MapPin, Wifi,
  Download, Eye, Send, Paperclip, MoreVertical, CheckCircle2,
  AlertCircle, Circle, ArrowRight, LogOut, Mountain
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* Palette pensée pour une société minière internationale : bleu nuit  */
/* institutionnel + cuivre (référence au minerai) en accent unique.     */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Données de démonstration (données fictives)                         */
/* ------------------------------------------------------------------ */
const USER = {
  name: "Nuria Molero Rodriguez",
  role: "Assistante exécutive & Conseillère stratégique",
  tz: "UTC+2",
  location: "Cotonou, Bénin",
  hours: "08:00 – 17:00",
};

const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: Home },
  { id: "inbox", label: "Dossiers reçus", icon: Inbox, badge: 4 },
  { id: "cases", label: "Mes dossiers", icon: Folder },
  { id: "tasks", label: "Mes tâches", icon: CheckSquare, badge: 5 },
  { id: "requests", label: "Demandes de la Direction", icon: Briefcase, badge: 1 },
  { id: "agenda", label: "Agenda & Réunions", icon: Calendar },
  { id: "video", label: "Visioconférences", icon: Video },
  { id: "comms", label: "Communications", icon: MessageSquare, badge: 6 },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "notes", label: "Notes stratégiques", icon: Brain },
  { id: "finance", label: "Ma situation financière", icon: DollarSign },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell, badge: 3 },
  { id: "security", label: "Sécurité & Sessions", icon: Shield },
];

const RECEIVED_DOCS = [
  { id: 1, title: "Rapport — Projet d'exploitation Zone X", sender: "Direction des opérations", when: "Aujourd'hui, 09:42", priority: "Haute", action: "Analyser et préparer une synthèse", due: "9 sept.", status: "Nouveau", case: "Projet d'exploitation — Zone X" },
  { id: 2, title: "Contrat fournisseur — Version 3", sender: "Service juridique", when: "Hier, 16:20", priority: "Moyenne", action: "Vérifier les clauses de livraison", due: "12 sept.", status: "En cours", case: "Contrat fournisseur" },
  { id: 3, title: "Analyse financière — Partenaire X", sender: "Direction générale", when: "05 sept., 11:15", priority: "Haute", action: "Préparer une note de synthèse", due: "8 sept.", status: "En cours", case: "Partenaire stratégique" },
  { id: 4, title: "Rapport environnemental", sender: "Responsable HSE", when: "04 sept., 14:30", priority: "Basse", action: "Prendre connaissance", due: "—", status: "Consulté", case: "Mission terrain — Afrique de l'Ouest" },
];

const CASES = [
  { id: 1, title: "Projet d'exploitation — Zone X", owner: "Direction des opérations", role: "Analyse & synthèse", priority: "Haute", status: "En cours", due: "12 sept. 2026", confidentiality: "Restreint" },
  { id: 2, title: "Partenaire stratégique", owner: "Direction générale", role: "Suivi & recommandations", priority: "Moyenne", status: "En cours", due: "15 sept. 2026", confidentiality: "Confidentiel" },
  { id: 3, title: "Mission terrain — Afrique de l'Ouest", owner: "Direction des opérations", role: "Coordination logistique", priority: "Moyenne", status: "À préparer", due: "20 sept. 2026", confidentiality: "Interne" },
  { id: 4, title: "Contrat fournisseur", owner: "Direction des achats", role: "Vérification des clauses", priority: "Haute", status: "En attente", due: "10 sept. 2026", confidentiality: "Interne" },
];

const TASKS = [
  { id: 1, title: "Préparer briefing — Réunion partenaire X", case: "Partenaire stratégique", priority: "Haute", due: "Aujourd'hui, 15:00", status: "todo" },
  { id: 2, title: "Mettre à jour le tableau de suivi des dossiers", case: "Administration", priority: "Moyenne", due: "Demain, 10:00", status: "todo" },
  { id: 3, title: "Relancer le service juridique", case: "Contrat fournisseur", priority: "Moyenne", due: "09 sept.", status: "todo" },
  { id: 4, title: "Synthèse rapport environnemental", case: "Mission terrain", priority: "Basse", due: "11 sept.", status: "inprogress" },
  { id: 5, title: "Compte-rendu comité stratégique", case: "Partenaire stratégique", priority: "Haute", due: "07 sept.", status: "inprogress" },
];

const REQUESTS = [
  { id: 1, title: "Analyse du partenaire X", by: "Direction générale", text: "Analyser les informations disponibles concernant le partenaire X et préparer une synthèse stratégique avant la prochaine réunion.", due: "9 sept.", priority: "Haute", status: "En cours" },
  { id: 2, title: "Préparation comité stratégique", by: "Direction générale", text: "Rassembler les documents nécessaires et préparer l'ordre du jour du comité du 6 septembre.", due: "6 sept.", priority: "Haute", status: "Soumise" },
  { id: 3, title: "Vérification clauses fournisseur", by: "Service juridique", text: "Vérifier la conformité des clauses de livraison avant validation du contrat.", due: "12 sept.", priority: "Moyenne", status: "Nouvelle" },
];

const MEETINGS = [
  { id: 1, title: "Réunion Direction générale", time: "09:00 – 10:00", local: "08:00", mode: "En ligne", people: 5, note: "Préparation : OK" },
  { id: 2, title: "Appel avec partenaire X", time: "10:30 – 11:30", local: "09:30", mode: "En ligne", people: 3, note: "Documents à consulter" },
  { id: 3, title: "Comité stratégique", time: "14:00 – 15:30", local: "13:00", mode: "En ligne", people: 5, note: "3 documents à préparer" },
  { id: 4, title: "Point dossier minier", time: "16:00 – 16:45", local: "15:00", mode: "En ligne", people: 4, note: "Aucun document requis" },
];

const CONVERSATIONS = [
  { id: 1, who: "Direction générale", preview: "Merci de finaliser la synthèse avant le comité de 14h.", when: "il y a 2 h", unread: 2 },
  { id: 2, who: "Service juridique", preview: "Voici la version 3 du contrat, à vérifier.", when: "il y a 5 h", unread: 0 },
  { id: 3, who: "Responsable HSE", preview: "Le rapport environnemental est disponible.", when: "hier", unread: 0 },
  { id: 4, who: "Direction des opérations", preview: "Pouvez-vous confirmer votre disponibilité vendredi ?", when: "hier", unread: 1 },
];

const DOCUMENTS = [
  { id: 1, title: "Rapport — Projet d'exploitation Zone X", cat: "Projets miniers", author: "Direction des opérations", date: "06 sept. 2026", conf: "Restreint" },
  { id: 2, title: "Note stratégique — Partenaire X", cat: "Stratégie", author: "Nuria Molero Rodriguez", date: "05 sept. 2026", conf: "Confidentiel" },
  { id: 3, title: "Contrat fournisseur — V3", cat: "Juridique", author: "Service juridique", date: "05 sept. 2026", conf: "Interne" },
  { id: 4, title: "Rapport environnemental — Site A", cat: "Rapports", author: "Responsable HSE", date: "04 sept. 2026", conf: "Interne" },
  { id: 5, title: "Compte-rendu — Comité stratégique", cat: "Réunions", author: "Direction générale", date: "01 sept. 2026", conf: "Confidentiel" },
];

const NOTES = [
  { id: 1, title: "Analyse partenaire X", when: "5 sept. 2026", visibility: "Privée", case: "Partenaire stratégique" },
  { id: 2, title: "Préparation réunion Direction", when: "3 sept. 2026", visibility: "Partagée", case: "Comité stratégique" },
  { id: 3, title: "Opportunités d'investissement", when: "28 août 2026", visibility: "Privée", case: "Partenaire stratégique" },
];

const FINANCIAL_SUMMARY = {
  currency: "EUR",
  monthlySalary: 4200,
  currentStatus: "En attente",
  lastPayment: { period: "Août 2026", amount: 4200, status: "Versé", date: "31 août 2026" },
  currentPayment: { period: "Septembre 2026", amount: 4200, status: "En attente", dueDate: "30 septembre 2026" },
  arrears: [
    { period: "Juillet 2026", amount: 4200, status: "À régulariser", reason: "Validation administrative en cours.", requirement: "Aucun document supplémentaire demandé." },
  ],
  requirements: [
    { id: 1, title: "Justificatif administratif", description: "Document requis pour finaliser le traitement du paiement.", status: "À fournir", due: "10 septembre 2026" },
  ],
};

const CONTACTS = [
  { id: 1, name: "Direction générale", role: "Direction", tz: "UTC+1" },
  { id: 2, name: "Direction des opérations", role: "Opérations", tz: "UTC+1" },
  { id: 3, name: "Service juridique", role: "Juridique", tz: "UTC+1" },
  { id: 4, name: "Responsable HSE", role: "Environnement", tz: "UTC+0" },
];

const NOTIFICATIONS = [
  { id: 1, text: "Nouveau document reçu — Rapport Zone X", when: "il y a 12 min" },
  { id: 2, text: "Demande de la Direction — Analyse partenaire X", when: "il y a 28 min" },
  { id: 3, text: "Échéance proche — Contrat fournisseur", when: "il y a 1 h" },
];

const SESSIONS = [
  { id: 1, device: "MacBook Pro — Chrome", location: "Cotonou, Bénin", when: "Session actuelle", current: true },
  { id: 2, device: "iPhone — App mobile", location: "Cotonou, Bénin", when: "Hier, 18:42", current: false },
];

/* ------------------------------------------------------------------ */
/* Petits composants utilitaires                                       */
/* ------------------------------------------------------------------ */
function Pill({ tone = "neutral", children }) {
  const tones = {
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

function priorityTone(p) {
  if (p === "Haute") return "haute";
  if (p === "Moyenne") return "moyenne";
  if (p === "Basse") return "basse";
  return "neutral";
}

function SectionCard({ title, action, children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-lg ${className}`}
      style={{ border: `1px solid ${C.line}` }}
    >
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

function LinkAction({ children, onClick }) {
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

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center" style={{ color: C.inkFaint }}>
      <Icon size={28} className="mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                              */
/* ------------------------------------------------------------------ */
function Sidebar({ active, setActive, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed md:static z-40 h-full flex flex-col transition-all duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${collapsed ? "md:w-[76px]" : "md:w-[268px]"} w-[268px]`}
        style={{ background: C.navy }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 h-16 shrink-0"
          style={{ borderBottom: `1px solid ${C.navyLine}` }}
        >
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ background: C.copper }}
          >
            <Mountain size={17} color="white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate">TerraNova Mining</p>
              <p className="text-[11px] leading-tight truncate" style={{ color: "#8FA6B8" }}>
                Ressources pour un avenir durable
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActive(item.id); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors"
                style={{
                  background: isActive ? C.navySoft : "transparent",
                  color: isActive ? "white" : "#A9BAC7",
                  borderLeft: isActive ? `3px solid ${C.copper}` : "3px solid transparent",
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} className="shrink-0" />
                {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                {!collapsed && item.badge ? (
                  <span
                    className="text-[11px] font-semibold rounded-full px-1.5 py-0.5 shrink-0"
                    style={{ background: C.copper, color: "white" }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Statut */}
        <div className="px-4 py-4 space-y-2.5" style={{ borderTop: `1px solid ${C.navyLine}` }}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2 text-[13px]" style={{ color: "#CFE0D2" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#3FA66C" }} />
                Connectée — Télétravail
              </div>
              <div className="flex items-center gap-2 text-[12px]" style={{ color: "#8FA6B8" }}>
                <Clock size={13} /> Fuseau horaire : {USER.tz} ({USER.hours})
              </div>
              <div className="flex items-center gap-2 text-[12px]" style={{ color: "#8FA6B8" }}>
                <MapPin size={13} /> {USER.location}
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <span className="w-2 h-2 rounded-full" style={{ background: "#3FA66C" }} />
            </div>
          )}
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mt-2"
            style={{ color: "#CBB7A5", background: "rgba(255,255,255,0.04)" }}
          >
            <LogOut size={16} />
            {!collapsed && "Déconnexion"}
          </button>
        </div>

        {/* Collapse toggle (desktop) */}
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

/* ------------------------------------------------------------------ */
/* Topbar                                                               */
/* ------------------------------------------------------------------ */
function Topbar({ onOpenMobile, activeLabel }) {
  const [menuOpen, setMenuOpen] = useState(false);
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
          Dimanche 6 septembre 2026
        </div>
        <span className="md:hidden text-[15px] font-semibold truncate" style={{ color: C.ink }}>
          {activeLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <button className="hidden sm:flex items-center gap-1.5 text-sm px-2 py-1 rounded-md" style={{ color: C.inkSoft }}>
          <Globe size={15} /> FR
        </button>
        <button className="relative">
          <Bell size={19} color={C.inkSoft} />
          <span
            className="absolute -top-1 -right-1 text-[10px] w-4 h-4 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ background: C.red }}
          >
            3
          </span>
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5"
          >
            <img
              src="https://i.pravatar.cc/64?img=47"
              alt=""
              className="w-9 h-9 rounded-full object-cover"
            />
            <div className="hidden md:block text-left leading-tight">
              <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{USER.name}</p>
              <p className="text-[11.5px]" style={{ color: C.inkSoft }}>{USER.role}</p>
            </div>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg py-1.5 z-20"
              style={{ border: `1px solid ${C.line}` }}
            >
              {["Mon profil", "Préférences", "Sécurité", "Sessions actives", "Déconnexion"].map((m) => (
                <button
                  key={m}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  style={{ color: C.ink }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */
function StatCard({ icon: Icon, label, value, tone, onClick }) {
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

function Dashboard({ go }) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="rounded-lg overflow-hidden relative bg-white"
        style={{ border: `1px solid ${C.line}` }}
      >
        <div className="p-6 md:p-7 flex items-center gap-5">
          <img
            src="https://i.pravatar.cc/120?img=47"
            className="w-16 h-16 rounded-full object-cover hidden sm:block"
            alt=""
          />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold" style={{ color: C.ink }}>
              Bonjour Nuria,
            </h1>
            <p className="text-sm mt-0.5" style={{ color: C.inkSoft }}>{USER.role}</p>
            <p className="text-sm italic mt-2" style={{ color: C.copper }}>
              « Anticiper, coordonner, faciliter les décisions. »
            </p>
          </div>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard icon={AlertCircle} label="À traiter" value={REQUESTS.length} tone="red" onClick={() => go("requests")} />
        <StatCard icon={FileText} label="Documents reçus" value={RECEIVED_DOCS.length} tone="blue" onClick={() => go("inbox")} />
        <StatCard icon={Folder} label="Dossiers en cours" value={CASES.filter(c => c.status === "En cours").length} tone="green" onClick={() => go("cases")} />
        <StatCard icon={Calendar} label="Réunions aujourd'hui" value={MEETINGS.length} tone="amber" onClick={() => go("agenda")} />
        <StatCard icon={DollarSign} label="Situation financière" value={FINANCIAL_SUMMARY.currentStatus === "Versé" ? "Versé" : "En attente"} tone={FINANCIAL_SUMMARY.currentStatus === "Versé" ? "green" : "amber"} onClick={() => go("finance")} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Documents reçus */}
        <SectionCard title="Documents reçus" action={<LinkAction onClick={() => go("inbox")}>Voir tout</LinkAction>}>
          <div className="space-y-3">
            {RECEIVED_DOCS.slice(0, 3).map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-3 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: C.ink }}>{d.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{d.sender} · {d.when}</p>
                </div>
                <Pill tone={priorityTone(d.priority)}>{d.priority}</Pill>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Prochaines réunions */}
        <SectionCard title="Prochaines réunions" action={<LinkAction onClick={() => go("agenda")}>Voir l'agenda</LinkAction>}>
          <div className="space-y-3">
            {MEETINGS.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: C.ink }}>{m.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{m.time} · {m.mode} · {m.people} participants</p>
                </div>
                <Pill tone="info">{m.note}</Pill>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Mes tâches" action={<LinkAction onClick={() => go("tasks")}>Voir tout</LinkAction>}>
          <div className="space-y-3">
            {TASKS.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <Circle size={15} style={{ color: C.inkFaint }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate" style={{ color: C.ink }}>{t.title}</p>
                  <p className="text-[12px]" style={{ color: C.inkSoft }}>{t.case} · {t.due}</p>
                </div>
                <Pill tone={priorityTone(t.priority)}>{t.priority}</Pill>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Notes stratégiques" action={<LinkAction onClick={() => go("notes")}>Voir tout</LinkAction>}>
          <div className="space-y-3">
            {NOTES.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-3 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: C.ink }}>{n.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>Dernière modification : {n.when}</p>
                </div>
                <Pill tone={n.visibility === "Privée" ? "neutral" : "info"}>{n.visibility}</Pill>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Ma situation financière" action={<LinkAction onClick={() => go("finance")}>Voir le détail</LinkAction>}>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12.5px]" style={{ color: C.inkSoft }}>Dernier paiement</p>
                <p className="text-lg font-semibold mt-1" style={{ color: C.ink }}>{FINANCIAL_SUMMARY.lastPayment.amount.toLocaleString()} {FINANCIAL_SUMMARY.currency}</p>
                <p className="text-[12px]" style={{ color: C.inkSoft }}>{FINANCIAL_SUMMARY.lastPayment.period} · {FINANCIAL_SUMMARY.lastPayment.date}</p>
              </div>
              <Pill tone="basse">{FINANCIAL_SUMMARY.lastPayment.status}</Pill>
            </div>
            <div className="p-3 rounded-md" style={{ background: C.amberBg }}>
              <p className="text-[13px] font-medium" style={{ color: C.amber }}>Paiement actuel : {FINANCIAL_SUMMARY.currentPayment.status}</p>
              <p className="text-[12px] mt-1" style={{ color: C.inkSoft }}>{FINANCIAL_SUMMARY.currentPayment.period} · {FINANCIAL_SUMMARY.currentPayment.amount.toLocaleString()} {FINANCIAL_SUMMARY.currency}</p>
            </div>
            <div>
              <p className="text-[12.5px] font-medium" style={{ color: C.ink }}>Exigences à remplir</p>
              {FINANCIAL_SUMMARY.requirements.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 mt-2">
                  <span className="text-[12px]" style={{ color: C.inkSoft }}>{r.title}</span>
                  <Pill tone="haute">{r.status}</Pill>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Arriérés" action={<LinkAction onClick={() => go("finance")}>Voir le détail</LinkAction>}>
          {FINANCIAL_SUMMARY.arrears.length ? FINANCIAL_SUMMARY.arrears.map((a) => (
            <div key={a.period} className="p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: C.ink }}>{a.period}</p>
                  <p className="text-[12px] mt-1" style={{ color: C.inkSoft }}>{a.amount.toLocaleString()} {FINANCIAL_SUMMARY.currency}</p>
                </div>
                <Pill tone="haute">{a.status}</Pill>
              </div>
              <p className="text-[12px] mt-3" style={{ color: C.inkSoft }}><strong>Motif communiqué :</strong> {a.reason}</p>
              <p className="text-[12px] mt-1" style={{ color: C.inkSoft }}><strong>Exigence :</strong> {a.requirement}</p>
            </div>
          )) : <EmptyState icon={DollarSign} text="Aucun arriéré." />}
        </SectionCard>
      </div>

      <SectionCard title="Visioconférence" action={<LinkAction onClick={() => go("video")}>Voir mes réunions</LinkAction>}>
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.copperSoft }}>
            <Video size={22} color={C.copper} />
          </div>
          <p className="text-sm" style={{ color: C.inkSoft }}>Aucune réunion en cours. Vous pouvez rejoindre une réunion programmée.</p>
          <button className="px-4 py-2 rounded-md text-sm font-medium text-white" style={{ background: C.navy }}>
            Voir mes réunions
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dossiers reçus (Inbox)                                               */
/* ------------------------------------------------------------------ */
function Inbox() {
  return (
    <SectionCard title="Documents reçus">
      <div className="space-y-4">
        {RECEIVED_DOCS.map((d) => (
          <div key={d.id} className="p-4 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-medium" style={{ color: C.ink }}>{d.title}</p>
                <p className="text-[13px] mt-0.5" style={{ color: C.inkSoft }}>
                  Envoyé par : {d.sender} · Reçu : {d.when}
                </p>
                <p className="text-[13px] mt-1" style={{ color: C.ink }}>
                  Action demandée : <span style={{ color: C.inkSoft }}>{d.action}</span>
                </p>
                <p className="text-[13px]" style={{ color: C.ink }}>
                  Dossier : <span style={{ color: C.inkSoft }}>{d.case}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Pill tone={priorityTone(d.priority)}>{d.priority}</Pill>
                <Pill tone="info">{d.status}</Pill>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <ActionBtn icon={Eye}>Ouvrir</ActionBtn>
              <ActionBtn icon={Download}>Télécharger</ActionBtn>
              <ActionBtn icon={Send}>Traiter</ActionBtn>
              <ActionBtn icon={Paperclip}>Ajouter une note</ActionBtn>
              <ActionBtn icon={CheckCircle2}>Marquer comme traité</ActionBtn>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ActionBtn({ icon: Icon, children }) {
  return (
    <button
      className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-md"
      style={{ border: `1px solid ${C.line}`, color: C.ink }}
    >
      <Icon size={13} /> {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Mes dossiers                                                         */
/* ------------------------------------------------------------------ */
function Tabs({ tabs, active, setActive }) {
  return (
    <div className="flex gap-1 mb-4 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setActive(t)}
          className="text-[13px] font-medium px-3 py-1.5 rounded-md"
          style={{
            background: active === t ? C.navy : "transparent",
            color: active === t ? "white" : C.inkSoft,
            border: `1px solid ${active === t ? C.navy : C.line}`,
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function Cases() {
  const [tab, setTab] = useState("En cours");
  const filtered = CASES.filter((c) => tab === "Tous" || c.status === tab);
  return (
    <SectionCard title="Mes dossiers">
      <Tabs tabs={["En cours", "À traiter", "En attente", "Terminés", "Urgents"]} active={tab} setActive={setTab} />
      <div className="space-y-3">
        {filtered.length === 0 && <EmptyState icon={Folder} text="Aucun dossier dans cette catégorie." />}
        {filtered.map((c) => (
          <div key={c.id} className="p-4 rounded-md flex items-center justify-between gap-3" style={{ border: `1px solid ${C.line}` }}>
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: C.ink }}>{c.title}</p>
              <p className="text-[12.5px]" style={{ color: C.inkSoft }}>
                {c.owner} · Rôle : {c.role} · Échéance {c.due}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Pill tone="neutral">{c.confidentiality}</Pill>
              <Pill tone={priorityTone(c.priority)}>{c.priority}</Pill>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Mes tâches                                                           */
/* ------------------------------------------------------------------ */
function TasksView() {
  const [tab, setTab] = useState("À faire");
  const map = { "À faire": "todo", "En cours": "inprogress", "En attente": "onhold", "Terminées": "done" };
  const filtered = TASKS.filter((t) => t.status === map[tab]);
  return (
    <SectionCard title="Mes tâches">
      <Tabs tabs={["À faire", "En cours", "En attente", "Terminées"]} active={tab} setActive={setTab} />
      <div className="space-y-3">
        {filtered.length === 0 && <EmptyState icon={CheckSquare} text="Rien à afficher ici pour le moment." />}
        {filtered.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <Circle size={16} style={{ color: C.inkFaint }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm" style={{ color: C.ink }}>{t.title}</p>
              <p className="text-[12px]" style={{ color: C.inkSoft }}>{t.case} · Échéance {t.due}</p>
            </div>
            <Pill tone={priorityTone(t.priority)}>{t.priority}</Pill>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Demandes de la Direction                                             */
/* ------------------------------------------------------------------ */
function RequestsView() {
  return (
    <SectionCard title="Demandes de la Direction">
      <div className="space-y-4">
        {REQUESTS.map((r) => (
          <div key={r.id} className="p-4 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-medium" style={{ color: C.ink }}>{r.title}</p>
                <p className="text-[12.5px] mt-0.5" style={{ color: C.inkSoft }}>Demandé par : {r.by}</p>
              </div>
              <Pill tone={priorityTone(r.priority)}>{r.priority}</Pill>
            </div>
            <p className="text-sm mt-3" style={{ color: C.ink }}>« {r.text} »</p>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[12.5px]" style={{ color: C.inkSoft }}>Échéance : {r.due}</p>
              <Pill tone="info">{r.status}</Pill>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <ActionBtn icon={CheckCircle2}>Accepter</ActionBtn>
              <ActionBtn icon={MessageSquare}>Demander une précision</ActionBtn>
              <ActionBtn icon={Send}>Soumettre</ActionBtn>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Agenda                                                               */
/* ------------------------------------------------------------------ */
function AgendaView() {
  return (
    <SectionCard title="Agenda — Dimanche 6 septembre 2026">
      <div className="space-y-3">
        {MEETINGS.map((m) => (
          <div key={m.id} className="flex items-center gap-4 p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <div className="text-center shrink-0 w-16">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>{m.time.split(" – ")[0]}</p>
              <p className="text-[11px]" style={{ color: C.inkSoft }}>Siège</p>
              <p className="text-[11px] mt-1" style={{ color: C.copper }}>{m.local} — vous</p>
            </div>
            <div className="w-px self-stretch" style={{ background: C.line }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: C.ink }}>{m.title}</p>
              <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{m.mode} · {m.people} participants</p>
            </div>
            <Pill tone="info">{m.note}</Pill>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Visioconférences                                                     */
/* ------------------------------------------------------------------ */
function VideoView({ enabled }) {
  if (!enabled) {
    return (
      <SectionCard title="Visioconférences">
        <div className="flex flex-col items-center text-center gap-3 py-10">
          <Video size={26} style={{ color: C.inkFaint }} />
          <p className="text-sm font-medium" style={{ color: C.ink }}>Visioconférence indisponible</p>
          <p className="text-[13px] max-w-sm" style={{ color: C.inkSoft }}>
            Cette fonctionnalité a été désactivée pour votre compte par l'administrateur.
          </p>
        </div>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Visioconférences" action={<Pill tone="basse">Disponible</Pill>}>
      <div className="space-y-3">
        {MEETINGS.filter((m) => m.mode === "En ligne").map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <div>
              <p className="text-sm font-medium" style={{ color: C.ink }}>{m.title}</p>
              <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{m.time} · {m.people} participants</p>
            </div>
            <button className="px-3 py-1.5 rounded-md text-[13px] font-medium text-white" style={{ background: C.copper }}>
              Rejoindre
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Communications                                                       */
/* ------------------------------------------------------------------ */
function CommsView() {
  const [selected, setSelected] = useState(CONVERSATIONS[0]);
  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[560px]">
      <div className="bg-white rounded-lg overflow-y-auto" style={{ border: `1px solid ${C.line}` }}>
        {CONVERSATIONS.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="w-full text-left p-4 flex flex-col gap-1"
            style={{
              borderBottom: `1px solid ${C.line}`,
              background: selected.id === c.id ? "#F5F6F8" : "white",
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: C.ink }}>{c.who}</p>
              {c.unread > 0 && (
                <span className="text-[10px] w-4 h-4 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: C.copper }}>
                  {c.unread}
                </span>
              )}
            </div>
            <p className="text-[12.5px] truncate" style={{ color: C.inkSoft }}>{c.preview}</p>
            <p className="text-[11px]" style={{ color: C.inkFaint }}>{c.when}</p>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg flex flex-col" style={{ border: `1px solid ${C.line}` }}>
        <div className="p-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <p className="text-sm font-semibold" style={{ color: C.ink }}>{selected.who}</p>
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          <div className="max-w-[70%] p-3 rounded-lg text-sm" style={{ background: "#F1F3F5", color: C.ink }}>
            {selected.preview}
          </div>
        </div>
        <div className="p-3 flex items-center gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <input
            placeholder="Écrire un message…"
            className="flex-1 text-sm px-3 py-2 rounded-md outline-none"
            style={{ border: `1px solid ${C.line}` }}
          />
          <button className="p-2 rounded-md text-white" style={{ background: C.navy }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */
function DocumentsView() {
  const [q, setQ] = useState("");
  const filtered = DOCUMENTS.filter((d) => d.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <SectionCard title="Bibliothèque documentaire">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md" style={{ border: `1px solid ${C.line}` }}>
          <Search size={15} style={{ color: C.inkFaint }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un document…"
            className="flex-1 text-sm outline-none"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: C.inkSoft, borderBottom: `1px solid ${C.line}` }}>
              <th className="text-left font-medium py-2">Document</th>
              <th className="text-left font-medium py-2 hidden sm:table-cell">Catégorie</th>
              <th className="text-left font-medium py-2 hidden md:table-cell">Auteur</th>
              <th className="text-left font-medium py-2 hidden md:table-cell">Date</th>
              <th className="text-left font-medium py-2">Confidentialité</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="py-3 font-medium" style={{ color: C.ink }}>{d.title}</td>
                <td className="py-3 hidden sm:table-cell" style={{ color: C.inkSoft }}>{d.cat}</td>
                <td className="py-3 hidden md:table-cell" style={{ color: C.inkSoft }}>{d.author}</td>
                <td className="py-3 hidden md:table-cell" style={{ color: C.inkSoft }}>{d.date}</td>
                <td className="py-3"><Pill tone="neutral">{d.conf}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Notes stratégiques                                                   */
/* ------------------------------------------------------------------ */
function NotesView() {
  return (
    <SectionCard title="Notes stratégiques">
      <div className="grid sm:grid-cols-2 gap-3">
        {NOTES.map((n) => (
          <div key={n.id} className="p-4 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium" style={{ color: C.ink }}>{n.title}</p>
              <Pill tone={n.visibility === "Privée" ? "neutral" : "info"}>{n.visibility}</Pill>
            </div>
            <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>Dossier : {n.case}</p>
            <p className="text-[11.5px] mt-2" style={{ color: C.inkFaint }}>Dernière modification : {n.when}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Contacts                                                             */
/* ------------------------------------------------------------------ */
function ContactsView() {
  return (
    <SectionCard title="Contacts">
      <div className="space-y-3">
        {CONTACTS.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <div>
              <p className="text-sm font-medium" style={{ color: C.ink }}>{c.name}</p>
              <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{c.role}</p>
            </div>
            <Pill tone="neutral">{c.tz}</Pill>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                        */
/* ------------------------------------------------------------------ */
function NotificationsView() {
  return (
    <SectionCard title="Notifications">
      <div className="space-y-3">
        {NOTIFICATIONS.map((n) => (
          <div key={n.id} className="flex items-center gap-3 p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: C.copperSoft }}>
              <Bell size={14} color={C.copper} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm" style={{ color: C.ink }}>{n.text}</p>
              <p className="text-[11.5px]" style={{ color: C.inkFaint }}>{n.when}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Situation financière                                                 */
/* ------------------------------------------------------------------ */
function FinancialView() {
  return (
    <div className="space-y-5">
      <SectionCard title="Ma situation financière">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <p className="text-[12px]" style={{ color: C.inkSoft }}>Rémunération mensuelle</p>
            <p className="text-xl font-semibold mt-1" style={{ color: C.ink }}>{FINANCIAL_SUMMARY.monthlySalary.toLocaleString()} {FINANCIAL_SUMMARY.currency}</p>
          </div>
          <div className="p-4 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <p className="text-[12px]" style={{ color: C.inkSoft }}>Dernier salaire</p>
            <p className="text-xl font-semibold mt-1" style={{ color: C.green }}>Versé</p>
            <p className="text-[11.5px] mt-1" style={{ color: C.inkFaint }}>{FINANCIAL_SUMMARY.lastPayment.date}</p>
          </div>
          <div className="p-4 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <p className="text-[12px]" style={{ color: C.inkSoft }}>Paiement actuel</p>
            <p className="text-xl font-semibold mt-1" style={{ color: C.amber }}>En attente</p>
            <p className="text-[11.5px] mt-1" style={{ color: C.inkFaint }}>{FINANCIAL_SUMMARY.currentPayment.amount.toLocaleString()} {FINANCIAL_SUMMARY.currency}</p>
          </div>
          <div className="p-4 rounded-md" style={{ border: `1px solid ${C.line}` }}>
            <p className="text-[12px]" style={{ color: C.inkSoft }}>Total des arriérés</p>
            <p className="text-xl font-semibold mt-1" style={{ color: C.red }}>{FINANCIAL_SUMMARY.arrears.reduce((sum, a) => sum + a.amount, 0).toLocaleString()} {FINANCIAL_SUMMARY.currency}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Historique des paiements">
        <div className="space-y-3">
          {[FINANCIAL_SUMMARY.lastPayment, FINANCIAL_SUMMARY.currentPayment].map((p) => (
            <div key={p.period} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
              <div>
                <p className="text-sm font-medium" style={{ color: C.ink }}>{p.period}</p>
                <p className="text-[12px] mt-1" style={{ color: C.inkSoft }}>{p.amount.toLocaleString()} {FINANCIAL_SUMMARY.currency}{p.date ? ` · ${p.date}` : ` · Échéance prévue : ${p.dueDate}`}</p>
              </div>
              <Pill tone={p.status === "Versé" ? "basse" : "moyenne"}>{p.status}</Pill>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Paiements en attente & arriérés">
        <div className="space-y-3">
          {FINANCIAL_SUMMARY.arrears.map((a) => (
            <div key={a.period} className="p-4 rounded-md" style={{ background: C.redBg, border: `1px solid #F0D2CB` }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.ink }}>{a.period} — {a.amount.toLocaleString()} {FINANCIAL_SUMMARY.currency}</p>
                  <p className="text-[12.5px] mt-2" style={{ color: C.inkSoft }}><strong>Motif communiqué :</strong> {a.reason}</p>
                  <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}><strong>Exigence :</strong> {a.requirement}</p>
                </div>
                <Pill tone="haute">{a.status}</Pill>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Exigences à remplir">
        <div className="space-y-3">
          {FINANCIAL_SUMMARY.requirements.map((r) => (
            <div key={r.id} className="p-4 rounded-md flex flex-wrap items-center justify-between gap-3" style={{ border: `1px solid ${C.line}` }}>
              <div>
                <p className="text-sm font-medium" style={{ color: C.ink }}>{r.title}</p>
                <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>{r.description}</p>
                <p className="text-[11.5px] mt-1" style={{ color: C.inkFaint }}>Échéance : {r.due}</p>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="haute">{r.status}</Pill>
                <ActionBtn icon={Paperclip}>Déposer le document</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sécurité & Sessions                                                  */
/* ------------------------------------------------------------------ */
function SecurityView() {
  return (
    <div className="space-y-5">
      <SectionCard title="Authentification">
        <div className="flex items-center justify-between py-2">
          <p className="text-sm" style={{ color: C.ink }}>Mot de passe</p>
          <button className="text-[13px] font-medium" style={{ color: C.copper }}>Modifier</button>
        </div>
        <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <p className="text-sm" style={{ color: C.ink }}>Authentification à deux facteurs (2FA)</p>
          <Pill tone="basse">Activée</Pill>
        </div>
        <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <p className="text-sm" style={{ color: C.ink }}>Dernière connexion</p>
          <p className="text-[13px]" style={{ color: C.inkSoft }}>Aujourd'hui, 08:14 — Cotonou, Bénin</p>
        </div>
      </SectionCard>

      <SectionCard title="Sessions actives">
        <div className="space-y-3">
          {SESSIONS.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-3">
                <Wifi size={16} style={{ color: C.inkSoft }} />
                <div>
                  <p className="text-sm" style={{ color: C.ink }}>{s.device}</p>
                  <p className="text-[12px]" style={{ color: C.inkSoft }}>{s.location} · {s.when}</p>
                </div>
              </div>
              {!s.current && (
                <button className="text-[12.5px] font-medium" style={{ color: C.red }}>Fermer</button>
              )}
              {s.current && <Pill tone="basse">Actuelle</Pill>}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Journal d'activité">
        <div className="space-y-2 text-[13px]" style={{ color: C.inkSoft }}>
          <p>08:14 — Connexion réussie</p>
          <p>09:42 — Consultation du rapport « Zone X »</p>
          <p>10:05 — Commentaire ajouté sur « Partenaire stratégique »</p>
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App racine                                                           */
/* ------------------------------------------------------------------ */
export default function App() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    fetch("/api/me/permissions", { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error("permissions unavailable"); return r.json(); })
      .then((data) => { if (mounted) setVideoEnabled(Boolean(data?.permissions?.includes?.("CAN_USE_VIDEO_CONFERENCE") || data?.CAN_USE_VIDEO_CONFERENCE)); })
      .catch(() => { if (mounted) setVideoEnabled(false); });
    return () => { mounted = false; };
  }, []);

  const activeItem = NAV.find((n) => n.id === active);

  const views = {
    dashboard: <Dashboard go={setActive} />,
    inbox: <Inbox />,
    cases: <Cases />,
    tasks: <TasksView />,
    requests: <RequestsView />,
    agenda: <AgendaView />,
    video: <VideoView enabled={videoEnabled} />,
    comms: <CommsView />,
    documents: <DocumentsView />,
    notes: <NotesView />,
    finance: <FinancialView />,
    contacts: <ContactsView />,
    notifications: <NotificationsView />,
    security: <SecurityView />,
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: C.bg, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sidebar
        active={active}
        setActive={setActive}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Topbar onOpenMobile={() => setMobileOpen(true)} activeLabel={activeItem?.label} />
        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          {views[active]}
        </main>
      </div>
    </div>
  );
}
