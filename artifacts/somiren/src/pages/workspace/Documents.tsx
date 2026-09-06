import { useState } from "react";
import { FileText, Search, Download } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, Tabs, EmptyState } from "./components/UI";
import { useDocuments } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Documents() {
  const [tab, setTab] = useState("Tous les documents");
  const { data: documents, isLoading } = useDocuments();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Bibliothèque documentaire</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher un document..."
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
        </div>
      </div>

      <Tabs tabs={["Tous les documents", "Rapports", "Contrats", "Stratégie", "Procédures"]} active={tab} setActive={setTab} />

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">Titre du document</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Catégorie</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Date</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Confidentialité</th>
                <th className="px-5 py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {!documents?.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={FileText} text="Aucun document dans la bibliothèque." />
                  </td>
                </tr>
              ) : (
                documents.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[250px]">
                      <p className="font-medium" style={{ color: C.ink }}>{d.title}</p>
                      <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>{d.format}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                      {d.category}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell" style={{ color: C.inkSoft }}>
                      {format(new Date(d.createdAt), "dd MMM yyyy", { locale: fr })}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <Pill tone="neutral">Standard</Pill>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button disabled className="p-2 rounded opacity-50 cursor-not-allowed" title="Télécharger">
                        <Download size={16} style={{ color: C.copper }} />
                      </button>
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
