import { useState } from "react";
import { useDocuments } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText, Download, Eye, Search, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DocumentsView() {
  const { data: documents, isLoading, error } = useDocuments();
  const [searchTerm, setSearchTerm] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <AlertCircle size={20} className="inline mr-2" />
        Erreur lors du chargement des documents.
      </div>
    );
  }

  const filteredDocs = documents?.filter((d: any) => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getFormatIcon = (format: string) => {
    return <FileText size={24} className="text-primary" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
            Documents <Lock size={20} className="text-primary" />
          </h1>
          <p className="text-muted-foreground">Accès sécurisé aux archives et rapports.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Rechercher un document..." 
            className="pl-9 bg-card border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc: any) => (
            <div key={doc.id} className="p-5 rounded-lg bg-card border border-border flex flex-col gap-4 group hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-secondary/50 rounded-lg group-hover:bg-primary/10 transition-colors">
                  {getFormatIcon(doc.format)}
                </div>
                <Badge variant="outline" className="text-[10px] bg-secondary border-border uppercase tracking-widest">
                  {doc.category}
                </Badge>
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold mb-1 line-clamp-1 group-hover:text-primary transition-colors">{doc.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="uppercase">{doc.format}</span>
                  <span>•</span>
                  <span>{doc.size}</span>
                  <span>•</span>
                  <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-2 pt-4 border-t border-border/50">
                <Button variant="outline" size="sm" disabled className="flex-1 text-xs border-border">
                  <Eye size={14} className="mr-2" /> Indisponible
                </Button>
                <Button variant="outline" size="sm" disabled className="flex-1 text-xs border-border">
                  <Download size={14} className="mr-2" /> Indisponible
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-12 text-center text-muted-foreground bg-card rounded-lg border border-border">
            Aucun document trouvé.
          </div>
        )}
      </div>
    </div>
  );
}