import type { Lang } from "@/i18n/translations";

/**
 * Exact backend messages exposed by the collaborator auth, workspace, private
 * media, assigned-storage, finance, and MFA routes. Keep both source languages
 * so an already-held Error can be rendered again after the locale changes.
 */
const messagePairs: ReadonlyArray<readonly [french: string, english: string]> = [
  ["Une erreur est survenue.", "An error occurred."],
  ["Une erreur est survenue. Réessayez.", "An error occurred. Please try again."],
  ["Trop de requêtes. Veuillez patienter une minute avant de réessayer.", "Too many requests. Please wait one minute before trying again."],
  ["Identifiants invalides.", "Invalid credentials."],
  ["Le service d’authentification à deux facteurs est indisponible.", "The two-factor authentication service is unavailable."],
  ["Compte temporairement verrouillé. Réessayez plus tard.", "Account temporarily locked. Please try again later."],
  ["Adresse e-mail ou mot de passe incorrect.", "Incorrect email address or password."],
  ["Code invalide.", "Invalid code."],
  ["Défi de connexion invalide ou expiré.", "Invalid or expired sign-in challenge."],
  ["Code incorrect ou déjà utilisé. Saisissez un nouveau code.", "Incorrect or already-used code. Enter a new code."],
  ["Défi de connexion invalide, expiré ou code incorrect.", "Invalid or expired sign-in challenge, or incorrect code."],
  ["Trop de tentatives. Réessayez dans 15 minutes.", "Too many attempts. Please try again in 15 minutes."],
  ["Trop de codes de vérification. Réessayez plus tard.", "Too many verification codes. Please try again later."],
  ["Trop de codes incorrects. Réessayez plus tard.", "Too many incorrect codes. Please try again later."],
  ["Trop de tentatives de sécurité. Réessayez plus tard.", "Too many security attempts. Please try again later."],

  ["Authentification requise.", "Authentication required"],
  ["Cette authentification n’est pas disponible pour le portail administrateur historique.", "This authentication method is unavailable for the legacy administrator portal."],
  ["Demande invalide.", "Invalid request"],
  ["L’authentification à deux facteurs est déjà activée.", "Two-factor authentication is already enabled."],
  ["Impossible de démarrer la configuration.", "Could not start setup."],
  ["Code invalide ou configuration expirée.", "Invalid code or expired setup."],
  ["Mot de passe ou code invalide.", "Invalid password or code."],
  ["L’authentification à deux facteurs n’est pas activée.", "Two-factor authentication is not enabled."],

  ["Permission de lecture requise.", "Read permission required."],
  ["Permission de modification requise.", "Write permission required."],
  ["Permission USE_INTERNAL_MESSAGING requise.", "USE_INTERNAL_MESSAGING permission required."],
  ["L’autorisation de l’espace de travail est temporairement indisponible.", "Workspace authorization is temporarily unavailable"],
  ["L’autorisation d’administration est temporairement indisponible.", "Administration authorization is temporarily unavailable"],
  ["L’autorisation de téléversement est temporairement indisponible.", "Upload authorization is temporarily unavailable"],
  ["Impossible de charger les messages non lus.", "Could not load unread messages"],
  ["Un identifiant de conversation et un identifiant de dernier message lu valides sont requis.", "A valid conversation id and lastReadMessageId are required"],
  ["Le curseur de lecture doit désigner un message de cette conversation.", "The read cursor must refer to a message in this conversation"],
  ["Impossible de marquer les messages de la conversation comme lus.", "Could not mark conversation messages as read"],

  ["Profil du collaborateur introuvable.", "Collaborator profile not found"],
  ["Impossible de charger les métadonnées de la photo de profil.", "Profile photo metadata could not be loaded"],
  ["Impossible de créer l’URL de la photo de profil.", "Could not create a profile photo URL"],
  ["Un téléversement valide et terminé de photo de profil est requis.", "A valid completed profile photo upload is required"],
  ["Le téléversement de la photo doit être terminé et appartenir à ce collaborateur.", "Photo upload must be completed and owned by this collaborator"],
  ["Impossible de mettre à jour la photo de profil.", "Could not update the profile photo"],
  ["Impossible de supprimer la photo de profil.", "Could not remove the profile photo"],
  ["Dossier invalide.", "Invalid case"],
  ["Identifiant de dossier invalide.", "Invalid case id"],
  ["Dossier introuvable.", "Case not found"],
  ["Mise à jour du dossier invalide.", "Invalid case update"],
  ["Tâche invalide.", "Invalid task"],
  ["Mise à jour de la tâche invalide.", "Invalid task update"],
  ["Tâche introuvable.", "Task not found"],
  ["Identifiant de notification invalide.", "Invalid notification id"],
  ["Notification introuvable.", "Notification not found"],
  ["Identifiant d’affectation invalide.", "Invalid assignment id"],
  ["Pièce jointe du document introuvable.", "Document attachment not found"],
  ["Affectation du document invalide.", "Invalid document assignment"],
  ["Affectation du document introuvable.", "Document assignment not found"],
  ["Mise à jour de la demande invalide.", "Invalid request update"],
  ["Demande introuvable.", "Request not found"],
  ["Identifiant de réunion invalide.", "Invalid meeting id"],
  ["Vidéo de la réunion introuvable.", "Meeting video not found"],
  ["La vidéo de la réunion n’est pas disponible pendant cette période de visionnage planifiée.", "Meeting video is outside its scheduled viewing window"],
  ["Conversation invalide.", "Invalid conversation"],
  ["Identifiant de conversation invalide.", "Invalid conversation id"],
  ["Conversation introuvable.", "Conversation not found"],
  ["Message invalide.", "Invalid message"],
  ["Identifiant de message invalide.", "Invalid message id"],
  ["Message audio introuvable.", "Audio message not found"],
  ["Note invalide.", "Invalid note"],
  ["Mise à jour de la note invalide.", "Invalid note update"],
  ["Note introuvable.", "Note not found"],
  ["Exigence de paiement invalide.", "Invalid payment requirement"],
  ["Mise à jour de l’exigence de paiement invalide.", "Invalid payment requirement update"],
  ["Exigence introuvable.", "Requirement not found"],
  ["Métadonnées du document invalides.", "Invalid document metadata"],
  ["Identifiant de session invalide.", "Invalid session id"],
  ["Session introuvable.", "Session not found"],
  ["Le provisionnement de la visioconférence n’est pas configuré.", "Video conference provisioning is not configured."],
  ["Un identifiant d’autorisation vidéo valide est requis.", "A valid video authorization id is required"],
  ["Cette autorisation vidéo a expiré, a été révoquée ou n’est pas attribuée à ce compte.", "This video authorization is expired, revoked, or not assigned to this account."],
  ["Identifiant d’arriéré invalide.", "Invalid arrear id"],
  ["Arriéré introuvable.", "Arrear not found"],
  ["Un arriéré réglé ne peut pas faire l’objet d’une demande de transfert.", "A resolved arrear cannot receive a transfer request"],
  ["Une demande de transfert existe déjà pour cet arriéré.", "A transfer request already exists for this arrear"],
  ["Les téléversements de documents privés ne sont pas activés ; aucun document n’a été soumis.", "Private document byte uploads are not enabled; no document was submitted."],

  ["Autorisation de téléversement requise.", "Upload permission required"],
  ["Demande de téléversement invalide.", "Invalid upload request"],
  ["La taille du fichier ou son type de contenu n’est pas autorisé pour ce type de téléversement.", "File size or content type is not allowed for this upload kind"],
  ["Le stockage privé des fichiers n’est pas configuré.", "Private file storage is not configured"],
  ["Impossible de créer une URL de téléversement privée.", "Could not create a private upload URL"],
  ["Identifiant d’élément invalide.", "Invalid asset id"],
  ["Téléversement en attente introuvable.", "Pending upload not found"],
  ["Impossible de vérifier les métadonnées du fichier téléversé.", "Uploaded file metadata could not be verified"],
  ["La taille ou le type de contenu du fichier téléversé ne correspond pas à la déclaration.", "Uploaded file size or content type does not match the declaration"],
  ["Impossible de vérifier que la photo de profil téléversée est une image prise en charge.", "Uploaded profile photo could not be verified as a supported image"],
  ["Les photos de profil ne doivent pas dépasser 5 Mio.", "Profile photos must not exceed 5 MiB"],
  ["Les données de la photo de profil sont incomplètes ou dépassent la limite de 5 Mio.", "Profile photo data is incomplete or exceeds the 5 MiB limit"],
  ["Les photos de profil doivent être des images JPEG, PNG ou WebP complètes et non corrompues, d’au plus 25 mégapixels.", "Profile photos must be complete, uncorrupted JPEG, PNG, or WebP images of at most 25 megapixels"],
  ["Le téléversement n’est plus en attente.", "Upload is no longer pending"],

  ["Le rôle d’administrateur est requis pour accéder aux données confidentielles de l’espace de travail.", "Administrator role required for confidential workspace data"],
  ["Le rôle d’administrateur est requis pour accéder aux données financières confidentielles.", "Administrator role required for confidential finance data"],
  ["L’accès à la gestion des utilisateurs est requis.", "User management access required"],
  ["L’accès à l’administration est requis.", "Administration access required"],
  ["Admin non configuré.", "Administrator is not configured."],
  ["Mot de passe incorrect.", "Incorrect password."],
  ["Compte administrateur indisponible.", "Administrator account unavailable."],
  ["Collaborateur invalide.", "Invalid collaborator"],
  ["L’adresse e-mail de l’administrateur initial est réservée.", "The bootstrap administrator email is reserved"],
  ["Un collaborateur avec cette adresse e-mail existe déjà.", "A collaborator with this email already exists"],
  ["Rôle de collaborateur non pris en charge.", "Unsupported collaborator role"],
  ["Seul un administrateur peut attribuer un accès administrateur ou de gestion des utilisateurs.", "Only an administrator may assign administrator or user-management access"],
  ["Identifiant de collaborateur invalide.", "Invalid collaborator id"],
  ["Collaborateur introuvable.", "Collaborator not found"],
  ["Seul un administrateur peut rétablir l’accès administrateur.", "Only an administrator may restore administrator access"],
  ["Mise à jour du collaborateur invalide.", "Invalid collaborator update"],
  ["Seul un administrateur peut modifier les comptes administrateur.", "Only an administrator may modify administrator accounts"],
  ["Un administrateur ne peut pas se suspendre ni rétrograder son propre compte.", "An administrator cannot suspend or demote itself."],
  ["Mise à jour du rôle invalide.", "Invalid role update"],
  ["Rôle introuvable.", "Role not found"],
  ["Le rôle ADMIN ne peut pas être renommé.", "The ADMIN role cannot be renamed."],
  ["Le nom du rôle ADMIN est réservé.", "The ADMIN role name is reserved."],
  ["Seul un administrateur peut modifier le rôle ADMIN.", "Only an administrator may modify the ADMIN role."],
  ["Seul un administrateur peut modifier les rôles attribués aux gestionnaires des utilisateurs.", "Only an administrator may modify roles assigned to user managers."],
  ["Seul un administrateur peut attribuer des autorisations de gestion des utilisateurs.", "Only an administrator may assign user-management permissions."],
  ["Le rôle ADMIN doit conserver MANAGE_USERS et MANAGE_PERMISSIONS.", "ADMIN must retain MANAGE_USERS and MANAGE_PERMISSIONS."],
  ["Le collaborateur affecté doit être actif.", "Invalid active assignee"],
  ["Affectation du document invalide.", "Invalid document assignment"],
  ["Le collaborateur doit être actif.", "Collaborator must be active"],
  ["Le dossier doit appartenir au collaborateur sélectionné.", "Case must belong to the selected collaborator"],
  ["La pièce jointe doit être un document terminé téléversé par cet administrateur.", "Attachment must be a completed document uploaded by this administrator"],
  ["Réunion invalide.", "Invalid meeting"],
  ["Tous les participants doivent être des collaborateurs actifs.", "All participants must be active collaborators"],
  ["La vidéo doit être un fichier vidéo terminé téléversé par cet administrateur.", "Video must be a completed video uploaded by this administrator"],
  ["Affectation de la vidéo en direct invalide.", "Invalid live video assignment"],
  ["Tous les participants doivent être des collaborateurs actifs qui ne sont pas administrateurs.", "All participants must be active non-administrator collaborators"],
  ["Identifiant d’autorisation vidéo invalide.", "Invalid video authorization id"],
  ["Autorisation vidéo introuvable.", "Video authorization not found"],
  ["Impossible de révoquer l’autorisation vidéo.", "Video authorization could not be revoked"],
  ["Le fichier audio doit être un téléversement terminé appartenant à cet administrateur.", "Audio must be a completed audio upload owned by this administrator"],
  ["Le fichier audio doit être un téléversement terminé appartenant à ce collaborateur.", "Audio must be a completed audio upload owned by this collaborator"],
  ["Impossible de créer une URL de téléchargement de fichier.", "Could not create a file download URL"],

  ["Détails des arriérés invalides.", "Invalid arrear details"],
  ["Un collaborateur qui n’est pas administrateur est requis.", "A non-administrator collaborator is required"],
  ["Mise à jour des arriérés invalide.", "Invalid arrear update"],
  ["Seule une demande de transfert en attente peut être examinée.", "Only a pending transfer request can be reviewed"],
  ["Les arriérés ne peuvent pas être attribués à un administrateur.", "Arrears cannot be assigned to an administrator"],
  ["Un arriéré associé à une demande de transfert ne peut pas être supprimé ; archivez-le à la place.", "An arrear with a transfer request cannot be deleted; archive it instead"],
  ["Détails du salaire invalides.", "Invalid salary record details"],
  ["Un enregistrement de salaire existe déjà pour cette période ; modifiez plutôt l’enregistrement existant.", "A salary record for this period already exists; edit the existing record instead"],
  ["Mise à jour de l’enregistrement de salaire invalide.", "Invalid salary record update"],
  ["Enregistrement de salaire introuvable.", "Salary record not found"],
  ["Les enregistrements de salaire ne peuvent pas être attribués à un administrateur.", "Salary records cannot be assigned to an administrator"],
  ["Un autre enregistrement de salaire utilise déjà cette période.", "Another salary record already uses this period"],
];

