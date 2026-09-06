# Brief d'intégration — Espace collaborateur Nuria Molero Rodriguez

## À lire avant de commencer (pour éviter de refaire du travail déjà fait)

Le design, la structure et le code frontend de cet espace sont **déjà entièrement écrits et validés** dans le fichier joint `espace-collaborateur.jsx`. Ta mission n'est **pas de concevoir ou redessiner l'interface**, mais de :

1. **L'intégrer** dans l'application Full-Stack Node.js existante (pas la réécrire).
2. **Brancher les données réelles** via des routes API, à la place des tableaux de démonstration en dur.
3. Respecter strictement le périmètre ci-dessous — ne pas ajouter, ni retirer, de fonctionnalités non listées.

Si un point n'est pas clair, pose UNE question groupée avant de coder plutôt que de faire des allers-retours — chaque itération a un coût.

---

## 1. Ce qu'il faut faire, dans l'ordre

1. Lire le projet existant : identifier le frontend, le backend, la base de données, l'auth et le système de permissions déjà en place. Ne rien réécrire qui fonctionne déjà.
2. Découper `espace-collaborateur.jsx` (actuellement un seul fichier) en composants dans l'arborescence déjà utilisée par le projet (ex. `components/`, `pages/` ou équivalent).
3. Créer les routes API listées en section 3, protégées par le système d'auth existant.
4. Remplacer chaque tableau de données de démonstration (`RECEIVED_DOCS`, `CASES`, `TASKS`, `REQUESTS`, `MEETINGS`, `CONVERSATIONS`, `DOCUMENTS`, `NOTES`, `CONTACTS`, `NOTIFICATIONS`, `SESSIONS`) par un appel à l'API correspondante.
5. Implémenter la vérification serveur de la permission `CAN_USE_VIDEO_CONFERENCE` (section 5).
6. Tester le responsive (desktop / tablette / mobile) et les états vide/chargement/erreur.

**IMPORTANT :** Le module financier personnel est désormais OBLIGATOIRE. Ne pas le supprimer ni le considérer comme optionnel.

---

## 2. Périmètre fonctionnel (rien de plus)

- Tableau de bord
- Dossiers reçus (réception de documents avec instruction, priorité, échéance)
- Mes dossiers (onglets : En cours / À traiter / En attente / Terminés / Urgents)
- Mes tâches (À faire / En cours / En attente / Terminées)
- Demandes de la Direction (workflow : Nouvelle → Acceptée → En cours → Soumise → Validée/À reprendre → Terminée)
- Agenda & Réunions (affichage double fuseau horaire : heure du siège + heure locale de l'utilisateur)
- Visioconférences (soumis à permission backend, voir section 5)
- Communications (messagerie interne simple)
- Documents (bibliothèque avec recherche, catégories, confidentialité)
- Notes stratégiques (privées / partagées)
- Contacts
- Ma situation financière
- Notifications
- Sécurité & Sessions (2FA, sessions actives, déconnexion à distance, journal d'activité en lecture seule)

---

## 3. Modèles de données minimum

`User, Role, Permission, Task, Case, ExecutiveRequest, Document, DocumentAssignment, Payment, PaymentPeriod, FinancialRecord, PaymentRequirement, Meeting, MeetingParticipant, VideoConference, Message, Conversation, StrategicNote, Notification, Contact, ActivityLog, Session`

Chaque route API doit filtrer les résultats selon l'utilisateur connecté et ses permissions — contrôle **côté serveur**, jamais uniquement côté frontend.

Routes attendues (adapter aux conventions déjà en place dans le projet, REST ou autre) :
- `GET /api/documents/received`
- `GET/POST /api/cases`, `GET /api/cases/:id`
- `GET/POST/PATCH /api/tasks`
- `GET/POST/PATCH /api/requests`
- `GET /api/meetings`
- `GET/POST /api/conversations`, `GET/POST /api/conversations/:id/messages`
- `GET /api/documents` (bibliothèque, filtrée par droits d'accès)
- `GET/POST/PATCH /api/notes`
- `GET /api/contacts`
- `GET /api/notifications`
- `GET /api/sessions`, `DELETE /api/sessions/:id`
- `GET /api/activity-log` (lecture seule)
- `GET /api/me/permissions`
- `GET /api/me/financial-summary`
- `GET /api/me/payments`
- `GET /api/me/arrears`
- `GET/POST/PATCH /api/me/payment-requirements`
- `POST /api/me/payment-requirements/:id/documents`

---

## 4. Permissions (RBAC)

Rôle : `EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR`

```
VIEW_ASSIGNED_CASES, MANAGE_ASSIGNED_CASES
VIEW_ASSIGNED_TASKS, MANAGE_ASSIGNED_TASKS
VIEW_EXECUTIVE_REQUESTS, MANAGE_ASSIGNED_REQUESTS
VIEW_ASSIGNED_DOCUMENTS, DOWNLOAD_ALLOWED_DOCUMENTS, UPLOAD_DOCUMENTS, SUBMIT_DOCUMENTS
USE_INTERNAL_MESSAGING, PARTICIPATE_IN_MEETINGS
VIEW_OWN_FINANCIAL_INFORMATION, VIEW_OWN_PAYMENT_HISTORY, VIEW_OWN_ARREARS, VIEW_OWN_PAYMENT_REQUIREMENTS, SUBMIT_PAYMENT_DOCUMENTS
CAN_USE_VIDEO_CONFERENCE, CAN_CREATE_VIDEO_CONFERENCE
```

Cet utilisateur ne doit **jamais** pouvoir : gérer les utilisateurs/rôles/permissions, accéder à l'administration générale, ou consulter les données d'autres collaborateurs.

---

## 5. Visioconférence — exigence non négociable

- Si `CAN_USE_VIDEO_CONFERENCE` est désactivée pour le compte, le backend doit **refuser** toute tentative de créer ou rejoindre une session (pas seulement cacher le bouton).
- Le frontend affiche déjà l'état "indisponible" (`VideoView enabled={false}` dans le composant fourni) — brancher `enabled` sur la permission réelle renvoyée par l'API `GET /api/me/permissions`.

---

## 6. Design — ne pas modifier sans raison

Le fichier `espace-collaborateur.jsx` contient déjà les tokens de design (palette bleu nuit + cuivre, typographie, espacements). Réutiliser tel quel. Si le projet a déjà un design system (Tailwind config, thème), l'adapter aux variables existantes plutôt que dupliquer.

---

## 7. Definition of done

- [ ] Les 14 sections listées en §2 sont accessibles depuis la sidebar et fonctionnelles.
- [ ] Aucune donnée en dur ne subsiste dans les composants — tout vient de l'API.
- [ ] Chaque route API vérifie l'identité et les permissions de l'utilisateur côté serveur.
- [ ] La permission vidéo est vérifiée côté backend, pas seulement masquée côté frontend.
- [ ] Les documents reçus directement dans l'espace peuvent être consultés, traités et soumis avec leur instruction, priorité et échéance.
- [ ] Le module « Ma situation financière » permet de voir le statut du salaire, les paiements, les arriérés, le motif communiqué d'un retard et les exigences à remplir.
- [ ] Les données financières personnelles sont isolées côté serveur : Nuria ne peut jamais voir celles d'un autre collaborateur.
- [ ] Les documents justificatifs peuvent être déposés depuis le module financier.
- [ ] Responsive vérifié sur mobile (sidebar en drawer, tableaux transformés en cartes).
- [ ] Le module financier est personnel, sécurisé et accessible uniquement selon les permissions prévues.
