import { useMe } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, User, Mail, Briefcase, Key, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import teamNuria from "@/assets/team-nuria-warm.png";

export default function ProfileView() {
  const { data: me, isLoading, error } = useMe();

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-3xl">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <div className="flex gap-8">
          <Skeleton className="h-48 w-48 rounded-full" />
          <div className="space-y-4 flex-1">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <AlertCircle size={20} className="inline mr-2" />
        Erreur lors du chargement du profil.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto lg:mx-0">
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-serif font-bold text-foreground">Mon Profil</h1>
        <p className="text-muted-foreground mt-1">Gérez vos informations de compte et vos préférences de sécurité.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-card shadow-xl">
              <img 
                src={teamNuria} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2 rounded-full border-2 border-background shadow-lg">
              <Shield size={20} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">{me?.name || "Nuria"}</h2>
            <p className="text-muted-foreground">{me?.role || "Collaborateur Exécutif"}</p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Niveau d'Accès: Confidentiel
          </Badge>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-lg bg-card border border-border space-y-4">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-border/50 pb-2">
              <User size={18} className="text-primary"/>
              Informations Personnelles
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Nom Complet</span>
                <div className="font-medium">{me?.name || "Nuria"}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Email</span>
                <div className="font-medium flex items-center gap-2">
                  <Mail size={14} className="text-muted-foreground" />
                  {me?.email || "nuria@somiren.com"}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Département</span>
                <div className="font-medium flex items-center gap-2">
                  <Briefcase size={14} className="text-muted-foreground" />
                  {me?.department || "Direction Générale"}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Identifiant Somiren</span>
                <div className="font-mono text-sm">{me?.employeeId || "SMR-DIR-042"}</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-card border border-border space-y-4">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-border/50 pb-2">
              <Key size={18} className="text-primary"/>
              Sécurité du Compte
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              La sécurité de votre compte est gérée par le système d'authentification central de Somiren.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" disabled className="border-border">
                Mot de passe géré par l'administrateur
              </Button>
              <Button variant="outline" disabled className="border-border">
                2FA prévue ultérieurement
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}