import { Bell, CheckCircle2 } from "lucide-react";
import { C } from "@/lib/theme";
import { EmptyState } from "./components/UI";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-workspace";
import { formatDistanceToNow } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeWorkspaceNotification } from "@/lib/workspace-notifications";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export default function Notifications() {
  const { data: notifications, isLoading, isError, error, dataUpdatedAt } = useNotifications();
  const { w, dateLocale, locale, lang } = useWorkspaceLocale();
  const markAll = useMarkAllNotificationsRead();
  const unread = (notifications || []).filter((n: any) => !n.isRead).length;
  const markRead = useMarkNotificationRead();

  if (isLoading) return <div className="p-8 flex justify-center" role="status">{w("Chargement...", "Loading...")}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Notifications", "Notifications")}</h1>
        <div className="flex items-center gap-4">
        {dataUpdatedAt > 0 && <span className="text-[11px]" style={{ color: C.inkFaint }}>{w("Actualisé à", "Updated at")} {new Date(dataUpdatedAt).toLocaleTimeString(locale)}</span>}
        <button onClick={() => markAll.mutate()} disabled={!unread || markAll.isPending} className="text-sm font-medium disabled:opacity-50" style={{ color: C.copper }} data-testid="button-read-all">
          {markAll.isPending ? w("Mise à jour…", "Updating…") : w("Tout marquer comme lu", "Mark all as read")}
        </button>
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        {isError ? (
          <div className="p-8 text-center text-sm text-red-700" role="alert">
            {error instanceof Error
              ? localizeApiMessage(error.message, lang)
              : w("Impossible de charger les notifications.", "Unable to load notifications.")}
          </div>
        ) : !notifications?.length ? (
          <div className="py-12">
            <EmptyState icon={Bell} text={w("Aucune notification.", "No notifications.")} />
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: C.line }}>
            {notifications.map((n: any) => {
              const localized = localizeWorkspaceNotification({ title: n.title, body: n.message || n.body }, lang);
              return (
              <div key={n.id} className={`p-4 sm:p-5 flex items-start gap-4 transition-colors hover:bg-gray-50 ${n.isRead ? 'opacity-60' : 'bg-blue-50/30'}`}>
                <div className="mt-1">
                  {n.isRead ? (
                    <CheckCircle2 size={20} color={C.line} />
                  ) : (
                    <div className="w-2 h-2 mt-2 rounded-full" style={{ background: C.red }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <h3 className="font-semibold text-sm" style={{ color: C.ink }}>{localized.title || w("Notification", "Notification")}</h3>
                    <span className="text-[11px] whitespace-nowrap" style={{ color: C.inkFaint }}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: dateLocale })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{localized.body}</p>
                  {!n.isRead && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="text-[12px] font-medium hover:underline mt-1" 
                      style={{ color: C.copper }}
                    >
                      {w("Marquer comme lue", "Mark as read")}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
