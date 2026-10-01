import { useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
import { C, SectionCard, PrimaryBtn, Field, Input, Select, Textarea, Feedback } from "./shared";
import { useAdminApi } from "./api";
import { useEffect } from "react";
import MessageThread from "../shared/MessageThread";
import { errMsg } from "../shared/signed";
import { useAdminConversations, useAdminCreateConversation, useAdminMessages, useAdminSendMessage } from "@/hooks/use-workspace";

export default function CommunicationsView() {
  const api = useAdminApi();
  const { data: convs, isLoading, isError, refetch } = useAdminConversations();
  const create = useAdminCreateConversation();
  const [users, setUsers] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [f, setF] = useState({ collaboratorId: "", subject: "", initialMessage: "" });
  const [error, setError] = useState<string | null>(null);
  const msgs = useAdminMessages(sel);
  const send = useAdminSendMessage(sel);
  const current = convs?.find((x: any) => x.conversation.id === sel);

  useEffect(() => { api.get("/admin/collaborators").then(r => setUsers(r.collaborators || [])).catch(() => {}); }, [api]);

  const submit = async () => {
    setError(null);
    try {
      const r = await create.mutateAsync({ collaboratorId: f.collaboratorId, subject: f.subject.trim(), initialMessage: f.initialMessage.trim() || undefined });
      setSel(r.conversation.id); setShowNew(false); setF({ collaboratorId: "", subject: "", initialMessage: "" });
    } catch (e) { setError(errMsg(e, "Création impossible.")); }
  };

  return (
    <div className="space-y-4">
      <Feedback error={error} />
      <SectionCard title="Conversations avec les collaborateurs" action={<PrimaryBtn icon={Plus} onClick={() => setShowNew(!showNew)}>Nouvelle conversation</PrimaryBtn>}>
        {showNew && (
          <div className="mb-5 p-4 rounded-md border space-y-3" style={{ borderColor: C.line }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Collaborateur *">
                <Select value={f.collaboratorId} onChange={(e: any) => setF(s => ({ ...s, collaboratorId: e.target.value }))}>
                  <option value="">Sélectionner...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </Select>
              </Field>
              <Field label="Sujet *"><Input maxLength={300} value={f.subject} onChange={(e: any) => setF(s => ({ ...s, subject: e.target.value }))} /></Field>
              <Field label="Premier message" full><Textarea rows={3} maxLength={10000} value={f.initialMessage} onChange={(e: any) => setF(s => ({ ...s, initialMessage: e.target.value }))} /></Field>
            </div>
            <div className="flex justify-end"><PrimaryBtn icon={Plus} onClick={submit} disabled={create.isPending || !f.collaboratorId || !f.subject.trim()}>{create.isPending ? "Création..." : "Créer"}</PrimaryBtn></div>
          </div>
        )}
        <div className="flex flex-col md:flex-row rounded-md overflow-hidden min-h-[480px]" style={{ border: `1px solid ${C.line}` }}>
          <div className="md:w-1/3 md:border-r overflow-y-auto max-h-64 md:max-h-none border-b md:border-b-0" style={{ borderColor: C.line }}>
            {isLoading ? <p className="p-4 text-sm" style={{ color: C.inkSoft }}>Chargement...</p>
              : isError ? <div className="p-4 text-sm text-red-600">Erreur de chargement. <button className="underline" onClick={() => refetch()}>Réessayer</button></div>
              : !convs?.length ? <p className="p-6 text-sm text-center" style={{ color: C.inkSoft }}>Aucune conversation.</p>
              : convs.map((x: any) => (
                <button key={x.conversation.id} onClick={() => setSel(x.conversation.id)} data-testid={`conversation-${x.conversation.id}`}
                  className="w-full text-left p-3.5 border-b hover:bg-gray-50" style={{ borderColor: C.line, background: sel === x.conversation.id ? C.blueBg : undefined }}>
                  <p className="text-sm font-semibold truncate" style={{ color: C.ink }}>{x.conversation.subject}</p>
                  <p className="text-xs truncate" style={{ color: C.inkSoft }}>{x.collaborator?.fullName}</p>
                </button>
              ))}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            {!sel ? <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ color: C.inkSoft }}><MessageSquare size={36} className="mb-2 opacity-50" /><p className="text-sm">Sélectionnez une conversation</p></div> : (
              <>
                <div className="px-4 py-3 border-b" style={{ borderColor: C.line }}>
                  <p className="text-sm font-semibold" style={{ color: C.ink }}>{current?.conversation.subject}</p>
                  <p className="text-xs" style={{ color: C.inkSoft }}>{current?.collaborator?.fullName} · {current?.collaborator?.email}</p>
                </div>
                <MessageThread key={`admin:${sel}`} prefix="admin" conversationId={sel} mode="upload" messages={msgs.data || []} loading={msgs.isLoading} error={msgs.isError ? "Messages indisponibles." : null}
                  isMine={m => m.senderId !== current?.collaborator?.id} onSend={p => send.mutateAsync(p)} />
              </>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
