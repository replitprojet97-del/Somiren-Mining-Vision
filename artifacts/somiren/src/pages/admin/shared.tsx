import { ReactNode } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import logoPath from "@/assets/logo.svg";

export { logoPath };

export const C = {
  navy: "#0E2233",
  navySoft: "#16324A",
  navyLine: "#25445F",
  accent: "#8C3B33",
  accentSoft: "#F5E7E4",
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

export function Pill({ tone = "neutral", children }: { tone?: string, children: ReactNode }) {
  const tones: any = {
    neutral: { bg: "#EEF1F3", fg: C.inkSoft },
    haute: { bg: C.redBg, fg: C.red },
    moyenne: { bg: C.amberBg, fg: C.amber },
    basse: { bg: C.greenBg, fg: C.green },
    info: { bg: C.blueBg, fg: C.blue },
    actif: { bg: C.greenBg, fg: C.green },
    suspendu: { bg: C.redBg, fg: C.red },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{ background: t.bg, color: t.fg }} className="text-[11.5px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap">
      {children}
    </span>
  );
}

export function priorityTone(p: string) { 
  if (!p) return "neutral";
  const pLower = p.toLowerCase();
  return pLower === "urgent" || pLower === "high" ? "haute" : pLower === "normal" ? "moyenne" : pLower === "low" ? "basse" : "neutral"; 
}

export function PriorityLabel({ p }: { p: string }) {
  if (!p) return null;
  const pLower = p.toLowerCase();
  const map: any = { low: "Basse", normal: "Normale", high: "Haute", urgent: "Urgente" };
  return <>{map[pLower] || p}</>;
}

export function Feedback({ error, success }: { error?: string | null, success?: string | null }) {
  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 mb-4 rounded-md text-sm border bg-red-50 text-red-600 border-red-200">
        <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
      </div>
    );
  }
  if (success) {
    return (
      <div className="flex items-center gap-2 p-3 mb-4 rounded-md text-sm border bg-green-50 text-green-600 border-green-200">
        <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
      </div>
    );
  }
  return null;
}

export function SectionCard({ title, action, children }: { title: string, action?: ReactNode, children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg" style={{ border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
        <h3 className="text-[15px] font-semibold" style={{ color: C.ink }}>{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function PrimaryBtn({ icon: Icon, children, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center justify-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-md text-white transition-opacity disabled:opacity-50 hover:opacity-90" style={{ background: C.navy }}>
      {Icon && <Icon size={14} />} {children}
    </button>
  );
}

export function GhostBtn({ icon: Icon, children, tone, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-md transition-opacity disabled:opacity-50 bg-white hover:bg-gray-50" style={{ border: `1px solid ${C.line}`, color: tone === "danger" ? C.red : C.ink }}>
      {Icon && <Icon size={13} />} {children}
    </button>
  );
}

export function Field({ label, children, full }: any) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-[13px] font-medium mb-1.5" style={{ color: C.ink }}>{label}</p>
      {children}
    </div>
  );
}

const inputCls = "w-full text-sm px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-[#8C3B33]/20 bg-white disabled:bg-gray-50 disabled:text-gray-400";

export function Input(props: any) {
  return <input className={inputCls} style={{ border: `1px solid ${C.line}`, color: C.ink }} {...props} />;
}
export function Select(props: any) {
  return <select className={inputCls} style={{ border: `1px solid ${C.line}`, color: C.ink }} {...props} />;
}
export function Textarea(props: any) {
  return <textarea className={inputCls} style={{ border: `1px solid ${C.line}`, color: C.ink }} {...props} />;
}
