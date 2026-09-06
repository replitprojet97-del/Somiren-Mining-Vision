import { useNotifications, useMarkNotificationRead } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Bell, Info, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationsView() {
  const { data: notifications, isLoading, error } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4 mb-8" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <AlertCircle size={20} className="inline mr-2" />
        Erreur lors du chargement des notifications.
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'URGENT': return <AlertTriangle className="text-red-500" size={20} />;
      case 'SUCCESS': return <CheckCircle className="text-green-500" size={20} />;
      case 'DOCUMENT': return <FileText className="text-blue-500" size={20} />;
      default: return <Info className="text-primary" size={20} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto lg:mx-0">
      <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Vos alertes et mises à jour récentes.</p>
        </div>
        <Bell size={32} className="text-muted-foreground/30" />
      </div>

      <div className="space-y-3">
        {notifications?.length > 0 ? (
          notifications.map((n: any) => (
            <div 
              key={n.id} 
              className={`p-4 rounded-lg flex gap-4 transition-colors ${
                n.isRead 
                  ? "bg-transparent border border-border/50 opacity-60" 
                  : "bg-card border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.05)]"
              }`}
            >
              <div className="pt-1">
                {getIcon(n.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start gap-4">
                  <h4 className={`font-bold ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {n.title}
                  </h4>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
              </div>
              {!n.isRead && (
                <div className="pl-4 border-l border-border/50 flex items-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => markRead.mutate(n.id)}
                    disabled={markRead.isPending}
                    className="h-8 text-xs hover:text-primary"
                  >
                    Marquer lu
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-muted-foreground bg-card rounded-lg border border-border flex flex-col items-center">
            <Bell size={32} className="mb-4 opacity-20" />
            <p>Aucune notification.</p>
          </div>
        )}
      </div>
    </div>
  );
}