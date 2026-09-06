import { useState } from "react";
import { Folder, Search, MoreVertical } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, ActionBtn, Tabs, EmptyState } from "./components/UI";
import { useCases } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Cases() {
  const [tab, setTab] = useState("Tous");
  const { data: cases, isLoading } = useCases();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  const filtered = cases?.filter((c: any) => {
    if (tab === "En cours") return c.status === "ACTIVE";
    if (tab === "À traiter") return c.status === "WAITING";
    if (tab === "Terminés") return c.status === "COMPLETED";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Mes dossiers</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
        </div>
      </div>

      <Tabs tabs={["Tous", "En cours", "À traiter", "Terminés"]} active={tab} setActive={setTab} />

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">Dossier</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Échéance</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Priorité</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {!filtered?.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={Folder} text="Aucun dossier trouvé." />
                  </td>
                </tr>
              ) : (
                filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[200px]">
                      <p className="font-medium" style={{ color: C.ink }}>{c.title}</p>
                      <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>{c.reference}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                      {c.dueDate ? format(new Date(c.dueDate), "dd MMM yyyy", { locale: fr }) : "—"}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Pill tone={priorityTone(c.priority)}>{c.priority}</Pill>
                    </td>
                    <td className="px-5 py-4">
                      <Pill tone={c.status === "COMPLETED" ? "basse" : "info"}>{c.status}</Pill>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button disabled className="p-1 rounded opacity-50 cursor-not-allowed"><MoreVertical size={16} color={C.inkSoft} /></button>
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
