import { useState } from "react";
import { DollarSign, Upload, AlertCircle, FileText } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, Tabs, EmptyState } from "./components/UI";
import { useFinanceSummary, usePayments, useArrears, usePaymentRequirements } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Finance() {
  const [tab, setTab] = useState("Aperçu");
  
  const { data: summary, isLoading: isLoadingSummary } = useFinanceSummary();
  const { data: payments, isLoading: isLoadingPayments } = usePayments();
  const { data: arrears, isLoading: isLoadingArrears } = useArrears();
  const { data: requirements, isLoading: isLoadingRequirements } = usePaymentRequirements();

  const isLoading = isLoadingSummary || isLoadingPayments || isLoadingArrears || isLoadingRequirements;

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Ma situation financière</h1>
      </div>

      <Tabs tabs={["Aperçu", "Historique des paiements", "Arriérés & Régularisations", "Documents requis"]} active={tab} setActive={setTab} />

      {tab === "Aperçu" && (
        <div className="space-y-5">
          {!summary ? (
             <div className="bg-white rounded-lg py-12" style={{ border: `1px solid ${C.line}` }}>
               <EmptyState icon={DollarSign} text="Aucune donnée financière disponible." />
             </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.line}` }}>
                  <p className="text-[13px] font-medium" style={{ color: C.inkSoft }}>Dernier versement</p>
                  <p className="text-2xl font-semibold mt-2 mb-1" style={{ color: C.ink }}>
                    {summary.lastPaymentAmount ? summary.lastPaymentAmount.toLocaleString() : "0"} {summary.currency || "EUR"}
                  </p>
                  <p className="text-xs" style={{ color: C.inkSoft }}>
                    Le {summary.lastPaymentDate ? format(new Date(summary.lastPaymentDate), "dd MMMM yyyy", { locale: fr }) : "N/A"}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-5" style={{ background: C.amberBg, border: `1px solid ${C.line}` }}>
                  <p className="text-[13px] font-medium" style={{ color: C.amber }}>Paiement actuel</p>
                  <p className="text-2xl font-semibold mt-2 mb-1" style={{ color: C.ink }}>
                    {summary.currentPaymentAmount ? summary.currentPaymentAmount.toLocaleString() : "0"} {summary.currency || "EUR"}
                  </p>
                  <p className="text-xs font-medium" style={{ color: C.amber }}>
                    Statut : En attente
                  </p>
                </div>
                <div className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.line}` }}>
                  <p className="text-[13px] font-medium" style={{ color: C.inkSoft }}>Total arriérés</p>
                  <p className="text-2xl font-semibold mt-2 mb-1" style={{ color: C.ink }}>
                    {arrears?.reduce((acc: number, val: any) => acc + (val.amount || 0), 0).toLocaleString()} {summary.currency || "EUR"}
                  </p>
                  <p className="text-xs" style={{ color: C.inkSoft }}>
                    {arrears?.length || 0} période(s) concernée(s)
                  </p>
                </div>
              </div>
            </>
          )}

          {requirements && requirements.length > 0 && (
            <div className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.redBg}`, background: "#FEF9F8" }}>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} style={{ color: C.red, marginTop: "2px" }} />
                <div className="flex-1">
                  <h3 className="font-semibold text-[15px]" style={{ color: C.ink }}>Action requise : {requirements.length} document(s) en attente</h3>
                  <p className="text-sm mt-1 mb-4" style={{ color: C.inkSoft }}>
                    Des documents sont nécessaires pour finaliser le traitement de vos paiements.
                  </p>
                  <div className="space-y-3">
                    {requirements.map((r: any) => (
                      <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-md" style={{ border: `1px solid ${C.line}` }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: C.ink }}>{r.title}</p>
                          <p className="text-[12px] mt-0.5" style={{ color: C.inkSoft }}>{r.details || "Document requis."}</p>
                        </div>
                        <button disabled className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap opacity-50 cursor-not-allowed" style={{ border: `1px solid ${C.line}`, color: C.ink }}>
                          <Upload size={14} /> Soumettre
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "Historique des paiements" && (
        <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">Période</th>
                <th className="px-5 py-3 font-medium">Montant</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Date de versement</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {!payments?.length ? (
                <tr><td colSpan={4} className="py-8"><EmptyState icon={DollarSign} text="Aucun paiement trouvé." /></td></tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 font-medium" style={{ color: C.ink }}>{p.period}</td>
                    <td className="px-5 py-4" style={{ color: C.ink }}>{p.amount.toLocaleString()} {p.currency || "EUR"}</td>
                    <td className="px-5 py-4 hidden sm:table-cell" style={{ color: C.inkSoft }}>
                      {p.paymentDate ? format(new Date(p.paymentDate), "dd MMM yyyy", { locale: fr }) : "—"}
                    </td>
                    <td className="px-5 py-4"><Pill tone={p.status === "completed" ? "basse" : "neutral"}>{p.status}</Pill></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Arriérés & Régularisations" && (
        <div className="space-y-4">
          {!arrears?.length ? (
             <div className="bg-white rounded-lg py-12" style={{ border: `1px solid ${C.line}` }}>
               <EmptyState icon={DollarSign} text="Aucun arriéré." />
             </div>
          ) : (
            arrears.map((a: any) => (
              <div key={a.id} className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.line}` }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <div>
                    <h3 className="font-semibold text-[15px]" style={{ color: C.ink }}>{a.period}</h3>
                    <p className="text-xl font-semibold mt-1" style={{ color: C.ink }}>{a.amount.toLocaleString()} {a.currency || "EUR"}</p>
                  </div>
                  <Pill tone="haute">{a.status}</Pill>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[12px] uppercase tracking-wider font-semibold mb-1" style={{ color: C.inkFaint }}>Motif communiqué par l'administration</p>
                    <p className="text-sm p-3 bg-gray-50 rounded-md" style={{ color: C.inkSoft }}>{a.reason || "Non spécifié."}</p>
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-wider font-semibold mb-1" style={{ color: C.inkFaint }}>Exigences liées</p>
                    {a.requirement ? (
                      <p className="text-sm p-3 rounded-md flex items-center gap-2" style={{ background: C.redBg, color: C.red }}>
                        <AlertCircle size={16} /> {a.requirement}
                      </p>
                    ) : (
                      <p className="text-sm p-3 bg-gray-50 rounded-md text-gray-500">Aucun document supplémentaire demandé.</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "Documents requis" && (
        <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          {!requirements?.length ? (
             <div className="py-12"><EmptyState icon={FileText} text="Aucun document requis." /></div>
          ) : (
             <table className="w-full text-left text-sm">
                <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
                  <tr>
                    <th className="px-5 py-3 font-medium">Document demandé</th>
                    <th className="px-5 py-3 font-medium hidden md:table-cell">Détails</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td className="px-5 py-4 font-medium" style={{ color: C.ink }}>{r.title}</td>
                      <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>{r.details}</td>
                      <td className="px-5 py-4">
                        <Pill tone={r.status === "pending" ? "haute" : "info"}>{r.status}</Pill>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button disabled className="text-sm font-medium opacity-50 cursor-not-allowed" style={{ color: C.copper }}>Soumettre</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          )}
        </div>
      )}
    </div>
  );
}
