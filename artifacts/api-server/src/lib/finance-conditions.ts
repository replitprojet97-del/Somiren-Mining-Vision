export const CONDITIONS_VERIFICATION_NOTICE = "Votre signalement a été enregistré. La vérification est en cours. Vous recevrez une notification ou un message de l’administration.";

export function conditionsReportError(
  kind: "arrear" | "salary",
  status: string,
  instructions: string | null,
): string | null {
  const normalized = status.trim().toLocaleLowerCase("fr-FR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if ((kind === "arrear" && normalized !== "open") ||
      (kind === "salary" && ["paid", "sent", "verse", "paye", "paid in full"].includes(normalized))) {
    return "Cette situation est déjà réglée ou clôturée.";
  }
  if (!instructions?.trim()) return "Les consignes n’ont pas encore été communiquées.";
  return null;
}

export function conditionsReviewNotice(status: "acknowledged" | "declined", period: string) {
  return status === "acknowledged"
    ? {
        title: "Signalement pris en compte",
        body: `Votre signalement pour la période « ${period} » a été pris en compte. L’administration poursuit la vérification et vous contactera si nécessaire.`,
      }
    : {
        title: "Signalement non validé",
        body: `Votre signalement pour la période « ${period} » n’a pas été validé. Consultez les consignes ou contactez l’administration pour connaître la suite à donner.`,
      };
}