const translations = new Map<string, readonly [french: string, english: string]>();
for (const pair of messagePairs) {
  translations.set(pair[0], pair);
  translations.set(pair[1], pair);
}

export function localizeApiMessage(message: string, lang: Lang = "fr"): string {
  const pair = translations.get(message);
  if (pair) return pair[lang === "en" ? 1 : 0];

  // These narrowly constrained patterns carry only a permission token or a
  // server-generated retry interval, never user-authored content.
  const englishPermission = /^Permission required: ([A-Z][A-Z0-9_]*)$/u.exec(message);
  if (englishPermission) {
    return lang === "fr" ? `Permission requise : ${englishPermission[1]}` : message;
  }
  const frenchPermission = /^Permission requise: ([A-Z][A-Z0-9_]*)$/u.exec(message);
  if (frenchPermission) {
    return lang === "en" ? `Permission required: ${frenchPermission[1]}` : message;
  }
  const frenchRetry = /^Trop de requêtes\. Veuillez patienter ([1-9]\d{0,3}) secondes avant de réessayer\.$/u.exec(message);
  if (frenchRetry) {
    return lang === "en"
      ? `Too many requests. Please wait ${frenchRetry[1]} seconds before trying again.`
      : message;
  }
  const englishRetry = /^Too many requests\. Please wait ([1-9]\d{0,3}) seconds before trying again\.$/u.exec(message);
  if (englishRetry) {
    return lang === "fr"
      ? `Trop de requêtes. Veuillez patienter ${englishRetry[1]} secondes avant de réessayer.`
      : message;
  }

  return message;
}

/** A nonzero coverage count that can be asserted by lightweight tests. */
export const API_ERROR_TRANSLATION_COUNT = messagePairs.length;