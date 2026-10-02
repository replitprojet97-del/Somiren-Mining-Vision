import { useState } from "react";
import { DollarSign, Upload, AlertCircle, FileText } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, Tabs, EmptyState } from "./components/UI";
import { useFinanceSummary, usePayments, useArrears, usePaymentRequirements, useRequestArrearTransfer, useRequestSalaryTransfer } from "@/hooks/use-workspace";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import TransferModal, { type TransferItem, reportStatusLabel } from "./components/TransferModal";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

type FinanceNumberFormatters = {
  formatNumber: (value: number | bigint, options?: Intl.NumberFormatOptions) => string;
  formatMoney: (value: number | bigint, currency: string) => string;
  locale: string;
};

function decimalSeparator(locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    .formatToParts(1.1).find(part => part.type === "decimal")?.value ?? ".";
}

function formatExactAmount(value: string | number | bigint, currency: string, formatters: FinanceNumberFormatters): string {
  const raw = String(value);
  const match = /^(-?)(\d+)(?:\.(\d+))?$/u.exec(raw);
  if (!match) return `${raw} ${currency}`.trim();
  const negative = match[1] === "-";
  const whole = BigInt(match[2]);
  const signedWhole = negative ? -whole : whole;
  const localizedWhole = formatters.formatNumber(signedWhole);
  const code = currency.trim().toUpperCase();
  let localizedMoney: string;
  let currencyDigits = 0;
  try {
    localizedMoney = formatters.formatMoney(signedWhole, currency);
    if (/^[A-Z]{3}$/u.test(code)) {
      currencyDigits = new Intl.NumberFormat(formatters.locale, { style: "currency", currency: code })
        .resolvedOptions().maximumFractionDigits ?? 2;
    }
  } catch {
    localizedMoney = `${localizedWhole} ${currency}`.trim();
  }
  if (!match[3]) return localizedMoney;

  const minus = negative && whole === 0n
    ? new Intl.NumberFormat(formatters.locale).formatToParts(-1).find(part => part.type === "minusSign")?.value ?? "-"
    : "";
  const amountPart = `${minus}${formatters.formatNumber(whole)}${decimalSeparator(formatters.locale)}${match[3]}`;
  const formattedInteger = `${localizedWhole}${currencyDigits ? `${decimalSeparator(formatters.locale)}${"0".repeat(currencyDigits)}` : ""}`;
  return localizedMoney.replace(formattedInteger, amountPart);
}

function formatMinorUnits(cents: bigint, currency: string, formatters: FinanceNumberFormatters): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return formatExactAmount(`${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`, currency, formatters);
}

function knownArrearsTotals(arrears: any[], unknownCurrency: string, formatters: FinanceNumberFormatters) {
  const totals = new Map<string, bigint>();
  let unknown = 0;
  for (const arrear of arrears) {
    if (arrear.status !== "open") continue;
    if (arrear.amount == null) {
      unknown += 1;
      continue;
    }
    const [whole, fraction = ""] = String(arrear.amount).split(".");
    const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
    const currency = arrear.currency || unknownCurrency;
    totals.set(currency, (totals.get(currency) || 0n) + cents);
  }
  const formatted = [...totals.entries()].map(([currency, cents]) => formatMinorUnits(cents, currency, formatters));
  return { formatted, unknown };
}

function arrearStatusLabel(status: string, w: (french: string, english: string) => string) {
  if (status === "open") return w("Ouvert", "Open");
  if (status === "settled") return w("Réglé", "Settled");
  if (status === "archived") return w("Archivé", "Archived");
  return status;
}

function requestStatusLabel(status: string | null | undefined, w: (french: string, english: string) => string) {
  return reportStatusLabel(status, w);
}

