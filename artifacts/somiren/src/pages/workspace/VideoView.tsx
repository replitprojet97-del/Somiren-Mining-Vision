import { useVideoAccess } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Video, Lock, Info, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VideoView() {
  const { data: access, isLoading, error } = useVideoAccess();

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  // Si on obtient une 401 ou 403, ou si access.allowed === false, on affiche l'accès refusé.
  const isDenied = error || (access && !access.allowed);

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col max-w-5xl mx-auto w-full">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-3xl font-serif font-bold text-foreground">Visioconférence</h1>
        <p className="text-muted-foreground mt-1">Plateforme de communication sécurisée Somiren.</p>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        {isDenied ? (
          <div className="max-w-md w-full p-8 bg-card border border-border rounded-xl shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
            
            <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6 relative">
              <Video size={32} className="text-muted-foreground opacity-50" />
              <div className="absolute -bottom-2 -right-2 bg-background p-1.5 rounded-full">
                <Lock size={20} className="text-red-500" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-3">Accès Non Autorisé</h2>
            
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm mb-6 flex items-start gap-3 w-full text-left">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>
                Vous n'avez pas l'autorisation de démarrer ou de rejoindre une session de visioconférence pour le moment.
              </p>
            </div>
            
            <p className="text-muted-foreground text-sm mb-8">
              Les salles de conférence virtuelles sont générées de manière dynamique pour chaque réunion planifiée. 
              Veuillez vérifier votre agenda ou contacter l'administrateur système pour obtenir un accès.
            </p>
            
              <Button variant="outline" disabled className="w-full border-border flex items-center justify-center gap-2">
                <Calendar size={16} /> Autorisation requise
            </Button>
          </div>
        ) : (
          <div className="max-w-3xl w-full p-8 bg-card border border-border rounded-xl shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                <Video size={32} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Salle d'Attente</h2>
              <p className="text-muted-foreground mb-8">Votre caméra et votre microphone sont actuellement désactivés.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <Button className="w-full h-12 text-lg" asChild>
                  <a href={access.meeting?.url} target="_blank" rel="noreferrer">Rejoindre la réunion</a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Info size={14} /> Toutes les communications sont chiffrées de bout en bout (E2EE).
      </div>
    </div>
  );
}