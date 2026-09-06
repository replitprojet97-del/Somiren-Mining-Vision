import { useState } from "react";
import { useTasks, useUpdateTask } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Clock, Save, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function TasksView() {
  const { data: tasks, isLoading, error } = useTasks();
  const updateTask = useUpdateTask();
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentValue, setCommentValue] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4 mb-8" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <AlertCircle size={20} className="inline mr-2" />
        Erreur lors du chargement des tâches.
      </div>
    );
  }

  const handleToggleTask = (task: any, checked: boolean) => {
    updateTask.mutate({
      id: task.id,
      data: { status: checked ? "DONE" : "PENDING" }
    });
  };

  const handleSaveComment = (task: any) => {
    updateTask.mutate({
      id: task.id,
      data: { comment: commentValue }
    }, {
      onSuccess: () => {
        setEditingComment(null);
      }
    });
  };

  const pendingTasks = tasks?.filter((t: any) => t.status !== "DONE") || [];
  const completedTasks = tasks?.filter((t: any) => t.status === "DONE") || [];

  const TaskCard = ({ task }: { task: any }) => (
    <div className={`p-4 rounded-lg border flex gap-4 transition-colors ${task.status === 'DONE' ? 'bg-secondary/20 border-border/30 opacity-75' : 'bg-card border-border hover:border-primary/50'}`}>
      <div className="pt-1">
        <Checkbox 
          checked={task.status === "DONE"} 
          onCheckedChange={(c) => handleToggleTask(task, c as boolean)}
          className="w-5 h-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start gap-4">
          <h3 className={`font-bold ${task.status === 'DONE' ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </h3>
          <div className="flex gap-2 shrink-0">
            {task.priority === "URGENT" && (
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 px-1 py-0 text-[10px]">
                Urgent
              </Badge>
            )}
            <Badge variant="outline" className="bg-secondary text-muted-foreground border-border px-1 py-0 text-[10px]">
              Dossier: {task.caseId}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-1">
            <Clock size={14} className={new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "text-red-500" : ""} />
            <span className={new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "text-red-500 font-bold" : ""}>
              Échéance: {new Date(task.dueDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Comment section */}
        <div className="mt-4 pt-3 border-t border-border/50">
          {editingComment === task.id ? (
            <div className="space-y-2">
              <Textarea 
                value={commentValue} 
                onChange={(e) => setCommentValue(e.target.value)}
                placeholder="Ajouter une note ou un rapport d'avancement..."
                className="min-h-[80px] bg-secondary/50 border-border text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingComment(null)}>Annuler</Button>
                <Button size="sm" onClick={() => handleSaveComment(task)} disabled={updateTask.isPending}>
                  <Save size={14} className="mr-1" /> Enregistrer
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="group cursor-pointer flex gap-2 items-start" 
              onClick={() => {
                setEditingComment(task.id);
                setCommentValue(task.comment || "");
              }}
            >
              <div className="flex-1 text-sm bg-secondary/30 p-2 rounded italic text-muted-foreground min-h-[40px]">
                {task.comment ? `"${task.comment}"` : "Cliquer pour ajouter un commentaire / retour..."}
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <FileEdit size={14} className="text-primary" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Tâches & Instructions</h1>
        <p className="text-muted-foreground">Suivi des actions requises et retours à la Direction.</p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-border pb-2">
            À faire <Badge className="ml-2 bg-primary text-primary-foreground">{pendingTasks.length}</Badge>
          </h2>
          {pendingTasks.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pendingTasks.map((t: any) => <TaskCard key={t.id} task={t} />)}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground bg-card rounded-lg border border-border">
              Aucune tâche en attente. Excellent travail !
            </div>
          )}
        </section>

        {completedTasks.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-muted-foreground border-b border-border pb-2">
              Terminées <Badge variant="outline" className="ml-2">{completedTasks.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {completedTasks.map((t: any) => <TaskCard key={t.id} task={t} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}