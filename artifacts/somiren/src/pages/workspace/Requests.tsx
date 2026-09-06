import { useState } from "react";
import { Briefcase, Search } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, Tabs, EmptyState } from "./components/UI";
import { useRequests, useUpdateRequest } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Requests() {
  const [tab, setTab] = useState("En cours");
  const { data: requests, isLoading } = useRequests();
  const updateRequest = useUpdateRequest();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  const filtered = requests?.filter((r: any) => {
    if (tab === "Nouvelles") return r.status === "new";
    if (tab === "En cours") return r.status === "accepted" || r.status === "in_progress" || r.status === "revision_required";
    if (tab === "Soumises") return r.status === "submitted" || r.status === "validated";
    if (tab === "Terminées") return r.status === "completed";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Demandes de la Direction</h1>
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

      <Tabs tabs={["Nouvelles", "En cours", "Soumises", "Terminées"]} active={tab} setActive={setTab} />

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">Demande & Description</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Échéance</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Priorité</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!filtered?.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={Briefcase} text="Aucune demande trouvée." />
                  </td>
                </tr>
              ) : (
                filtered.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[250px]">
                      <p className="font-medium" style={{ color: C.ink }}>{r.title}</p>
                      <p className="text-[12.5px] mt-1 line-clamp-2" style={{ color: C.inkSoft }}>{r.description || "Aucune description"}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                      {r.dueAt ? format(new Date(r.dueAt), "dd MMM yyyy", { locale: fr }) : "—"}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Pill tone={priorityTone(r.priority || "normal")}>{r.priority || "Normal"}</Pill>
                    </td>
                    <td className="px-5 py-4">
                      <Pill tone={r.status === "completed" ? "basse" : (r.status === "new" ? "haute" : "info")}>
                        {r.status}
                      </Pill>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {r.status === "new" && (
                        <button
                          onClick={() => updateRequest.mutate({ id: r.id, data: { status: "accepted" } })}
                          className="text-sm font-medium hover:underline"
                          style={{ color: C.copper }}
                        >
                          Accepter
                        </button>
                      )}
                      {(r.status === "accepted" || r.status === "in_progress") && (
                        <button
                          onClick={() => updateRequest.mutate({ id: r.id, data: { status: "submitted" } })}
                          className="text-sm font-medium hover:underline"
                          style={{ color: C.copper }}
                        >
                          Soumettre
                        </button>
                      )}
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
