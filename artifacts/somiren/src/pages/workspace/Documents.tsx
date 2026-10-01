import { useState } from "react";
import { FileText, Search, Download } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, Tabs, EmptyState } from "./components/UI";
import { useDocuments } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export default function Documents() {
  const { w, dateLocale, locale, lang } = useWorkspaceLocale();
  const [tab, setTab] = useState("all");
  const { data: documents, isLoading, isError, error, refetch } = useDocuments();
  const [search, setSearch] = useState("");
  const filtered = (documents || []).filter((d: any) => (!search || String(d.title || "").toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))) && (tab === "all" || d.category === tab));

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Bibliothèque documentaire", "Document library")}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={w("Rechercher un document...", "Search documents...")}
              aria-label={w("Rechercher dans la bibliothèque documentaire", "Search the document library")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
        </div>
      </div>

      {isError && <p role="alert" className="text-sm text-red-600">{error instanceof Error ? localizeApiMessage(error.message, lang) : w("Bibliothèque indisponible.", "Library unavailable.")} <button className="underline" onClick={() => refetch()}>{w("Réessayer", "Try again")}</button></p>}

      <Tabs tabs={["all", "Rapports", "Contrats", "Stratégie", "Procédures"].map(category => category === "all" ? w("Tous les documents", "All documents") : categoryLabel(category, w))} active={tab === "all" ? w("Tous les documents", "All documents") : categoryLabel(tab, w)} setActive={label => setTab(label === w("Tous les documents", "All documents") ? "all" : categoryValue(label, w))} />

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">{w("Titre du document", "Document title")}</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">{w("Catégorie", "Category")}</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">{w("Date", "Date")}</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">{w("Confidentialité", "Confidentiality")}</th>
                <th className="px-5 py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={FileText} text={w("Aucun document dans la bibliothèque.", "No documents in the library.")} />
                  </td>
                </tr>
              ) : (
                filtered.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[250px]">
                      <p className="font-medium" style={{ color: C.ink }}>{d.title}</p>
                      <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>{d.format}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                      {categoryLabel(d.category, w)}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell" style={{ color: C.inkSoft }}>
                      {format(new Date(d.createdAt), "dd MMM yyyy", { locale: dateLocale })}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <Pill tone="neutral">{w("Standard", "Standard")}</Pill>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button disabled className="p-2 rounded opacity-50 cursor-not-allowed" title={w("Télécharger", "Download")} aria-label={w("Télécharger", "Download")}>
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

function categoryLabel(category: string, w: (french: string, english: string) => string) {
  if (category === "general") return w("Général", "General");
  const labels: Record<string, [string, string]> = {
    Rapports: ["Rapports", "Reports"],
    Contrats: ["Contrats", "Contracts"],
    Stratégie: ["Stratégie", "Strategy"],
    Procédures: ["Procédures", "Procedures"],
  };
  const label = labels[category];
  return label ? w(...label) : category;
}

function categoryValue(label: string, w: (french: string, english: string) => string) {
  const categories = ["Rapports", "Contrats", "Stratégie", "Procédures"];
  return categories.find(category => categoryLabel(category, w) === label) || label;
}
