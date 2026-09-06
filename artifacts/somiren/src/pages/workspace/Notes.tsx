import { useState } from "react";
import { Brain, Search, MoreVertical, X } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, Tabs, EmptyState } from "./components/UI";
import { useNotes, useCreateNote } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Notes() {
  const [tab, setTab] = useState("Toutes mes notes");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const { data: notes, isLoading } = useNotes();
  const createNote = useCreateNote();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  const filtered = notes?.filter((n: any) => {
    if (tab === "Privées") return !n.isShared;
    if (tab === "Partagées") return n.isShared;
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
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Notes stratégiques</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90 whitespace-nowrap" 
            style={{ background: C.copper }}
          >
            Nouvelle note
          </button>
        </div>
      </div>

      <Tabs tabs={["Toutes mes notes", "Privées", "Partagées"]} active={tab} setActive={setTab} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {!filtered?.length ? (
          <div className="col-span-full py-12 bg-white rounded-lg" style={{ border: `1px solid ${C.line}` }}>
            <EmptyState icon={Brain} text="Aucune note stratégique." />
          </div>
        ) : (
          filtered.map((n: any) => (
            <div key={n.id} className="bg-white rounded-lg p-5 flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer relative group" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex justify-between items-start mb-3">
                <Pill tone={n.isShared ? "info" : "neutral"}>{n.isShared ? "Partagée" : "Privée"}</Pill>
                <button disabled className="p-1 rounded opacity-0 group-hover:opacity-50 cursor-not-allowed transition-opacity">
                  <MoreVertical size={16} color={C.inkSoft} />
                </button>
              </div>
              <h3 className="font-semibold text-[15px] mb-2" style={{ color: C.ink }}>{n.title}</h3>
              <p className="text-sm line-clamp-3 mb-4 flex-1 whitespace-pre-wrap" style={{ color: C.inkSoft }}>
                {n.body || "Aucun contenu"}
              </p>
              <div className="pt-4 mt-auto text-[12px] flex justify-between items-center" style={{ color: C.inkFaint, borderTop: `1px solid ${C.line}` }}>
                <span>{format(new Date(n.updatedAt), "dd MMM yyyy", { locale: fr })}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: C.line }}>
              <h3 className="font-semibold" style={{ color: C.ink }}>Nouvelle note</h3>
              <button onClick={() => setIsCreating(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={20} color={C.inkSoft} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: C.ink }}>Titre</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md" 
                  style={{ border: `1px solid ${C.line}` }} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: C.ink }}>Contenu</label>
                <textarea 
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md h-32 resize-none" 
                  style={{ border: `1px solid ${C.line}` }} 
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t" style={{ borderColor: C.line }}>
              <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 rounded-md transition-colors" style={{ color: C.ink }}>Annuler</button>
              <button onClick={handleCreate} disabled={!newTitle || createNote.isPending} className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: C.copper }}>
                {createNote.isPending ? "Création..." : "Créer la note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
