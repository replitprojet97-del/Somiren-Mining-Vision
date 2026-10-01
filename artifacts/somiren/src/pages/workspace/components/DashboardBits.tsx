import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

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
          <button type="button" onClick={onAction} data-testid={`button-dashboard-${title.toLocaleLowerCase("fr-FR").replaceAll(" ", "-")}`}>
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

export function QueryMessage({ loading, error, children }: { loading?: boolean; error?: boolean; children?: ReactNode }) {
  if (loading) return <div className="sr-query-message" role="status">Chargement…</div>;
  if (error) return <div className="sr-query-message sr-query-error" role="alert">Impossible de charger ces données.</div>;
  return <>{children}</>;
}

export function DashboardRestricted({ children }: { children: ReactNode }) {
  return <div className="sr-query-message" role="status">{children}</div>;
}

export const parisDateTime = (value: string | Date, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...options }).format(new Date(value));