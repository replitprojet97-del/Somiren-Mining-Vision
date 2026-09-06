import { useLocation } from "wouter";
import { AlertCircle, FileText, Folder, Calendar, DollarSign, Circle, Video, ArrowRight } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, SectionCard, LinkAction, EmptyState } from "./components/UI";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import {
  useDashboard,
  useReceivedDocuments,
  useMeetings,
  useNotes,
  useFinanceSummary,
  useArrears,
  usePaymentRequirements
} from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function StatCard({ icon: Icon, label, value, tone, onClick }: any) {
  const tones: any = {
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { profile } = useWorkspaceAuth();
  
  const { data: dashboard } = useDashboard();
  const { data: receivedDocs } = useReceivedDocuments();
  const { data: meetings } = useMeetings();
  const { data: notes } = useNotes();
  const { data: financeSummary } = useFinanceSummary();
  const { data: arrears } = useArrears();
  const { data: requirements } = usePaymentRequirements();

  const go = (path: string) => setLocation(`/espace-collaborateur/${path}`);

  const urgentCasesCount = dashboard?.urgentCases?.length || 0;
  const docsCount = receivedDocs?.length || 0;
  const casesCount = dashboard?.counts?.cases || 0;
  const meetingsCount = meetings?.length || 0;

  const currentStatus: string = financeSummary?.lastPaymentStatus || "En attente";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="rounded-lg overflow-hidden relative bg-white"
        style={{ border: `1px solid ${C.line}` }}
      >
        <div className="p-6 md:p-7 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gray-200 hidden sm:flex items-center justify-center font-bold text-xl text-gray-600">
            {profile?.fullName?.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold" style={{ color: C.ink }}>
              Bonjour {profile?.fullName?.split(" ")[0]},
            </h1>
            <p className="text-sm mt-0.5" style={{ color: C.inkSoft }}>{profile?.role}</p>
            <p className="text-sm italic mt-2" style={{ color: C.copper }}>
              « Anticiper, coordonner, faciliter les décisions. »
            </p>
          </div>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard icon={AlertCircle} label="À traiter" value={urgentCasesCount} tone="red" onClick={() => go("requests")} />
        <StatCard icon={FileText} label="Documents reçus" value={docsCount} tone="blue" onClick={() => go("inbox")} />
        <StatCard icon={Folder} label="Dossiers en cours" value={casesCount} tone="green" onClick={() => go("cases")} />
        <StatCard icon={Calendar} label="Réunions aujourd'hui" value={meetingsCount} tone="amber" onClick={() => go("agenda")} />
        <StatCard icon={DollarSign} label="Situation financière" value={currentStatus} tone={currentStatus === "Versé" ? "green" : "amber"} onClick={() => go("finance")} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Documents reçus */}
        <SectionCard title="Documents reçus" action={<LinkAction onClick={() => go("inbox")}>Voir tout</LinkAction>}>
          <div className="space-y-3">
            {!receivedDocs?.length && <p className="text-sm text-gray-500">Aucun document reçu.</p>}
            {receivedDocs?.slice(0, 3).map((d: any) => (
              <div key={d.assignment.id} className="flex items-start justify-between gap-3 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: C.ink }}>{d.document.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{format(new Date(d.assignment.createdAt), "dd MMM, HH:mm", { locale: fr })}</p>
                </div>
                <Pill tone={priorityTone(d.assignment.priority || "normal")}>{d.assignment.priority || "Normal"}</Pill>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Prochaines réunions */}
        <SectionCard title="Prochaines réunions" action={<LinkAction onClick={() => go("agenda")}>Voir l'agenda</LinkAction>}>
          <div className="space-y-3">
            {!meetings?.length && <p className="text-sm text-gray-500">Aucune réunion prévue.</p>}
            {meetings?.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between gap-3 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: C.ink }}>{m.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>{format(new Date(m.startsAt), "HH:mm")} - {m.mode || "En ligne"}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Mes tâches" action={<LinkAction onClick={() => go("tasks")}>Voir tout</LinkAction>}>
          <div className="space-y-3">
            {!dashboard?.todayWork?.length && <p className="text-sm text-gray-500">Aucune tâche pour aujourd'hui.</p>}
            {dashboard?.todayWork?.slice(0, 4).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3">
                <Circle size={15} style={{ color: C.inkFaint }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate" style={{ color: C.ink }}>{t.title}</p>
                  <p className="text-[12px]" style={{ color: C.inkSoft }}>{t.dueAt ? format(new Date(t.dueAt), "dd MMM yyyy", { locale: fr }) : "Sans échéance"}</p>
                </div>
                <Pill tone={priorityTone(t.priority || "normal")}>{t.priority || "Normal"}</Pill>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Notes stratégiques" action={<LinkAction onClick={() => go("notes")}>Voir tout</LinkAction>}>
          <div className="space-y-3">
            {!notes?.length && <p className="text-sm text-gray-500">Aucune note.</p>}
            {notes?.slice(0, 4).map((n: any) => (
              <div key={n.id} className="flex items-center justify-between gap-3 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: C.ink }}>{n.title}</p>
                  <p className="text-[12.5px]" style={{ color: C.inkSoft }}>Dernière modification : {format(new Date(n.updatedAt), "dd MMM yyyy", { locale: fr })}</p>
                </div>
                <Pill tone={n.isShared ? "info" : "neutral"}>{n.isShared ? "Partagée" : "Privée"}</Pill>
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
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[12.5px]" style={{ color: C.inkSoft }}>Dernier paiement</p>
                    <p className="text-lg font-semibold mt-1" style={{ color: C.ink }}>
                      {financeSummary.lastPaymentAmount ? financeSummary.lastPaymentAmount.toLocaleString() : "0"} {financeSummary.currency || "EUR"}
                    </p>
                    <p className="text-[12px]" style={{ color: C.inkSoft }}>{financeSummary.lastPaymentDate ? format(new Date(financeSummary.lastPaymentDate), "dd MMM yyyy", { locale: fr }) : "N/A"}</p>
                  </div>
                  <Pill tone="basse">Versé</Pill>
                </div>
              </>
            )}
            {requirements && requirements.length > 0 && (
              <div>
                <p className="text-[12.5px] font-medium" style={{ color: C.ink }}>Exigences à remplir</p>
                {requirements.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 mt-2">
                    <span className="text-[12px]" style={{ color: C.inkSoft }}>{r.title}</span>
                    <Pill tone={r.status === "pending" ? "haute" : "info"}>{r.status}</Pill>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Arriérés" action={<LinkAction onClick={() => go("finance")}>Voir le détail</LinkAction>}>
          {arrears && arrears.length ? arrears.map((a: any) => (
            <div key={a.id} className="p-3 rounded-md" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: C.ink }}>{a.period}</p>
                  <p className="text-[12px] mt-1" style={{ color: C.inkSoft }}>{a.amount.toLocaleString()} {a.currency || "EUR"}</p>
                </div>
                <Pill tone="haute">{a.status}</Pill>
              </div>
              {a.reason && <p className="text-[12px] mt-3" style={{ color: C.inkSoft }}><strong>Motif communiqué :</strong> {a.reason}</p>}
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
          <button onClick={() => go("video")} className="px-4 py-2 rounded-md text-sm font-medium text-white" style={{ background: C.navy }}>
            Voir mes réunions
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
