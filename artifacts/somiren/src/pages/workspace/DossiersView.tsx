import { useState } from "react";
import { useCases, useUpdateCase } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText, Search, Clock, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DossiersView() {
  const { data: cases, isLoading, error } = useCases();
  const updateCase = useUpdateCase();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4 mb-8" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <AlertCircle size={20} className="inline mr-2" />
        Erreur lors du chargement des dossiers.
      </div>
    );
  }

  const filteredCases = cases?.filter((c: any) => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.reference.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-500/20 text-red-500 border-red-500/30";
      case "HIGH": return "bg-orange-500/20 text-orange-500 border-orange-500/30";
      default: return "bg-primary/20 text-primary border-primary/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "PENDING": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "CLOSED": return "bg-secondary text-muted-foreground border-border";
      default: return "bg-secondary text-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Dossiers</h1>
          <p className="text-muted-foreground">Gestion de vos dossiers confidentiels.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Rechercher un dossier..." 
            className="pl-9 bg-card border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCases.length > 0 ? (
          filteredCases.map((c: any) => (
            <div 
              key={c.id} 
              onClick={() => setSelectedCase(c)}
              className="p-5 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer group flex flex-col md:flex-row gap-4 justify-between"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {c.reference}
                  </span>
                  <Badge variant="outline" className={getPriorityColor(c.priority)}>
                    {c.priority}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(c.status)}>
                    {c.status}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{c.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-3xl">
                  {c.description}
                </p>
              </div>
              
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 min-w-[120px] text-xs text-muted-foreground border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>Échéance: {new Date(c.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-primary">
                  <CheckCircle size={14} />
                  <span>{c.progress}%</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-muted-foreground bg-card rounded-lg border border-border">
            Aucun dossier ne correspond à votre recherche.
          </div>
        )}
      </div>

      <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent className="sm:max-w-[700px] bg-card text-foreground border-border max-h-[90dvh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {selectedCase.reference}
                  </span>
                  <Badge variant="outline" className={getPriorityColor(selectedCase.priority)}>
                    {selectedCase.priority}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(selectedCase.status)}>
                    {selectedCase.status}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl">{selectedCase.title}</DialogTitle>
                <DialogDescription className="text-muted-foreground mt-2">
                  Créé le {new Date(selectedCase.createdAt || Date.now()).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 my-4">
                <div>
                  <h4 className="font-semibold mb-2 text-primary border-b border-border/50 pb-1">Description</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedCase.description}</p>
                </div>

                {selectedCase.instructions && (
                  <div>
                    <h4 className="font-semibold mb-2 text-primary border-b border-border/50 pb-1 flex items-center gap-2">
                      <FileText size={16} /> Instructions de Direction
                    </h4>
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-md text-sm italic font-serif">
                      "{selectedCase.instructions}"
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Échéance</span>
                    <p className="font-medium mt-1 flex items-center gap-2">
                      <Clock size={16} className="text-primary"/> 
                      {new Date(selectedCase.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Progression</span>
                    <p className="font-medium mt-1 flex items-center gap-2">
                      <CheckCircle size={16} className="text-primary"/> 
                      {selectedCase.progress}%
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-primary border-b border-border/50 pb-1">Mettre à jour la progression</h4>
                  <div className="flex items-center gap-4 mt-3">
                    <input 
                      type="range" 
                      min="0" max="100" step="5"
                      value={selectedCase.progress}
                      onChange={(e) => setSelectedCase({...selectedCase, progress: parseInt(e.target.value)})}
                      className="flex-1 accent-primary"
                    />
                    <span className="w-12 text-right font-mono">{selectedCase.progress}%</span>
                    <Button 
                      size="sm"
                      onClick={() => updateCase.mutate({ 
                        id: selectedCase.id, 
                        data: { progress: selectedCase.progress } 
                      })}
                      disabled={updateCase.isPending}
                    >
                      {updateCase.isPending ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}