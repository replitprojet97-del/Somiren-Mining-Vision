import { useEffect, useRef, useState } from "react";
import { useSearch } from "wouter";
import { MessageSquare, X, Send } from "lucide-react";
import { C } from "@/lib/theme";
import MessageThread from "../shared/MessageThread";
import { useConversations, useCreateConversation, useConversationMessages, useSendConversationMessage, useMe } from "@/hooks/use-workspace";
import { useMarkConversationRead } from "@/hooks/use-message-read";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export default function Comms() {
  const { w, lang, dateLocale } = useWorkspaceLocale();
  const { data: conversations, isLoading, isError, refetch } = useConversations();
  const createConversation = useCreateConversation();
  
  const [sel, setSel] = useState<string | null>(null);
  const me = useMe();
  const msgs = useConversationMessages(sel);
  const sendMsg = useSendConversationMessage(sel);
  const markConversationRead = useMarkConversationRead();
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const composeKindRef = useRef<string | null>(null);
  const defaultSubjectRef = useRef("");
  const subjectEditedRef = useRef(false);
  const search = useSearch();
  const appliedConversationLink = useRef<string | null>(null);
  const markedThrough = useRef<Record<string, number>>({});
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === "visible");

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!pageVisible || isCreating || !sel || !msgs.isSuccess || !Array.isArray(msgs.data) || msgs.data.length === 0) return;
    const maxVisibleMessageId = msgs.data.reduce((max: number, item: any) => {
      const id = Number(item.id);
      return Number.isSafeInteger(id) && id > max ? id : max;
    }, 0);
    if (maxVisibleMessageId <= (markedThrough.current[sel] ?? 0)) return;

    markedThrough.current[sel] = maxVisibleMessageId;
    markConversationRead.mutate({ conversationId: sel, lastReadMessageId: maxVisibleMessageId }, {
      onError: () => {
        if (markedThrough.current[sel] === maxVisibleMessageId) delete markedThrough.current[sel];
      },
    });
  }, [sel, msgs.data, msgs.dataUpdatedAt, msgs.isSuccess, markConversationRead.mutate, pageVisible, isCreating]);

  const composeKind = new URLSearchParams(search).get("compose");
  useEffect(() => {
    const composeKindChanged = composeKindRef.current !== composeKind;
    if (composeKindChanged) composeKindRef.current = composeKind;
    if (composeKind === "meeting" || composeKind === "message" || composeKind === "support") {
      if (composeKindChanged) {
        subjectEditedRef.current = false;
        const defaultSubject = composeSubject(composeKind, lang);
        defaultSubjectRef.current = defaultSubject;
        setIsCreating(true);
        setSubject(defaultSubject);
        setMessage("");
        setSubmitError("");
      } else if (!subjectEditedRef.current && subject === defaultSubjectRef.current) {
        const localizedDefault = composeSubject(composeKind, lang);
        defaultSubjectRef.current = localizedDefault;
        setSubject(localizedDefault);
      }
    }
  }, [composeKind, lang, subject]);

  useEffect(() => {
    if (!conversations?.length) return;
    const requested = new URLSearchParams(search).get("conversation");
    if (requested && requested !== appliedConversationLink.current && conversations.some((c: any) => String(c.id) === requested)) {
      appliedConversationLink.current = requested;
      setSel(requested);
      return;
    }
    if (!requested) appliedConversationLink.current = null;
    setSel(current => {
      if (current && conversations.some((c: any) => String(c.id) === current)) return current;
      return String(conversations[0].id);
    });
  }, [conversations, search]);

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement…", "Loading…")}</div>;

  const handleCreate = async () => {
    if (!subject.trim()) return;
    setSubmitError("");
    try {
      const result = await createConversation.mutateAsync({ subject: subject.trim(), ...(message.trim() ? { initialMessage: message.trim() } : {}) });
      setSel(String(result.conversation.id));
      setIsCreating(false);
      setSubject("");
      setMessage("");
    } catch (error) {
      const fallback = w("Envoi impossible. Votre message est conservé, veuillez réessayer.", "Unable to send. Your message has been kept; please try again.");
      setSubmitError(error instanceof TypeError ? fallback : error instanceof Error ? error.message : fallback);
    }
  };

  return (
    <div className="space-y-5 h-full flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Messages & audios", "Messages & audio")}</h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90" 
          style={{ background: C.copper }}
        >
          {w("Nouveau message", "New message")}
        </button>
      </div>

      <p className="text-sm" style={{ color: C.inkSoft }}>{w("Les messages et audios envoyés par la Direction arrivent ici. Ouvrez une conversation pour écouter l’audio, lire sa transcription et sa traduction, ou répondre au microphone.", "Messages and audio sent by Management appear here. Open a conversation to listen to audio, read its transcript and translation, or reply using the microphone.")}</p>
      {isError && <p role="alert" className="text-sm text-red-600">{w("Impossible de charger vos conversations.", "Unable to load your conversations.")} <button className="underline" onClick={() => refetch()}>{w("Réessayer", "Try again")}</button></p>}
      <div className="flex-1 bg-white rounded-lg flex flex-col md:flex-row overflow-hidden min-h-[500px]" style={{ border: `1px solid ${C.line}` }}>
        <div className="w-full md:w-1/3 md:border-r overflow-y-auto max-h-60 md:max-h-none" style={{ borderColor: C.line }}>
          {!conversations?.length ? (
            <div className="p-8 text-center" style={{ color: C.inkFaint }}>
              <MessageSquare className="mx-auto mb-2 opacity-50" size={24} />
              <p className="text-sm">{w("Aucune conversation", "No conversations")}</p>
            </div>
          ) : (
            conversations.map((c: any) => (
              <div key={c.id} role="button" tabIndex={0} aria-pressed={sel === String(c.id)} onClick={() => setSel(String(c.id))} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(String(c.id)); } }} className="p-4 cursor-pointer hover:bg-gray-50 border-b" style={{ borderColor: C.line, background: sel === String(c.id) ? C.copperSoft : undefined }} data-testid={`conversation-${c.id}`}>
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-sm truncate pr-2" style={{ color: C.ink }}>{c.subject}</p>
                  <span className="text-[11px] whitespace-nowrap" style={{ color: C.inkSoft }}>
                    {format(new Date(c.updatedAt), "dd MMM", { locale: dateLocale })}
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: C.inkSoft }}>{w("Messages, audios et textes bilingues", "Messages, audio and bilingual text")}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          {!sel ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
              <MessageSquare size={48} color={C.line} className="mb-4" />
              <p className="text-sm font-medium" style={{ color: C.inkSoft }}>{w("Sélectionnez une conversation", "Select a conversation")}</p>
            </div>
          ) : (
            <MessageThread key={`workspace:${sel}`} prefix="workspace" conversationId={sel} mode="record" messages={msgs.data || []} loading={msgs.isLoading} error={msgs.isError ? w("Messages indisponibles.", "Messages are unavailable.") : null}
              isMine={(m) => m.senderId === me.data?.id} onSend={(p) => sendMsg.mutateAsync(p)} />
          )}
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: C.line }}>
              <h3 className="font-semibold" style={{ color: C.ink }}>{w("Nouvelle conversation", "New conversation")}</h3>
              <button type="button" onClick={() => setIsCreating(false)} aria-label={w("Fermer", "Close")} className="p-1 rounded hover:bg-gray-100">
                <X size={20} color={C.inkSoft} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {submitError && <p className="text-sm text-red-600" role="alert">{localizeSubmitError(submitError, lang)}</p>}
              <div>
                <label htmlFor="conversation-subject" className="block text-sm font-medium mb-1" style={{ color: C.ink }}>{w("Sujet", "Subject")}</label>
                <input 
                  type="text" 
                  id="conversation-subject"
                  maxLength={300}
                  value={subject}
                   onChange={e => { subjectEditedRef.current = true; setSubject(e.target.value); }}
                  placeholder={w("Sujet de la conversation", "Conversation subject")}
                  className="w-full px-3 py-2 text-sm rounded-md" 
                  style={{ border: `1px solid ${C.line}` }} 
                />
              </div>
              <div>
                <label htmlFor="conversation-first-message" className="block text-sm font-medium mb-1" style={{ color: C.ink }}>{w("Premier message", "First message")}</label>
                <textarea 
                  maxLength={10000}
                  id="conversation-first-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={w("Saisissez votre message…", "Write your message…")}
                  className="w-full px-3 py-2 text-sm rounded-md h-32 resize-none" 
                  style={{ border: `1px solid ${C.line}` }} 
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t" style={{ borderColor: C.line }}>
              <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 rounded-md transition-colors" style={{ color: C.ink }}>{w("Annuler", "Cancel")}</button>
              <button onClick={handleCreate} disabled={!subject.trim() || createConversation.isPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: C.copper }}>
                {createConversation.isPending ? w("Envoi…", "Sending…") : <><Send size={16} /> {w("Envoyer", "Send")}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function composeSubject(kind: "meeting" | "message" | "support", lang: "fr" | "en"): string {
  if (kind === "meeting") return lang === "en" ? "Reply about a meeting" : "Réponse au sujet d’une réunion";
  if (kind === "support") return lang === "en" ? "Help and support request" : "Demande d’aide et support";
  return "";
}

function localizeSubmitError(message: string, lang: "fr" | "en"): string {
  const apiMessage = localizeApiMessage(message, lang);
  if (apiMessage !== message) return apiMessage;
  if (message === "Envoi impossible. Votre message est conservé, veuillez réessayer." || message === "Unable to send. Your message has been kept; please try again.") {
    return lang === "en"
      ? "Unable to send. Your message has been kept; please try again."
      : "Envoi impossible. Votre message est conservé, veuillez réessayer.";
  }
  return message;
}
