import { Link } from "wouter";
import { FileText, Mic, MessageSquare, Shield, UserRound } from "lucide-react";
import { useMe } from "@/hooks/use-workspace";
import { C } from "@/lib/theme";

export default function Support() {
  const me = useMe();
  const canMessage = me.data?.permissions?.includes("USE_INTERNAL_MESSAGING");
  const guides = [
    { title: "Changer ma photo", icon: UserRound, text: "Ouvrez votre profil depuis votre nom en haut à droite, puis « Mon profil ». Vous pouvez y ajouter, remplacer ou retirer votre photo.", href: "/espace-collaborateur/profile", action: "Ouvrir mon profil" },
    { title: "Retrouver un audio de la Direction", icon: Mic, text: "Les audios arrivent dans « Messages & Audios », dans la conversation concernée. La transcription et la traduction français–espagnol sont visibles sans lancer la lecture.", href: "/espace-collaborateur/comms", action: "Voir mes messages et audios", permission: "USE_INTERNAL_MESSAGING" },
    { title: "Consulter un document reçu", icon: FileText, text: "La rubrique « Documents reçus » rassemble les textes rédigés et les pièces jointes que la Direction vous a attribués. Les notifications vous préviennent des nouveaux envois.", href: "/espace-collaborateur/documents", action: "Voir mes documents", permission: "VIEW_ASSIGNED_DOCUMENTS" },
    { title: "Un accès est refusé ?", icon: Shield, text: "Les accès dépendent des permissions attribuées à votre compte. La Direction peut les ajuster. Ne partagez jamais votre mot de passe et ne joignez pas de données sensibles à une demande d’aide." },
  ];
  return <div className="space-y-5">
    <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Aide &amp; support</h1>
    <p className="text-sm" style={{ color: C.inkSoft }}>Un guide de votre espace privé, sans redirection vers les contacts publics.</p>
    <div className="grid gap-4 md:grid-cols-2">
      {guides.map(g => <section key={g.title} className="rounded-lg bg-white p-5 space-y-3" style={{ border: `1px solid ${C.line}` }}>
        <h2 className="flex items-center gap-2 font-semibold" style={{ color: C.ink }}><g.icon size={20} />{g.title}</h2>
        <p className="text-sm" style={{ color: C.inkSoft }}>{g.text}</p>
        {g.href && (!g.permission || me.data?.permissions?.includes(g.permission)) && <Link href={g.href} className="text-sm font-semibold underline" style={{ color: C.copper }}>{g.action}</Link>}
      </section>)}
    </div>
    <section className="rounded-lg bg-white p-5 space-y-3" style={{ border: `1px solid ${C.line}` }}>
      <h2 className="flex items-center gap-2 font-semibold" style={{ color: C.ink }}><MessageSquare size={20} />Demander de l’aide à la Direction</h2>
      <p className="text-sm" style={{ color: C.inkSoft }}>Décrivez le problème, la page concernée et ce que vous essayiez de faire. Votre demande sera une conversation privée avec la Direction, qui recevra une notification et pourra vous répondre ici. Il ne s’agit pas d’un service d’assistance externe.</p>
      {canMessage ? <Link href="/espace-collaborateur/comms?compose=support" className="inline-block rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ background: C.copper }} data-testid="link-contact-direction-support">Écrire à la Direction</Link>
        : <p className="text-sm" style={{ color: C.inkSoft }}>La messagerie n’est pas activée pour votre compte. Demandez directement à votre responsable la permission USE_INTERNAL_MESSAGING.</p>}
    </section>
  </div>;
}