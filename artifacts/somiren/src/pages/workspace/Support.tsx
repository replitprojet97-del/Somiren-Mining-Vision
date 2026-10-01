import { Link } from "wouter";
import { FileText, Mic, MessageSquare, Shield, UserRound } from "lucide-react";
import { useMe } from "@/hooks/use-workspace";
import { C } from "@/lib/theme";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export default function Support() {
  const me = useMe();
  const { w } = useWorkspaceLocale();
  const canMessage = me.data?.permissions?.includes("USE_INTERNAL_MESSAGING");
  const guides = [
    { title: w("Changer ma photo", "Change my photo"), icon: UserRound, text: w("Ouvrez votre profil depuis votre nom en haut à droite, puis « Mon profil ». Vous pouvez y ajouter, remplacer ou retirer votre photo.", "Open your profile from your name in the top-right corner, then select “My profile”. You can add, replace or remove your photo there."), href: "/espace-collaborateur/profile", action: w("Ouvrir mon profil", "Open my profile") },
    { title: w("Retrouver un audio de la Direction", "Find an audio message from Management"), icon: Mic, text: w("Les audios arrivent dans « Messages & Audios », dans la conversation concernée. La transcription et la traduction français–espagnol sont visibles sans lancer la lecture.", "Audio messages appear in “Messages & Audio” in the relevant conversation. Transcripts and French–Spanish translations are available without playing the audio."), href: "/espace-collaborateur/comms", action: w("Voir mes messages et audios", "View my messages and audio"), permission: "USE_INTERNAL_MESSAGING" },
    { title: w("Consulter un document reçu", "View a received document"), icon: FileText, text: w("La rubrique « Documents reçus » rassemble les textes rédigés et les pièces jointes que la Direction vous a attribués. Les notifications vous préviennent des nouveaux envois.", "“Received documents” contains written documents and attachments assigned to you by Management. Notifications let you know when new items arrive."), href: "/espace-collaborateur/documents", action: w("Voir mes documents", "View my documents"), permission: "VIEW_ASSIGNED_DOCUMENTS" },
    { title: w("Un accès est refusé ?", "Was access denied?"), icon: Shield, text: w("Les accès dépendent des permissions attribuées à votre compte. La Direction peut les ajuster. Ne partagez jamais votre mot de passe et ne joignez pas de données sensibles à une demande d’aide.", "Access depends on the permissions assigned to your account, which Management can adjust. Never share your password or include sensitive data in a support request.") },
  ];
  return <div className="space-y-5">
    <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Aide & support", "Help & support")}</h1>
    <p className="text-sm" style={{ color: C.inkSoft }}>{w("Un guide de votre espace privé, sans redirection vers les contacts publics.", "A guide to your private workspace, without redirecting you to public contacts.")}</p>
    <div className="grid gap-4 md:grid-cols-2">
      {guides.map(g => <section key={g.title} className="rounded-lg bg-white p-5 space-y-3" style={{ border: `1px solid ${C.line}` }}>
        <h2 className="flex items-center gap-2 font-semibold" style={{ color: C.ink }}><g.icon size={20} />{g.title}</h2>
        <p className="text-sm" style={{ color: C.inkSoft }}>{g.text}</p>
        {g.href && (!g.permission || me.data?.permissions?.includes(g.permission)) && <Link href={g.href} className="text-sm font-semibold underline" style={{ color: C.copper }}>{g.action}</Link>}
      </section>)}
    </div>
    <section className="rounded-lg bg-white p-5 space-y-3" style={{ border: `1px solid ${C.line}` }}>
      <h2 className="flex items-center gap-2 font-semibold" style={{ color: C.ink }}><MessageSquare size={20} />{w("Demander de l’aide à la Direction", "Ask Management for help")}</h2>
      <p className="text-sm" style={{ color: C.inkSoft }}>{w("Décrivez le problème, la page concernée et ce que vous essayiez de faire. Votre demande sera une conversation privée avec la Direction, qui recevra une notification et pourra vous répondre ici. Il ne s’agit pas d’un service d’assistance externe.", "Describe the problem, the page involved and what you were trying to do. Your request will start a private conversation with Management, who will be notified and can reply here. This is not an external support service.")}</p>
      {canMessage ? <Link href="/espace-collaborateur/comms?compose=support" className="inline-block rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ background: C.copper }} data-testid="link-contact-direction-support">{w("Écrire à la Direction", "Message Management")}</Link>
        : <p className="text-sm" style={{ color: C.inkSoft }}>{w("La messagerie n’est pas activée pour votre compte. Demandez directement à votre responsable la permission USE_INTERNAL_MESSAGING.", "Messaging is not enabled for your account. Ask your manager directly for the USE_INTERNAL_MESSAGING permission.")}</p>}
    </section>
  </div>;
}