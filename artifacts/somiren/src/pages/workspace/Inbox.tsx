import { FileText, Search } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, ActionBtn, EmptyState } from "./components/UI";
import { useReceivedDocuments, useUpdateReceivedDocument } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Inbox() {
  const { data: docs, isLoading } = useReceivedDocuments();
  const updateDoc = useUpdateReceivedDocument();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Dossiers reçus</h1>
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

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">Document & Instruction</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Échéance</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Priorité</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!docs?.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={FileText} text="Aucun document reçu." />
                  </td>
                </tr>
              ) : (
                docs.map((d: any) => (
                  <tr key={d.assignment.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[250px]">
                      <p className="font-medium" style={{ color: C.ink }}>{d.document.title}</p>
                      <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>{d.assignment.instruction || "Aucune instruction"}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                      {d.assignment.dueAt ? format(new Date(d.assignment.dueAt), "dd MMM yyyy", { locale: fr }) : "—"}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Pill tone={priorityTone(d.assignment.priority || "normal")}>{d.assignment.priority || "Normal"}</Pill>
                    </td>
                    <td className="px-5 py-4">
                      <Pill tone={d.assignment.status === "completed" ? "basse" : "moyenne"}>
                        {d.assignment.status}
                      </Pill>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {d.assignment.status !== "completed" && (
                        <button
                          onClick={() => updateDoc.mutate({ id: d.assignment.id, data: { status: "completed" } })}
                          className="text-sm font-medium hover:underline"
                          style={{ color: C.copper }}
                        >
                          Marquer traité
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
