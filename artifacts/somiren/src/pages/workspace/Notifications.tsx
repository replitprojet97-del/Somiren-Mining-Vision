import { Bell, CheckCircle2 } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, EmptyState } from "./components/UI";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-workspace";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Notifications</h1>
        <button disabled className="text-sm font-medium opacity-50 cursor-not-allowed" style={{ color: C.copper }}>
          Tout marquer comme lu
        </button>
      </div>

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        {!notifications?.length ? (
          <div className="py-12">
            <EmptyState icon={Bell} text="Aucune notification." />
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: C.line }}>
            {notifications.map((n: any) => (
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
                    <h3 className="font-semibold text-sm" style={{ color: C.ink }}>{n.title || "Notification"}</h3>
                    <span className="text-[11px] whitespace-nowrap" style={{ color: C.inkFaint }}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{n.message || n.body}</p>
                  {!n.isRead && (
                    <button 
                      onClick={() => markRead.mutate(n.id)}
                      className="text-[12px] font-medium hover:underline mt-1" 
                      style={{ color: C.copper }}
                    >
                      Marquer comme lue
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
