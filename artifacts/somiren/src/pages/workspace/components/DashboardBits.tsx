import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { getActiveLanguage, useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export function DashboardPanel({
  icon: Icon,
  title,
  action,
  onAction,
  children,
  className = "",
  description,
}: {
  icon: LucideIcon;
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
  description?: string;
}) {
  const frenchTitles: Record<string, string> = {
    "Received documents": "Documents reçus",
    "My cases": "Mes dossiers",
    "My tasks": "Mes tâches",
    "Strategic notes": "Notes stratégiques",
    "Upcoming meetings": "Prochaines réunions",
    "My financial information": "Ma situation financière",
    "Video conference": "Visioconférence",
    "My shortcuts": "Mes raccourcis",
    "Notifications": "Notifications",
  };
  return (
    <section className={`sr-panel ${className}`}>
      <header>
        <div>
          <Icon aria-hidden="true" />
          <div className="sr-panel-title">
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
        </div>
        {action && onAction && (
          <button type="button" onClick={onAction} data-testid={`button-dashboard-${(frenchTitles[title] || title).toLocaleLowerCase("fr-FR").replaceAll(" ", "-")}`}>
            {action}<ChevronRight aria-hidden="true" />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

export function DashboardEmpty({
  icon: Icon,
  title,
  text,
  button,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  button?: string;
  onClick?: () => void;
}) {
  return (
    <div className="sr-empty">
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      <span>{text}</span>
      {button && onClick && <button className="sr-outline" type="button" onClick={onClick}>{button}</button>}
    </div>
  );
}

export function QueryMessage({ loading, error, errorMessage, children }: { loading?: boolean; error?: boolean; errorMessage?: string; children?: ReactNode }) {
  const { w, lang } = useWorkspaceLocale();
  if (loading) return <div className="sr-query-message" role="status">{w("Chargement…", "Loading…")}</div>;
  if (error) return <div className="sr-query-message sr-query-error" role="alert">{errorMessage ? localizeApiMessage(errorMessage, lang) : w("Impossible de charger ces données.", "Unable to load this information.")}</div>;
  return <>{children}</>;
}

export function DashboardRestricted({ children }: { children: ReactNode }) {
  return <div className="sr-query-message" role="status">{children}</div>;
}

export const localDateTime = (
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {},
  lang = getActiveLanguage(),
) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", options).format(new Date(value));