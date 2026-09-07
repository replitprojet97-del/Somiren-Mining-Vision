# Brief d'intégration — Espace administration

## ⚠️ Contrainte prioritaire — espace admin existant

Le projet contient déjà un espace admin partiel (gestion des envois). **Ne pas le supprimer et ne pas créer un second espace admin séparé.**

- Fusionner : les composants, routes et logique de l'admin existant doivent être **intégrés dans** ce nouvel espace admin (`espace-admin.jsx`), pas dupliqués à côté.
- Avant toute modification, faire l'inventaire de l'admin existant : quelles pages/routes/composants gèrent déjà l'envoi de documents, où ils vivent dans l'arborescence, et comment ils appellent l'API.
- Réutiliser la logique d'envoi déjà fonctionnelle plutôt que de la réécrire — ne garder le formulaire "Envoyer un document" de `espace-admin.jsx` que comme référence visuelle si besoin d'ajustement, pas comme remplacement obligatoire.
- Résultat attendu : **un seul** espace admin, avec la même sidebar/navigation que celle décrite plus bas, où la section "Envoyer un document" est celle qui existait déjà (éventuellement ajustée au design), et où les nouvelles sections (Collaborateurs, Rôles & Permissions, Journal d'activité, etc.) viennent s'ajouter à côté.

## À lire avant de commencer

Le design et le code frontend sont **déjà écrits** dans `espace-admin.jsx`. Ne pas redessiner l'interface. Le travail consiste à :

1. Intégrer ce frontend dans le projet Node.js existant (réutiliser ce qui existe déjà : auth, base de données, composants).
2. Brancher les données réelles via API, à la place des tableaux de démonstration (`USERS`, `CASES`, `REQUESTS`, `MEETINGS`, `ROLES`, `ACTIVITY`).
3. Restreindre strictement l'accès à cet espace aux comptes ayant le rôle `ADMIN` — vérification côté serveur sur chaque route, pas seulement un routage frontend.

## Périmètre

- Tableau de bord (compteurs globaux)
- Collaborateurs : liste, recherche, suspension/réactivation, changement de rôle, gestion des permissions individuelles, réinitialisation de mot de passe
- Dossiers : création et suivi global (tous collaborateurs)
- Envoyer un document : formulaire d'assignation (destinataire, dossier, fichier, priorité, échéance, instruction) → crée une entrée `DocumentAssignment` visible côté collaborateur
- Demandes de la Direction : création et suivi
- Réunions : planification, gestion des participants
- Rôles & Permissions : lecture/édition du RBAC, incluant la permission `CAN_USE_VIDEO_CONFERENCE`
- Journal d'activité : lecture seule, agrégé tous collaborateurs
- Sécurité : état des contrôles serveur (2FA admin, contrôle backend de la visio)

Ne pas ajouter de module financier/salarial — hors périmètre.

## Contrôle d'accès

- Route middleware : seul un utilisateur avec le rôle `ADMIN` (ou permission `MANAGE_USERS` / `MANAGE_PERMISSIONS`) peut atteindre ces routes API et ce frontend.
- Toute action de modification (suspension, changement de rôle, envoi de document, modification de permission) doit être tracée dans `ActivityLog` avec l'identité de l'admin qui l'a effectuée.
- Le formulaire "Envoyer un document" doit valider côté serveur que le dossier associé existe et que le destinataire y a accès avant de créer l'assignation.

## Definition of done

- [ ] Accès restreint aux comptes `ADMIN`, vérifié côté serveur.
- [ ] Aucune donnée en dur ne subsiste — tout vient de l'API.
- [ ] Toute action admin est journalisée dans le log d'activité.
- [ ] La modification de `CAN_USE_VIDEO_CONFERENCE` depuis cet espace se répercute réellement sur le contrôle backend consommé par l'espace collaborateur.
- [ ] Aucun module financier n'a été ajouté.
