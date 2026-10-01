import { ArrowRight } from "lucide-react";
import { C } from "@/lib/theme";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

const PILL_LABELS: Record<string, readonly [string, string]> = {
  "Haute": ["Haute", "High"],
  "High": ["Haute", "High"],
  "Urgente": ["Urgente", "Urgent"],
  "Moyenne": ["Moyenne", "Medium"],
  "Medium": ["Moyenne", "Medium"],
  "Normale": ["Normale", "Normal"],
  "Basse": ["Basse", "Low"],
  "Low": ["Basse", "Low"],
  "Urgent": ["Urgent", "Urgent"],
  "Normal": ["Normal", "Normal"],
  "Activée": ["Activée", "Enabled"],
  "Non configurée": ["Non configurée", "Not configured"],
  "Session actuelle": ["Session actuelle", "Current session"],
  "Current session": ["Session actuelle", "Current session"],
  "Partagée": ["Partagée", "Shared"],
  "Shared": ["Partagée", "Shared"],
  "Privée": ["Privée", "Private"],
  "Private": ["Privée", "Private"],
  "Terminée": ["Terminée", "Completed"],
  "Completed": ["Terminée", "Completed"],
  "À faire": ["À faire", "To do"],
  "To do": ["À faire", "To do"],
  "En cours": ["En cours", "In progress"],
  "In progress": ["En cours", "In progress"],
  "À traiter": ["À traiter", "To review"],
  "To review": ["À traiter", "To review"],
  "Nouveau": ["Nouveau", "New"],
  "New": ["Nouveau", "New"],
  "Nouvelle": ["Nouvelle", "New"],
  "Transmis": ["Transmis", "Submitted"],
  "Submitted": ["Transmis", "Submitted"],
  "Terminé": ["Terminé", "Completed"],
  "Acceptée": ["Acceptée", "Accepted"],
  "Accepted": ["Acceptée", "Accepted"],
  "Refusée": ["Refusée", "Declined"],
  "Declined": ["Refusée", "Declined"],
  "Acknowledged": ["Prise en compte", "Acknowledged"],
  "En attente": ["En attente", "Pending"],
  "Réglé": ["Réglé", "Settled"],
  "Ouvert": ["Ouvert", "Open"],
  "Open": ["Ouvert", "Open"],
  "Archivé": ["Archivé", "Archived"],
  "Suspendu": ["Suspendu", "On hold"],
  "En retard": ["En retard", "Overdue"],
  "Versé": ["Versé", "Paid"],
  "Non versé": ["Non versé", "Unpaid"],
  "Non communiqué": ["Non communiqué", "Not provided"],
  "Programmée": ["Programmée", "Scheduled"],
  "Scheduled": ["Programmée", "Scheduled"],
  "Visioconférence (voir Visioconférences)": ["Visioconférence (voir Visioconférences)", "Video conference (see Video conferences)"],
  "Standard": ["Standard", "Standard"],
  "Autorisé": ["Autorisé", "Authorized"],
  "Authorized": ["Autorisé", "Authorized"],
  "Non autorisé": ["Non autorisé", "Not authorized"],
  "COMPLETED": ["Terminé", "Completed"],
  "ACTIVE": ["En cours", "In progress"],
  "WAITING": ["À traiter", "To review"],
  "received": ["Nouveau", "New"],
  "new": ["Nouveau", "New"],
  "in_progress": ["En cours", "In progress"],
  "active": ["En cours", "In progress"],
  "waiting": ["À traiter", "To review"],
  "submitted": ["Transmis", "Submitted"],
  "completed": ["Terminé", "Completed"],
  "on_hold": ["Suspendu", "On hold"],
  "pending": ["En attente", "Pending"],
  "paid": ["Versé", "Paid"],
  "sent": ["Versé", "Paid"],
  "overdue": ["En retard", "Overdue"],
  "accepted": ["Acceptée", "Accepted"],
  "rejected": ["Refusée", "Declined"],
  "declined": ["Refusée", "Declined"],
  "acknowledged": ["Prise en compte", "Acknowledged"],
  "validated": ["Validée", "Validated"],
  "revision_required": ["Révision requise", "Revision required"],
  "DONE": ["Terminée", "Completed"],
  "todo": ["À faire", "To do"],
  "done": ["Terminée", "Completed"],
  "open": ["Ouvert", "Open"],
  "settled": ["Réglé", "Settled"],
  "archived": ["Archivé", "Archived"],
};

export function Pill({ tone = "neutral", children }: { tone?: string, children: React.ReactNode }) {
  const { lang } = useWorkspaceLocale();
  const tones: Record<string, { bg: string, fg: string }> = {
    neutral: { bg: "#EEF1F3", fg: C.inkSoft },
    haute: { bg: C.redBg, fg: C.red },
    moyenne: { bg: C.amberBg, fg: C.amber },
    basse: { bg: C.greenBg, fg: C.green },
    info: { bg: C.blueBg, fg: C.blue },
  };
  const t = tones[tone] || tones.neutral;
  const pillLabel = typeof children === "string"
    ? PILL_LABELS[children] ?? Object.entries(PILL_LABELS).find(([key]) => key.toLocaleLowerCase() === children.toLocaleLowerCase())?.[1]
    : undefined;
  const label = pillLabel ? pillLabel[lang === "en" ? 1 : 0] : children;
  return (
    <span
      style={{ background: t.bg, color: t.fg }}
      className="text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap"
    >
      {label}
    </span>
  );
}

export function priorityTone(p: string) {
  const priority = p.trim().toLowerCase();
  if (["haute", "urgent", "high"].includes(priority)) return "haute";
  if (["moyenne", "medium", "normal"].includes(priority)) return "moyenne";
  if (["basse", "low"].includes(priority)) return "basse";
  return "neutral";
}

export function SectionCard({ title, action, children, className = "" }: { title: string, action?: React.ReactNode, children: React.ReactNode, className?: string }) {
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

export function LinkAction({ children, onClick }: { children: React.ReactNode, onClick: () => void }) {
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

export function EmptyState({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center" style={{ color: C.inkFaint }}>
      <Icon size={28} className="mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function ActionBtn({ icon: Icon, children, onClick, disabled }: { icon: any, children: React.ReactNode, onClick?: () => void, disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ background: C.copper, color: "white" }}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

export function Tabs({ tabs, active, setActive }: { tabs: string[], active: string, setActive: (t: string) => void }) {
  return (
    <div className="flex items-center gap-6 border-b overflow-x-auto no-scrollbar" style={{ borderColor: C.line }}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setActive(t)}
          className="pb-3 text-sm font-medium whitespace-nowrap transition-colors relative"
          style={{ color: active === t ? C.ink : C.inkFaint }}
        >
          {t}
          {active === t && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-md" style={{ background: C.copper }} />
          )}
        </button>
      ))}
    </div>
  );
}
