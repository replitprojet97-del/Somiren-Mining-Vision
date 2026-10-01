import { Calendar as CalendarIcon, MapPin } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, EmptyState } from "./components/UI";
import { useMeetings } from "@/hooks/use-workspace";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export default function Agenda() {
  const { w, formatDateTime } = useWorkspaceLocale();
  const { data: meetings, isLoading } = useMeetings();

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Agenda & Réunions", "Calendar & Meetings")}</h1>
      </div>

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">{w("Réunion", "Meeting")}</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">{w("Date et heure", "Date & Time")}</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">{w("Mode", "Mode")}</th>
                <th className="px-5 py-3 font-medium">{w("Statut/Note", "Status/Note")}</th>
              </tr>
            </thead>
            <tbody>
              {!meetings?.length ? (
                <tr>
                  <td colSpan={4} className="py-8">
                    <EmptyState icon={CalendarIcon} text={w("Aucune réunion prévue.", "No meetings scheduled.")} />
                  </td>
                </tr>
              ) : (
                meetings.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[200px]">
                      <p className="font-medium" style={{ color: C.ink }}>{m.title}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                       {formatDateTime(m.startsAt)}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5" style={{ color: C.inkSoft }}>
                        {m.mode === "En ligne" ? <CalendarIcon size={14} /> : <MapPin size={14} />}
                         {m.mode && m.mode !== "En ligne" ? m.mode : w("En ligne", "Online")}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                       <Pill tone="info">{m.videoAssetId ? w("Visioconférence (voir Visioconférences)", "Video conference (see Video Conferences)") : (m.note || w("Programmée", "Scheduled"))}</Pill>
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