export default function Finance() {
  const { w, lang, dateLocale, locale, formatNumber, formatMoney } = useWorkspaceLocale();
  const tabs = [w("Aperçu", "Overview"), w("Historique des paiements", "Payment history"), w("Arriérés & Régularisations", "Arrears & adjustments"), w("Documents requis", "Required documents")];
  const [tab, setTab] = useState(0);
  const transferError: string | null = null;
  const transferSuccess: string | null = null;
  const { profile } = useWorkspaceAuth();
  const permissions = profile?.permissions ?? [];
  const canViewFinancialInfo = permissions.includes("VIEW_OWN_FINANCIAL_INFORMATION");
  const canViewPaymentHistory = permissions.includes("VIEW_OWN_PAYMENT_HISTORY");
  const canViewArrears = permissions.includes("VIEW_OWN_ARREARS");
  const canViewRequirements = permissions.includes("VIEW_OWN_PAYMENT_REQUIREMENTS");

  const { data: cachedSummary, isLoading: isLoadingSummary, isError: summaryError } = useFinanceSummary(canViewFinancialInfo);
  const { data: cachedPayments, isLoading: isLoadingPayments, isError: paymentsError } = usePayments(canViewPaymentHistory);
  const { data: cachedArrears, isLoading: isLoadingArrears, isError: arrearsError } = useArrears(canViewArrears);
  const { data: cachedRequirements, isLoading: isLoadingRequirements, isError: requirementsError } = usePaymentRequirements(canViewRequirements);
  // Disabled queries retain their cache; never display it after access is revoked.
  const summary = canViewFinancialInfo ? cachedSummary : undefined;
  const payments = canViewPaymentHistory ? cachedPayments : undefined;
  const arrears = canViewArrears ? cachedArrears : undefined;
  const requirements = canViewRequirements ? cachedRequirements : undefined;
  const requestTransfer = useRequestArrearTransfer();
  const requestSalaryTransfer = useRequestSalaryTransfer();
  const [modal, setModal] = useState<{ kind: "arrear" | "salary"; item: TransferItem } | null>(null);

  const isLoading = isLoadingSummary || isLoadingPayments || isLoadingArrears || isLoadingRequirements;
  const openModal = (kind: "arrear" | "salary", r: any, amountText: string) => {
    const hasInstr = !!String(r.transferInstructions ?? "").trim();
    const settled = kind === "arrear"
      ? r.status !== "open"
      : ["paid", "sent", "verse", "paye", "paid in full"].includes(String(r.salaryStatus ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""));
    setModal({
      kind,
      item: {
        id: r.id, label: r.periodLabel || "", amountText,
        instructions: r.transferInstructions,
        reason: kind === "arrear" ? r.communicatedReason : r.communicatedDelayReason,
        serviceName: r.payrollServiceName, signature: r.payrollServiceSignature,
        alreadyReported: !!r.conditionsReportedAt,
        requestStatus: r.conditionsReportedAt ? r.transferRequestStatus : null,
        canReport: hasInstr && !settled && r.id != null,
      },
    });
  };
  const followUp = (r: any) => r.conditionsReportedAt ? (
    <p className="text-xs font-medium" style={{ color: C.blue }}>
      {requestStatusLabel(r.transferRequestStatus, w)} · {format(new Date(r.conditionsReportedAt), "dd MMM yyyy", { locale: dateLocale })}
    </p>
  ) : null;
  const numberFormatters = { formatNumber, formatMoney, locale };
  const totalArrears = knownArrearsTotals(arrears || [], w("Devise inconnue", "Unknown currency"), numberFormatters);

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement…", "Loading…")}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Ma situation financière", "My financial overview")}</h1>
      </div>

      {(summaryError || paymentsError || arrearsError || requirementsError) && (
        <div role="alert" className="rounded-lg p-4 text-sm" style={{ border: `1px solid ${C.redBg}`, background: "#FEF9F8", color: C.red }}>
          {w("Certaines données financières sont indisponibles : ", "Some financial data is unavailable: ")}{[summaryError && w("situation financière", "financial overview"), paymentsError && w("historique des paiements", "payment history"), arrearsError && w("arriérés", "arrears"), requirementsError && w("documents requis", "required documents")].filter(Boolean).join(", ")}{w(". Réessayez ultérieurement.", ". Please try again later.")}
        </div>
      )}
      {transferError && <div role="alert" className="rounded-lg p-3 text-sm" style={{ background: C.redBg, color: C.red }}>{localizeTransferError(transferError, lang)}</div>}
      {transferSuccess && <div role="status" className="rounded-lg p-3 text-sm" style={{ background: C.greenBg, color: C.green }}>{localizeTransferSuccess(transferSuccess, lang)}</div>}

      <Tabs tabs={tabs} active={tabs[tab]} setActive={(label) => setTab(Math.max(0, tabs.indexOf(label)))} />

      {tab === 0 && (
        <div className="space-y-5">
          {!summary && !arrears?.length && !summaryError && !arrearsError ? (
             <div className="bg-white rounded-lg py-12" style={{ border: `1px solid ${C.line}` }}>
                <EmptyState icon={DollarSign} text={w("Aucune donnée financière disponible.", "No financial information available.")} />
             </div>
          ) : summary ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.line}` }}>
                    <p className="text-[13px] font-medium" style={{ color: C.inkSoft }}>{w("Période communiquée", "Reported period")}</p>
                  <p className="text-2xl font-semibold mt-2 mb-1" style={{ color: C.ink }}>
                      {summary.periodLabel || w("Non communiquée", "Not provided")}
                  </p>
                    <p className="text-xs" style={{ color: C.inkSoft }}>{w("Situation communiquée par l’administration", "Information provided by the administration")}</p>
                </div>
                <div className="bg-white rounded-lg p-5" style={{ background: C.amberBg, border: `1px solid ${C.line}` }}>
                    <p className="text-[13px] font-medium" style={{ color: C.amber }}>{w("Statut de rémunération", "Salary status")}</p>
                  <p className="text-2xl font-semibold mt-2 mb-1" style={{ color: C.ink }}>
                      {["paid", "sent", "versé"].includes(summary.salaryStatus?.toLowerCase()) ? w("Versé", "Paid")
                        : ["unpaid", "not_paid", "pending", "overdue", "non versé"].includes(summary.salaryStatus?.toLowerCase()) ? w("Non versé", "Unpaid")
                        : summary.salaryStatus || w("Non communiqué", "Not provided")}
                  </p>
                  <p className="text-sm font-semibold mt-2" style={{ color: C.ink }} data-testid="text-salary-amount">{summary.amount == null ? w("Montant non communiqué", "Amount not provided") : formatExactAmount(summary.amount, summary.currency || "", numberFormatters)}</p>
                  <div className="mt-2 space-y-1.5">
                    {followUp(summary)}
                    {summary.id != null && (
                      <button type="button" onClick={() => openModal("salary", summary, summary.amount == null ? w("Montant non communiqué", "Amount not provided") : formatExactAmount(summary.amount, summary.currency || "", numberFormatters))} className="text-xs underline" style={{ color: C.navy }} data-testid="button-view-salary-instructions">{w("Consulter les détails", "View details")}</button>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.line}` }}>
                    <p className="text-[13px] font-medium" style={{ color: C.inkSoft }}>{w("Total des arriérés ouverts connus", "Known total of open arrears")}</p>
                  <p className="text-2xl font-semibold mt-2 mb-1" style={{ color: C.ink }}>
                      {arrearsError ? w("Données indisponibles", "Data unavailable") : totalArrears.formatted.length ? totalArrears.formatted.join(" · ") : w("Montant non communiqué", "Amount not provided")}
                  </p>
                  <p className="text-xs" style={{ color: C.inkSoft }}>
                       {arrearsError ? w("Impossible de calculer le total.", "Unable to calculate the total.") : <>{formatNumber(arrears?.filter((item: any) => item.status === "open").length || 0)} {w("période(s) ouverte(s)", "open period(s)")}
                         {totalArrears.unknown ? ` · ${formatNumber(totalArrears.unknown)} ${w("montant(s) inconnu(s)", "unknown amount(s)")}` : ""}</>}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg py-5 px-6" style={{ border: `1px solid ${C.line}` }}>
              <p className="text-sm" style={{ color: C.inkSoft }}>{summaryError ? w("Situation de rémunération indisponible.", "Salary information is unavailable.") : w("Aucune situation de rémunération disponible.", "No salary information available.")}</p>
              {arrears?.length > 0 && (
                <div className="mt-4 rounded-md p-4" style={{ background: C.amberBg }}>
                  <p className="text-xs font-medium" style={{ color: C.amber }}>{w("Arriérés ouverts", "Open arrears")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C.ink }}>
                    {arrearsError ? w("Données indisponibles", "Data unavailable") : totalArrears.formatted.length ? totalArrears.formatted.join(" · ") : w("Montant non communiqué", "Amount not provided")}
                  </p>
                  <p className="text-xs" style={{ color: C.inkSoft }}>
                     {arrearsError ? w("Nombre de périodes indisponible.", "Number of periods unavailable.") : <>{formatNumber(arrears.filter((item: any) => item.status === "open").length)} {w("période(s) ouverte(s)", "open period(s)")}
                       {totalArrears.unknown ? ` · ${formatNumber(totalArrears.unknown)} ${w("montant(s) inconnu(s)", "unknown amount(s)")}` : ""}</>}
                  </p>
                </div>
              )}
            </div>
          )}

          {requirements && requirements.length > 0 && (
            <div className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.redBg}`, background: "#FEF9F8" }}>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} style={{ color: C.red, marginTop: "2px" }} />
                <div className="flex-1">
                    <h3 className="font-semibold text-[15px]" style={{ color: C.ink }}>{w("Action requise : ", "Action required: ")}{formatNumber(requirements.length)} {w("document(s) en attente", "document(s) pending")}</h3>
                  <p className="text-sm mt-1 mb-4" style={{ color: C.inkSoft }}>
                    {w("Des documents sont nécessaires pour finaliser le traitement de vos paiements.", "Documents are required to complete processing of your payments.")}
                  </p>
                  <div className="space-y-3">
                    {requirements.map((r: any) => (
                      <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-md" style={{ border: `1px solid ${C.line}` }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: C.ink }}>{r.title}</p>
                          <p className="text-[12px] mt-0.5" style={{ color: C.inkSoft }}>{r.details || w("Document requis.", "Required document.")}</p>
                        </div>
                        <button disabled className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap opacity-50 cursor-not-allowed" style={{ border: `1px solid ${C.line}`, color: C.ink }}>
                          <Upload size={14} /> {w("Soumettre", "Submit")}
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

      {tab === 1 && (
        <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          {!canViewPaymentHistory ? (
            <div className="py-8 text-center text-sm" style={{ color: C.inkSoft }}>{w("L’historique des paiements n’est pas accessible avec les permissions de votre compte.", "Payment history is not available with your account permissions.")}</div>
          ) : (
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">{w("Période", "Period")}</th>
                <th className="px-5 py-3 font-medium">{w("Montant", "Amount")}</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">{w("Date de versement", "Payment date")}</th>
                <th className="px-5 py-3 font-medium">{w("Statut", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {!payments?.length ? (
                <tr><td colSpan={4} className="py-8"><EmptyState icon={DollarSign} text={paymentsError ? w("Historique des paiements indisponible.", "Payment history is unavailable.") : w("Aucun paiement trouvé.", "No payments found.")} /></td></tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 font-medium" style={{ color: C.ink }}>{p.periodLabel || w("Période non communiquée", "Period not provided")}</td>
                    <td className="px-5 py-4" style={{ color: C.ink }}>{w("Montant non communiqué", "Amount not provided")}</td>
                    <td className="px-5 py-4 hidden sm:table-cell" style={{ color: C.inkSoft }}>
                      {p.paidAt ? format(new Date(p.paidAt), "dd MMM yyyy", { locale: dateLocale }) : "—"}
                    </td>
                    <td className="px-5 py-4"><Pill tone={p.status === "completed" || p.status === "paid" ? "basse" : "neutral"}>{p.status === "completed" || p.status === "paid" ? w("Réglé", "Paid") : p.status === "pending" ? w("En attente", "Pending") : p.status}</Pill></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-4">
          {!canViewArrears ? (
             <div className="bg-white rounded-lg py-12" style={{ border: `1px solid ${C.line}` }}>
                <EmptyState icon={DollarSign} text={w("Les arriérés ne sont pas accessibles avec les permissions de votre compte.", "Arrears are not available with your account permissions.")} />
             </div>
          ) : arrearsError ? (
             <div className="bg-white rounded-lg py-12" style={{ border: `1px solid ${C.line}` }}>
                <EmptyState icon={DollarSign} text={w("Les arriérés sont indisponibles pour le moment.", "Arrears are currently unavailable.")} />
             </div>
          ) : !arrears?.length ? (
             <div className="bg-white rounded-lg py-12" style={{ border: `1px solid ${C.line}` }}>
                <EmptyState icon={DollarSign} text={w("Aucun arriéré.", "No arrears.")} />
             </div>
          ) : (
            arrears.map((a: any) => (
              <div key={a.id} className="bg-white rounded-lg p-5" style={{ border: `1px solid ${C.line}` }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <div>
                     <h3 className="font-semibold text-[15px]" style={{ color: C.ink }}>{a.periodLabel}</h3>
                       <p className="text-xl font-semibold mt-1" style={{ color: C.ink }}>{a.amount == null ? w("Montant non communiqué", "Amount not provided") : formatExactAmount(a.amount, a.currency || w("Devise non communiquée", "Currency not provided"), numberFormatters)}</p>
                  </div>
                    <Pill tone={a.status === "open" ? "haute" : a.status === "settled" ? "basse" : "neutral"}>{arrearStatusLabel(a.status, w)}</Pill>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {followUp(a) || <span />}
                  <button type="button" onClick={() => openModal("arrear", a, a.amount == null ? w("Montant non communiqué", "Amount not provided") : formatExactAmount(a.amount, a.currency || "", numberFormatters))} className="text-sm underline" style={{ color: C.navy }} data-testid={`button-view-arrear-instructions-${a.id}`}>{w("Consulter les détails", "View details")}</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 3 && (
        <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          {!canViewRequirements ? (
              <div className="py-8 text-center text-sm" style={{ color: C.inkSoft }}>{w("Les documents requis ne sont pas accessibles avec les permissions de votre compte.", "Required documents are not available with your account permissions.")}</div>
          ) : requirementsError ? (
              <div className="py-12"><EmptyState icon={FileText} text={w("Les documents requis sont indisponibles pour le moment.", "Required documents are currently unavailable.")} /></div>
          ) : !requirements?.length ? (
              <div className="py-12"><EmptyState icon={FileText} text={w("Aucun document requis.", "No documents required.")} /></div>
          ) : (
             <table className="w-full text-left text-sm">
                <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
                  <tr>
                    <th className="px-5 py-3 font-medium">{w("Document demandé", "Requested document")}</th>
                    <th className="px-5 py-3 font-medium hidden md:table-cell">{w("Détails", "Details")}</th>
                    <th className="px-5 py-3 font-medium">{w("Statut", "Status")}</th>
                    <th className="px-5 py-3 font-medium text-right">{w("Action", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td className="px-5 py-4 font-medium" style={{ color: C.ink }}>{r.title}</td>
                      <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>{r.details}</td>
                      <td className="px-5 py-4">
                        <Pill tone={r.status === "pending" ? "haute" : "info"}>{r.status === "pending" ? w("En attente", "Pending") : r.status}</Pill>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button disabled className="text-sm font-medium opacity-50 cursor-not-allowed" style={{ color: C.copper }}>{w("Soumettre", "Submit")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          )}
        </div>
      )}
      {modal && (
        <TransferModal
          key={`${modal.kind}-${modal.item.id}`}
          item={modal.item}
          send={id => modal.kind === "salary" ? requestSalaryTransfer.mutateAsync(id) : requestTransfer.mutateAsync(id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function localizeTransferError(message: string, lang: "fr" | "en"): string {
  const apiMessage = localizeApiMessage(message, lang);
  if (apiMessage !== message) return apiMessage;
  if (
    message === "La demande n’a pas pu être enregistrée. Vérifiez son statut avant de réessayer."
    || message === "The request could not be saved. Check its status before trying again."
  ) {
    return lang === "en"
      ? "The request could not be saved. Check its status before trying again."
      : "La demande n’a pas pu être enregistrée. Vérifiez son statut avant de réessayer.";
  }
  return message;
}

function localizeTransferSuccess(message: string, lang: "fr" | "en"): string {
  const french = "Votre demande a été transmise à l’administration. Aucun virement ni paiement n’a été déclenché.";
  const english = "Your request has been sent to the administration. No bank transfer or payment has been initiated.";
  return message === french || message === english ? (lang === "en" ? english : french) : message;
}
