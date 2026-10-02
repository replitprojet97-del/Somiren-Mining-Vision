import { Bell, CheckCheck } from "lucide-react";
import { C, SectionCard, GhostBtn, Pill } from "./shared";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeWorkspaceNotification } from "@/lib/workspace-notifications";
import { useAdminNotifications, useAdminMarkNotificationRead, useAdminMarkAllNotificationsRead } from "@/hooks/use-workspace";

export default function NotificationsView() {
  const { lang } = useWorkspaceLocale();
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useAdminNotifications();
  const mark = useAdminMarkNotificationRead();
  const markAll = useAdminMarkAllNotificationsRead();
  const unread = (data || []).filter((n: any) => !n.isRead).length;
  return (
    <SectionCard title={`Notifications privées${unread ? ` (${unread} non lues)` : ""}`}
      action={<GhostBtn icon={CheckCheck} onClick={() => markAll.mutate()} disabled={!unread || markAll.isPending}>Tout marquer comme lu</GhostBtn>}>
      {dataUpdatedAt > 0 && <p className="text-[11px] mb-3" style={{ color: C.inkSoft }}>Actualisé à {new Date(dataUpdatedAt).toLocaleTimeString("fr-FR")}</p>}
      {isLoading ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement...</p>
        : isError ? <p className="text-sm text-red-600">Notifications indisponibles. <button className="underline" onClick={() => refetch()}>Réessayer</button></p>
        : !data?.length ? <div className="text-center py-8" style={{ color: C.inkSoft }}><Bell className="mx-auto mb-2 opacity-50" /><p className="text-sm">Aucune notification.</p></div>
        : <div className="space-y-2">
          {data.map((n: any) => (
            <div key={n.id} className="p-3 rounded-md flex items-start gap-3" style={{ border: `1px solid ${C.line}`, background: n.isRead ? "white" : C.blueBg }} data-testid={`notification-${n.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-medium" style={{ color: C.ink }}>{localizeWorkspaceNotification(n, lang).title || "Notification"}</p>{!n.isRead && <Pill tone="info">Nouvelle</Pill>}</div>
                <p className="text-[13px] mt-0.5 break-words" style={{ color: C.inkSoft }}>{localizeWorkspaceNotification({ ...n, body: n.message || n.body }, lang).body}</p>
                <p className="text-[11px] mt-1" style={{ color: C.inkSoft }}>{new Date(n.createdAt).toLocaleString("fr-FR")}</p>
              </div>
              {!n.isRead && <button className="text-xs underline shrink-0" style={{ color: C.accent }} onClick={() => mark.mutate(n.id)}>Marquer lue</button>}
            </div>
          ))}
        </div>}
    </SectionCard>
  );
}
