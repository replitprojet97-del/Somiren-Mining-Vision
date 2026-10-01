import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, EmptyState } from "./components/UI";
import { useMeetings } from "@/hooks/use-workspace";

const parisDateTime = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export default function Agenda() {
  const { data: meetings, isLoading } = useMeetings();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Agenda & Réunions</h1>
        <div className="text-sm px-4 py-2 rounded-md" style={{ background: C.copperSoft, color: C.copper }}>
          <Clock size={16} className="inline mr-2" />
          Heure de Paris (Siège)
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">Réunion</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Horaire (Paris)</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Mode</th>
                <th className="px-5 py-3 font-medium">Statut/Note</th>
              </tr>
            </thead>
            <tbody>
              {!meetings?.length ? (
                <tr>
                  <td colSpan={4} className="py-8">
                    <EmptyState icon={CalendarIcon} text="Aucune réunion prévue." />
                  </td>
                </tr>
              ) : (
                meetings.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[200px]">
                      <p className="font-medium" style={{ color: C.ink }}>{m.title}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                      {parisDateTime.format(new Date(m.startsAt))}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5" style={{ color: C.inkSoft }}>
                        {m.mode === "En ligne" ? <CalendarIcon size={14} /> : <MapPin size={14} />}
                        {m.mode || "En ligne"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Pill tone="info">{m.videoAssetId ? "Vidéo préenregistrée (voir Visioconférences)" : (m.note || "Programmée")}</Pill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
