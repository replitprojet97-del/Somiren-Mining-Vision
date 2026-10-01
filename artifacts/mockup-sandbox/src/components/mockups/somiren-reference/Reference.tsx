import { useState } from "react";
import {
  Bell, CalendarDays, CheckSquare, ChevronDown, ChevronRight,
  CircleHelp, ClipboardList, Clock3, Download, FileText, Folder, Home,
  Lightbulb, LogOut, Menu, MessageSquare, MoreVertical, NotebookPen, Settings,
  ShieldCheck, Users, Video, BriefcaseBusiness, MessageCircle,
} from "lucide-react";
import "./Reference.css";

const navItems = [
  { label: "Tableau de bord", icon: Home },
  { label: "Mes dossiers", icon: Folder },
  { label: "Documents", icon: FileText, badge: "2" },
  { label: "Mes tâches", icon: CheckSquare },
  { label: "Agenda & Réunions", icon: CalendarDays },
  { label: "Visioconférences", icon: Video },
  { label: "Communications", icon: MessageSquare, badge: "1" },
  { label: "Notes stratégiques", icon: NotebookPen },
  { label: "Contacts", icon: Users },
  { label: "Sécurité & Sessions", icon: Settings },
];
const cards = [
  { label: "À traiter", value: "2", icon: BriefcaseBusiness, tone: "red", action: "Voir les documents" },
  { label: "Documents reçus", value: "2", icon: FileText, tone: "blue", action: "Voir les documents" },
  { label: "Dossiers en cours", value: "1", icon: Folder, tone: "green", action: "Voir mes dossiers" },
  { label: "Réunions à venir", value: "0", icon: CalendarDays, tone: "violet", action: "Voir l'agenda" },
  { label: "Communications", value: "1", icon: MessageCircle, tone: "cyan", action: "Voir les messages" },
];

function Empty({ icon: Icon, title, text, button }: { icon: typeof CalendarDays; title: string; text: string; button?: string }) {
  return <div className="sr-empty"><Icon size={31}/><strong>{title}</strong><span>{text}</span>{button && <button className="sr-outline">{button}</button>}</div>;
}

