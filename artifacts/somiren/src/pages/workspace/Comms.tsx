import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { C } from "@/lib/theme";
import { useConversations, useCreateConversation } from "@/hooks/use-workspace";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Comms() {
  const { data: conversations, isLoading } = useConversations();
  const createConversation = useCreateConversation();
  
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  const handleCreate = async () => {
    if (!subject) return;
    await createConversation.mutateAsync({ subject, initialMessage: message });
    setIsCreating(false);
    setSubject("");
    setMessage("");
  };

  return (
    <div className="space-y-5 h-full flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Communications</h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90" 
          style={{ background: C.copper }}
        >
          Nouveau message
        </button>
      </div>

      <div className="flex-1 bg-white rounded-lg flex overflow-hidden min-h-[500px]" style={{ border: `1px solid ${C.line}` }}>
        <div className="w-1/3 border-r overflow-y-auto" style={{ borderColor: C.line }}>
          {!conversations?.length ? (
            <div className="p-8 text-center" style={{ color: C.inkFaint }}>
              <MessageSquare className="mx-auto mb-2 opacity-50" size={24} />
              <p className="text-sm">Aucune conversation</p>
            </div>
          ) : (
            conversations.map((c: any) => (
              <div key={c.id} className="p-4 cursor-pointer hover:bg-gray-50 border-b" style={{ borderColor: C.line }}>
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-sm truncate pr-2" style={{ color: C.ink }}>{c.subject}</p>
                  <span className="text-[11px] whitespace-nowrap" style={{ color: C.inkSoft }}>
                    {format(new Date(c.updatedAt), "dd MMM", { locale: fr })}
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: C.inkSoft }}>Voir les messages...</p>
              </div>
            ))
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
          <MessageSquare size={48} color={C.line} className="mb-4" />
          <p className="text-sm font-medium" style={{ color: C.inkSoft }}>Sélectionnez une conversation</p>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: C.line }}>
              <h3 className="font-semibold" style={{ color: C.ink }}>Nouvelle conversation</h3>
              <button onClick={() => setIsCreating(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={20} color={C.inkSoft} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: C.ink }}>Sujet</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md" 
                  style={{ border: `1px solid ${C.line}` }} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: C.ink }}>Premier message</label>
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md h-32 resize-none" 
                  style={{ border: `1px solid ${C.line}` }} 
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t" style={{ borderColor: C.line }}>
              <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 rounded-md transition-colors" style={{ color: C.ink }}>Annuler</button>
              <button onClick={handleCreate} disabled={!subject || createConversation.isPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: C.copper }}>
                {createConversation.isPending ? "Envoi..." : <><Send size={16} /> Envoyer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
