import type { Lang } from "@/i18n/translations";
import { getActiveLanguage } from "@/lib/workspace-locale";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  COLLABORATOR: "Collaborateur",
  EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR: "Assistante exécutive & Conseillère stratégique",
};

const EN_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  COLLABORATOR: "Collaborator",
  EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR: "Executive Assistant & Strategic Advisor",
};

export function workspaceRoleLabel(role?: string, lang: Lang = getActiveLanguage()): string {
  const labels = lang === "en" ? EN_ROLE_LABELS : ROLE_LABELS;
  return role ? labels[role] ?? labels.COLLABORATOR : labels.COLLABORATOR;
}