export function Reference() {
  const [active, setActive] = useState("Tableau de bord");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const now = new Date("2026-09-10T21:58:00+02:00");
  const dateText = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "Europe/Paris" }).format(now);
  const timeText = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris", hour12: false }).format(now);
  const go = (label: string) => { setActive(label); setMobileOpen(false); };

  return <div className="sr-app">
    <header className="sr-top">
      <button className="sr-mobile-menu" aria-label="Ouvrir le menu" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
      <div className="sr-brand"><img src="/__mockup/images/somiren-reference/logo.svg" alt="Somiren S.A."/><div><b>SOMIREN S.A.</b><small>EXCELLENCE MINIÈRE, AVENIR DURABLE</small></div></div>
      <div className="sr-top-tools">
        <div className="sr-date"><CalendarDays size={16}/><span>{dateText}</span></div><i/>
        <div className="sr-time"><Clock3 size={14}/>{timeText} (UTC+2)</div><i/>
        <div className="sr-relative"><button className="sr-locale" onClick={() => setLanguageOpen(!languageOpen)} aria-label="Langue française"><span className="sr-flag"/> <span>FR</span><ChevronDown size={11}/></button>{languageOpen && <div className="sr-popover sr-locale-pop"><button onClick={() => setLanguageOpen(false)}><span className="sr-flag"/>　Français</button></div>}</div>
        <div className="sr-relative"><button className="sr-icon-btn" aria-label="Notifications" onClick={() => setNotice(!notice)}><Bell size={18}/><em>2</em></button>{notice && <div className="sr-popover sr-notice-pop"><b>Notifications</b><span>Nouveau document reçu</span><span>Demande de la Direction</span></div>}</div>
        <div className="sr-relative"><button className="sr-user" onClick={() => setProfileOpen(!profileOpen)} aria-label="Profil de Nuria Molero Rodriguez"><img src="/__mockup/images/somiren-reference/profile-reference.jpg" alt=""/><span><b>Nuria Molero Rodriguez</b><small>Assistante exécutive & conseillère stratégique</small></span><ChevronDown size={12}/></button>{profileOpen && <div className="sr-popover sr-profile-pop"><button onClick={() => { setProfileOpen(false); go("Sécurité & Sessions"); }}>Sécurité & Sessions</button><button onClick={() => setProfileOpen(false)}>Mon profil</button></div>}</div>
      </div>
    </header>
    <div className="sr-workspace">
      {mobileOpen && <button className="sr-scrim" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)}/>}
      <aside className={`sr-sidebar ${mobileOpen ? "sr-open" : ""}`}>
        <nav>{navItems.map(({ label, icon: Icon, badge }) => <button key={label} className={`sr-nav-item ${active === label ? "sr-active" : ""}`} onClick={() => go(label)}><Icon size={17}/><span>{label}</span>{badge && <em>{badge}</em>}</button>)}</nav>
        <div className="sr-side-bottom"><div className="sr-connected"><i/>Connectée</div><button className="sr-support" onClick={() => setNotice(true)}><CircleHelp size={17}/>Aide & Support</button><button className="sr-logout" onClick={() => setProfileOpen(true)}><LogOut size={16}/>Déconnexion</button></div>
      </aside>
      <main className="sr-main">
        <div className="sr-content">
          <section className="sr-welcome">
            <img className="sr-mine-bg" src="/__mockup/images/somiren-reference/mine-banner.jpg" alt="Camion minier dans une carrière"/>
            <div className="sr-welcome-shade"/>
            <img className="sr-avatar" src="/__mockup/images/somiren-reference/profile-reference.jpg" alt="Nuria Molero Rodriguez"/>
            <div className="sr-welcome-copy"><h1>Nuria Molero Rodriguez</h1><b>Assistante exécutive &amp; Conseillère stratégique</b><p>• Coordination, organisation et soutien stratégique au service de la Direction.</p></div>
          </section>
          <section className="sr-stats" aria-label="Indicateurs">
            {cards.map(({ label, value, icon: Icon, tone, action }) => <button className={`sr-stat sr-${tone}`} key={label} onClick={() => go(label)}><span className="sr-stat-icon"><Icon size={17}/></span><span className="sr-stat-name">{label}</span><strong>{value}</strong><small>{action} <ChevronRight size={10}/></small></button>)}
          </section>
          <div className="sr-dashboard-grid">
            <div className="sr-primary-col">
              <section className="sr-panel sr-documents">
                <header><div><FileText/><div><h2>Documents reçus</h2><p>Quelques documents envoyés aujourd'hui par la Direction à traiter rapidement.</p></div></div><button onClick={() => go("Documents")}>Voir tout <ChevronRight/></button></header>
                <div className="sr-document-row"><FileText/><div><b>Note de synthèse — Réunion de la Direction générale</b><small>Direction générale</small></div><span className="sr-tag sr-new">Nouveau</span><small className="sr-row-date">Reçu le 10 sept. 2026 à 8:40</small><button aria-label="Plus d'options" onClick={() => setNotice(true)}><MoreVertical size={15}/></button></div>
                <div className="sr-document-row"><FileText/><div><b>Dossier de préparation — Comité stratégique</b><small>Direction générale</small></div><span className="sr-tag sr-process">À traiter</span><small className="sr-row-date">Reçu le 10 sept. 2026 à 8:15</small><button aria-label="Plus d'options" onClick={() => setNotice(true)}><MoreVertical size={15}/></button></div>
              </section>
              <section className="sr-panel sr-cases">
                <header><div><Folder/><h2>Mes dossiers</h2></div><button onClick={() => go("Mes dossiers")}>Voir tout <ChevronRight/></button></header>
                <div className="sr-tabs"><button className="selected">En cours (1)</button><button onClick={() => go("Mes dossiers")}>À traiter (0)</button><button onClick={() => go("Mes dossiers")}>Terminés (0)</button><button onClick={() => go("Mes dossiers")}>Urgents (0)</button></div>
                <div className="sr-document-row"><Folder/><div><b>Dossier — Suivi stratégique</b><small>Direction générale</small></div><span className="sr-tag sr-new">Nouveau</span><small className="sr-row-date">10 sept. 2026 · 14:42</small><button aria-label="Plus d'options" onClick={() => setNotice(true)}><MoreVertical size={15}/></button></div>
              </section>
              <div className="sr-lower-grid">
                <section className="sr-panel sr-small-panel"><header><div><ClipboardList/><h2>Mes tâches</h2></div><button onClick={() => go("Mes tâches")}>Voir tout <ChevronRight/></button></header><Empty icon={CalendarDays} title="Aucune tâche assignée" text="Vous serez notifiée dès qu'une tâche vous sera attribuée par la Direction."/></section>
                <section className="sr-panel sr-small-panel"><header><div><Lightbulb className="sr-bulb"/><h2>Notes stratégiques</h2></div><button onClick={() => go("Notes stratégiques")}>Voir tout <ChevronRight/></button></header><Empty icon={FileText} title="Aucune note pour le moment" text="Vous pourrez consulter et créer des notes selon vos besoins."/></section>
              </div>
            </div>
            <div className="sr-secondary-col">
              <section className="sr-panel sr-meetings"><header><div><CalendarDays/><h2>Prochaines réunions</h2></div><button onClick={() => go("Agenda & Réunions")}>Voir tout <ChevronRight/></button></header><Empty icon={CalendarDays} title="Aucune réunion programmée" text="Vous serez informée dès qu'une réunion sera ajoutée." button="Voir mon agenda"/></section>
              <section className="sr-panel sr-finance"><header><div><Home/><h2>Ma situation financière</h2></div><button onClick={() => go("Ma situation financière")}>Voir détail <ChevronRight/></button></header><div className="sr-finance-row"><span className="sr-euro">€</span><div><b>Salaire de septembre 2026</b><small>Non versé</small><small>Le paiement est en cours de traitement.</small></div><span className="sr-status">En attente</span></div><div className="sr-finance-row arrears"><span className="sr-euro">€</span><div><b>Arriérés</b><small>En attente</small><small>Le montant des arriérés est en cours de traitement.</small></div></div></section>
              <section className="sr-panel sr-video"><header><div><Video/><h2>Visioconférence</h2></div><button onClick={() => go("Visioconférences")}>Voir tout <ChevronRight/></button></header><Empty icon={Video} title="Aucune visioconférence en cours" text="Vous serez prévenue dès qu'une réunion vidéo débutera." button="Voir mes réunions"/></section>
            </div>
            <aside className="sr-rail">
              <section className="sr-panel sr-shortcuts"><header><div><CalendarDays/><h2>Mes raccourcis</h2></div></header><div className="sr-shortcut-grid"><button onClick={() => go("Communications")}><MailIcon/><span>Nouveau<br/>message</span></button><button onClick={() => go("Agenda & Réunions")}><CheckSquare/><span>Répondre à<br/>une réunion</span></button><button onClick={() => go("Documents")}><Download/><span>Télécharger<br/>un document</span></button><button onClick={() => go("Notes stratégiques")}><CalendarDays/><span>Créer une<br/>note</span></button></div></section>
              <section className="sr-panel sr-notifications"><header><div><ShieldCheck/><h2>Notifications</h2></div><button onClick={() => setNotice(!notice)}>Voir tout <ChevronRight/></button></header><div className="sr-notification"><span className="sr-n-icon cyan"><FileText/></span><div><b>Nouveau document reçu</b><small>Note de synthèse — Réunion de la Direction générale</small><time>Aujourd'hui à 8:40</time></div><i/></div><div className="sr-notification"><span className="sr-n-icon violet"><BriefcaseBusiness/></span><div><b>Demande de la Direction</b><small>Préparation du dossier stratégique</small><time>Aujourd'hui à 8:15</time></div><i/></div><div className="sr-notification"><span className="sr-n-icon teal"><MessageSquare/></span><div><b>Message de la Direction</b><small>Informations importantes disponibles</small><time>Aujourd'hui à 11:15</time></div></div></section>
              <section className="sr-mountain"><img src="/__mockup/images/somiren-reference/mountains.jpg" alt="Montagnes et forêt de pins"/><div>Ensemble vers une exploitation minière responsable et durable.</div></section>
            </aside>
          </div>
          <footer className="sr-footer"><span>SOMIREN S.A.　|　 Excellence minière, avenir durable</span><span>Espace Collaborateur — Nuria Molero Rodriguez</span></footer>
        </div>
      </main>
    </div>
  </div>;
}

function MailIcon() { return <MessageSquare size={15}/>; }

export default Reference;