import { ArrowRight } from "lucide-react";
import { C } from "@/lib/theme";

export function Pill({ tone = "neutral", children }: { tone?: string, children: React.ReactNode }) {
  const tones: Record<string, { bg: string, fg: string }> = {
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

export function priorityTone(p: string) {
  if (p === "Haute" || p === "urgent" || p === "high") return "haute";
  if (p === "Moyenne" || p === "normal") return "moyenne";
  if (p === "Basse" || p === "low") return "basse";
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
