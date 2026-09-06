import { useDashboard, useMe, useActivity } from "@/hooks/use-workspace";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle, FileText, Briefcase, CheckSquare, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardOverview() {
  const { data: dashboard, isLoading, error } = useDashboard();
  const { data: activityList } = useActivity();
  const { data: me } = useMe();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <AlertCircle size={20} />
          Erreur de chargement
        </h3>
        <p>Impossible de charger le tableau de bord. Veuillez réessayer plus tard.</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-500/20 text-red-500 border-red-500/30";
      case "HIGH": return "bg-orange-500/20 text-orange-500 border-orange-500/30";
      default: return "bg-primary/20 text-primary border-primary/30";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Bonjour, {me?.name || "Collaborateur"}
        </h1>
        <p className="text-muted-foreground mt-1">Voici le résumé de vos activités prioritaires chez Somiren S.A.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Dossiers Actifs</CardDescription>
            <CardTitle className="text-3xl">{dashboard?.summary?.activeCases || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/espace-collaborateur/dossiers">
              <span className="text-xs text-primary hover:underline cursor-pointer">Voir les dossiers →</span>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Tâches en Attente</CardDescription>
            <CardTitle className="text-3xl text-orange-400">{dashboard?.summary?.pendingTasks || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/espace-collaborateur/taches">
              <span className="text-xs text-primary hover:underline cursor-pointer">Voir les tâches →</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Notifications Non Lues</CardDescription>
            <CardTitle className="text-3xl text-primary">{dashboard?.summary?.unreadNotifications || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/espace-collaborateur/notifications">
              <span className="text-xs text-primary hover:underline cursor-pointer">Voir les notifications →</span>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Cases */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Briefcase size={20} className="text-primary" />
              Dossiers Récents
            </h2>
          </div>
          <div className="space-y-3">
            {(dashboard?.recentCases?.length ?? 0) > 0 ? (
              dashboard?.recentCases?.map((c: any) => (
                <div key={c.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs text-muted-foreground">{c.reference}</span>
                    <Badge variant="outline" className={getPriorityColor(c.priority)}>
                      {c.priority}
                    </Badge>
                  </div>
                  <h3 className="font-bold">{c.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {new Date(c.dueDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle size={12} /> {c.progress}% complété
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground bg-secondary/20 rounded-lg border border-border/30">
                Aucun dossier récent
              </div>
            )}
          </div>
        </section>

        {/* Priority Tasks */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckSquare size={20} className="text-orange-400" />
              Tâches Prioritaires
            </h2>
          </div>
          <div className="space-y-3">
            {(dashboard?.priorityTasks?.length ?? 0) > 0 ? (
              dashboard?.priorityTasks?.map((t: any) => (
                <div key={t.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={t.status === "DONE" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}>
                      {t.status}
                    </Badge>
                  </div>
                  <h3 className="font-bold">{t.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground bg-secondary/20 rounded-lg border border-border/30">
                Aucune tâche prioritaire
              </div>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4 mt-8">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity size={20} className="text-muted-foreground" />
            Activités Récentes
          </h2>
        </div>
        <div className="space-y-3">
          {activityList?.length > 0 ? (
            activityList.slice(0, 5).map((act: any) => (
              <div key={act.id} className="p-3 rounded-lg bg-transparent border border-border/30 flex items-center gap-4 text-sm">
                <div className="text-muted-foreground">{new Date(act.timestamp).toLocaleDateString()}</div>
                <div className="text-foreground">{act.description}</div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground border border-border/30 rounded-lg">
              Aucune activité récente
            </div>
          )}
        </div>
      </section>
    </div>
  );
}