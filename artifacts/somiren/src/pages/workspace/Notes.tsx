import { useState } from "react";
import { Brain, Search, MoreVertical, X } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, Tabs, EmptyState } from "./components/UI";
import { useNotes, useCreateNote } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export default function Notes() {
  const { w, dateLocale } = useWorkspaceLocale();
  const [tab, setTab] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const { data: notes, isLoading } = useNotes();
  const createNote = useCreateNote();

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;

  const filtered = notes?.filter((n: any) => {
    if (tab === "private") return !n.isShared;
    if (tab === "shared") return n.isShared;
    return true;
  });

  const handleCreate = async () => {
    if (!newTitle) return;
    await createNote.mutateAsync({ title: newTitle, body: newBody, isShared: false });
    setIsCreating(false);
    setNewTitle("");
    setNewBody("");
  };

  return (
    <div className="space-y-5 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Notes stratégiques", "Strategic notes")}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={w("Rechercher...", "Search...")}
              aria-label={w("Rechercher dans les notes", "Search notes")}
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90 whitespace-nowrap" 
            style={{ background: C.copper }}
          >
            {w("Nouvelle note", "New note")}
          </button>
        </div>
      </div>

      <Tabs tabs={[w("Toutes mes notes", "All my notes"), w("Privées", "Private"), w("Partagées", "Shared")]} active={tab === "all" ? w("Toutes mes notes", "All my notes") : tab === "private" ? w("Privées", "Private") : w("Partagées", "Shared")} setActive={label => setTab(label === w("Toutes mes notes", "All my notes") ? "all" : label === w("Privées", "Private") ? "private" : "shared")} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {!filtered?.length ? (
          <div className="col-span-full py-12 bg-white rounded-lg" style={{ border: `1px solid ${C.line}` }}>
            <EmptyState icon={Brain} text={w("Aucune note stratégique.", "No strategic notes.")} />
          </div>
        ) : (
          filtered.map((n: any) => (
            <div key={n.id} className="bg-white rounded-lg p-5 flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer relative group" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex justify-between items-start mb-3">
                <Pill tone={n.isShared ? "info" : "neutral"}>{n.isShared ? w("Partagée", "Shared") : w("Privée", "Private")}</Pill>
                <button disabled title={w("Plus d’options", "More options")} aria-label={w("Plus d’options", "More options")} className="p-1 rounded opacity-0 group-hover:opacity-50 cursor-not-allowed transition-opacity">
                  <MoreVertical size={16} color={C.inkSoft} />
                </button>
              </div>
              <h3 className="font-semibold text-[15px] mb-2" style={{ color: C.ink }}>{n.title}</h3>
              <p className="text-sm line-clamp-3 mb-4 flex-1 whitespace-pre-wrap" style={{ color: C.inkSoft }}>
                {n.body || w("Aucun contenu", "No content")}
              </p>
              <div className="pt-4 mt-auto text-[12px] flex justify-between items-center" style={{ color: C.inkFaint, borderTop: `1px solid ${C.line}` }}>
                <span>{format(new Date(n.updatedAt), "dd MMM yyyy", { locale: dateLocale })}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-note-title">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: C.line }}>
              <h3 id="new-note-title" className="font-semibold" style={{ color: C.ink }}>{w("Nouvelle note", "New note")}</h3>
              <button onClick={() => setIsCreating(false)} aria-label={w("Fermer", "Close")} title={w("Fermer", "Close")} className="p-1 rounded hover:bg-gray-100">
                <X size={20} color={C.inkSoft} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: C.ink }}>{w("Titre", "Title")}</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md" 
                  style={{ border: `1px solid ${C.line}` }} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: C.ink }}>{w("Contenu", "Content")}</label>
                <textarea 
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md h-32 resize-none" 
                  style={{ border: `1px solid ${C.line}` }} 
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t" style={{ borderColor: C.line }}>
              <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 rounded-md transition-colors" style={{ color: C.ink }}>{w("Annuler", "Cancel")}</button>
              <button onClick={handleCreate} disabled={!newTitle || createNote.isPending} className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: C.copper }}>
                {createNote.isPending ? w("Création...", "Creating...") : w("Créer la note", "Create note")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
