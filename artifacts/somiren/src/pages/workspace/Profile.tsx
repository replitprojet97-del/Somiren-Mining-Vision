import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { C } from "@/lib/theme";
import { ProfilePhoto } from "@/components/workspace/ProfilePhoto";
import { useProfilePhoto } from "@/hooks/use-profile-photo";

const imagePath = (filename: string) => `${import.meta.env.BASE_URL}images/workspace-reference/${filename}`;

export default function Profile() {
  const { profile } = useWorkspaceAuth();
  const photo = useProfilePhoto();
  const name = profile?.fullName || "Collaborateur";
  const isNuriaReference = name.trim().toLocaleLowerCase("fr-FR") === "nuria molero rodriguez"
    && profile?.role === "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR";
  return <div className="space-y-5">
    <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Mon profil</h1>
    <section className="rounded-lg bg-white p-5" style={{ border: `1px solid ${C.line}` }}>
      <h2 className="font-semibold" style={{ color: C.ink }}>{name}</h2>
      <p className="mt-1 text-sm mb-5" style={{ color: C.inkSoft }}>Cette photo n’est visible que dans votre espace. Vous pouvez la changer ou la retirer vous-même à tout moment.</p>
      <ProfilePhoto name={name} fallbackSrc={isNuriaReference && photo.referencePortrait && photo.isReady ? imagePath("profile-reference.jpg") : undefined} fallbackAlt="Photo de référence" />
    </section>
  </div>;
}