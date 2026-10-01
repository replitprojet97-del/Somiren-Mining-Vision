import { useEffect, useRef, useState } from "react";
import { Send, Mic, X } from "lucide-react";
import { AudioComposer } from "@/components/media/AudioComposer";
import { PrivateAudio } from "@/components/media/PrivateAudio";
import { localizePrivateMediaMessage, uploadPrivateFile } from "@/lib/private-media";
import { type AudioDraft, type PrivateMessage } from "@/types/media";
import { errMsg } from "./signed";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

const INK = "#1f2937", SOFT = "#6b7280", LINE = "#e5e7eb", COPPER = "#b4682f";

export default function MessageThread({ messages, isMine, onSend, mode, loading, error: loadError, prefix, conversationId }: {
  prefix: "admin" | "workspace"; conversationId: string;
  messages: PrivateMessage[]; isMine: (m: PrivateMessage) => boolean;
  onSend: (payload: any) => Promise<any>; mode: "upload" | "record"; loading?: boolean; error?: string | null;
}) {
  const { w, lang, formatDateTime } = useWorkspaceLocale();
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState<AudioDraft | null>(null);
  const [audioOpen, setAudioOpen] = useState(false);
  const [composerKey, setComposerKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

  const audioReady = !draft || (draft.transcript.trim() && draft.translation.trim() && draft.sourceLanguage !== draft.targetLanguage);
  const canSend = !sending && (draft ? !!audioReady : !!body.trim());

  const send = async () => {
    if (!canSend) return;
    setSending(true); setError(null);
    try {
      let payload: any = { body: body.trim() || undefined };
      if (draft) {
        const audioAssetId = await uploadPrivateFile(draft.file, "audio", draft.fileName);
        payload = { ...payload, audioAssetId, transcript: draft.transcript.trim(), translation: draft.translation.trim(), sourceLanguage: draft.sourceLanguage, targetLanguage: draft.targetLanguage };
      }
      await onSend(payload);
      setBody(""); setDraft(null); setAudioOpen(false); setComposerKey(k => k + 1);
    } catch (e) {
       const fallback = w("Envoi impossible. Votre message est conservé.", "Unable to send. Your message has been kept.");
       setError(e instanceof TypeError ? fallback : errMsg(e, fallback));
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
        {loading ? <p className="text-sm" style={{ color: SOFT }}>{w("Chargement des messages…", "Loading messages…")}</p>
          : loadError ? <p className="text-sm text-red-600" role="alert">{localizeThreadError(loadError, lang)}</p>
          : !messages?.length ? <p className="text-sm text-center py-8" style={{ color: SOFT }}>{w("Aucun message. Écrivez le premier.", "No messages yet. Write the first one.")}</p>
          : messages.map(m => {
            const mine = isMine(m);
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid={`message-${m.id}`}>
                <div className="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm" style={{ background: mine ? "#fbeee3" : "#f3f4f6", color: INK, border: `1px solid ${LINE}` }}>
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.audioAssetId && (
                    <div className="mt-1 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color: COPPER }}><Mic size={12} /> {w("Message vocal", "Voice message")}{m.audioFileName ? ` · ${m.audioFileName}` : ""}</p>
                      <PrivateAudio fileEndpoint={`/${prefix}/conversations/${conversationId}/messages/${m.id}/file`} />
                      {[{ lang: m.sourceLanguage, text: m.transcript, k: w("Transcription", "Transcript") }, { lang: m.targetLanguage, text: m.translation, k: w("Traduction", "Translation") }].map((x, i) => (
                        <div key={i} className="rounded bg-white/70 p-2" style={{ border: `1px solid ${LINE}` }}>
                          <p className="text-[11px] font-medium" style={{ color: SOFT }}>{x.k} · {x.lang ? (x.lang === "fr" ? w("français", "French") : x.lang === "es" ? w("espagnol", "Spanish") : x.lang) : "—"}</p>
                          <p className="whitespace-pre-wrap break-words">{x.text || w("Texte indisponible", "Text unavailable")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10.5px] mt-1.5" style={{ color: SOFT }}>{formatDateTime(m.createdAt)}</p>
                </div>
              </div>
            );
          })}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3 space-y-2" style={{ borderColor: LINE }}>
        {error && <p className="text-sm text-red-600" role="alert">{localizeThreadError(error, lang)}</p>}
        {audioOpen && (
          <div className="rounded-md p-3" style={{ border: `1px solid ${LINE}` }}>
            <AudioComposer key={composerKey} mode={mode} disabled={sending} onChange={setDraft} />
            {draft && !audioReady && <p className="text-xs mt-2 text-red-600">{w("Saisissez la transcription et la traduction, dans deux langues différentes (FR / ES), pour envoyer l'audio.", "Enter the transcript and translation in two different languages (FR / ES) to send the audio.")}</p>}
            <p className="text-[11px] mt-2" style={{ color: SOFT }}>{w("Audio limité à 20 Mo.", "Audio limited to 20 MB.")}</p>
          </div>
        )}
        <textarea aria-label={w("Message", "Message")} value={body} maxLength={10000} rows={2} onChange={e => setBody(e.target.value)}
          placeholder={w("Votre message…", "Your message…")} className="w-full px-3 py-2 text-sm rounded-md resize-none" style={{ border: `1px solid ${LINE}` }} data-testid="input-message" />
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => { if (audioOpen) { setDraft(null); setComposerKey(k => k + 1); } setAudioOpen(!audioOpen); }}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md hover:bg-gray-100" style={{ color: COPPER }} data-testid="button-toggle-audio">
             {audioOpen ? <><X size={15} /> {w("Retirer l’audio", "Remove audio")}</> : <><Mic size={15} /> {mode === "record" ? w("Enregistrer un message vocal", "Record a voice message") : w("Joindre un fichier audio", "Attach an audio file")}</>}
          </button>
          <button type="button" onClick={send} disabled={!canSend} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50" style={{ background: COPPER }} data-testid="button-send-message">
            <Send size={15} /> {sending ? w("Envoi…", "Sending…") : w("Envoyer", "Send")}
          </button>
        </div>
      </div>
    </div>
  );
}

function localizeThreadError(message: string, lang: "fr" | "en"): string {
  const mediaMessage = localizePrivateMediaMessage(message, lang);
  if (mediaMessage !== message) return mediaMessage;
  const apiMessage = localizeApiMessage(message, lang);
  if (apiMessage !== message) return apiMessage;
  if (message === "Envoi impossible. Votre message est conservé." || message === "Unable to send. Your message has been kept.") {
    return lang === "en" ? "Unable to send. Your message has been kept." : "Envoi impossible. Votre message est conservé.";
  }
  return message;
}
