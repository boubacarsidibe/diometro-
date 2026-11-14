# DIOMETRO

Solution numérique de gestion et de suivi métrologique des instruments de mesure.

**Stack (100 % offre gratuite)** : Next.js 16 (App Router, TypeScript) · Supabase (PostgreSQL, Auth, MFA) · Vercel. Les emails d'authentification sont envoyés par Supabase (EmailJS n'est plus nécessaire).

> L'ancienne application mono-fichier est archivée dans `legacy/`. Elle stockait mots de passe et données dans le navigateur ; elle ne doit plus être utilisée. Voir `SECURITY_AUDIT.md`.

## Fonctionnalités

- **Comptes et sécurité :** inscription d'une entreprise (secteur, téléphone, bâtiments), connexion, mot de passe oublié, **double authentification TOTP obligatoire**, rôles administrateur / coordinateur / consultation.
- **Multi-entreprise isolé par la base de données** (Row Level Security), avec formules (Essai, Starter, Standard, Pro, Entreprise, Grand Compte, Sur-mesure), **limite d'instruments par formule** et suspension d'une entreprise.
- **Instruments et fiches de vie :** tous les champs métier (conformité, graduation, tolérance/EMT, propriétaire, stockage, type d'étalonnage, origine de la fréquence, raccordement, liens documents, prestataire habituel), interventions internes/externes, historique.
- **Calculateurs métrologiques** (repris de l'ancienne version, résultats identiques vérifiés par tests) : pipettes (ISO 8655, incertitude GUM), thermomètres Pt100 (X 07-016, GUM), comparaison directe à un étalon ; **catalogue de 28 types d'instruments** avec normes et procédures. Le résultat est enregistré dans la fiche de vie, la conformité et l'échéance sont mises à jour.
- **Prestataires :** carnet, contacts, domaines, organisme d'accréditation configurable (COFRAC, SENAC…), tarifs en FCFA, **comparateur par domaine**.
- **Page d'accueil publique** avec présentation et formules, **mentions légales, CGU et politique de confidentialité** (à compléter via les variables `LEGAL_*`), case de consentement à l'inscription (preuve datée conservée).
- **Essai de 30 jours puis lecture seule** : sans formule gratuite ; les données ne sont jamais supprimées, l'écriture est rétablie au paiement.
- **Liste des instruments** filtrable (statut, conformité, bâtiment, zone, type, échéance), triable par colonne, paginée, avec filtres dans l'adresse.
- **Planning** mensuel + charge de travail sur 12 mois ; **alertes** d'échéance (écran, notifications du navigateur, email quotidien).
- **QR codes et étiquettes** imprimables ; **lien public QR en lecture seule** (désactivé par défaut, révocable, données minimales).
- **Inventaire physique** avec historique, **pièces jointes** (PDF, images, Excel, Word, 10 Mo, aperçu), **corbeille** avec restauration.
- **Exports** Excel et PDF (instruments, fiche de vie, audit), **audit trail** non modifiable avec filtres et pagination.
- **Super-admin** (opérateur du service) : activer/bloquer une entreprise, formule, limite d'instruments, fin d'abonnement ; il ne voit que des totaux.
- Paramètres de l'entreprise (nom, couleur, logo, devise, bâtiments), aide et FAQ.

## Installation

1. Créez un projet gratuit sur [supabase.com](https://supabase.com).
2. Exécutez dans l'ordre les fichiers `supabase/migrations/0001` à `0012` dans **SQL Editor** (ou via la CLI Supabase). Pour devenir super-admin : `insert into public.platform_admins (user_id) values ('<votre user id>');`
3. **Authentication > Providers > Email** : activez « Confirm email ».
4. **Authentication > URL Configuration** : renseignez *Site URL* (votre domaine Vercel).
5. **Authentication > Email Templates** (Confirm signup, Invite user, Reset password) : remplacez le lien par
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (`type=invite` pour l'invitation, `type=recovery` pour la réinitialisation).
6. **Authentication > Multi-Factor** : activez TOTP.
   **Adresse d'envoi des emails** (confirmation, invitation, mot de passe oublié) : **Authentication > Emails > SMTP Settings** → *Enable custom SMTP*, puis renseignez *Sender email* (ex. `no-reply@votre-domaine.sn`), *Sender name* (ex. `DIOMETRO`) et les identifiants SMTP de votre fournisseur (Resend, Brevo ou Gmail ont des offres gratuites). Sans SMTP personnalisé, Supabase envoie depuis son adresse par défaut, limitée à quelques emails par heure. Si vous utilisez un domaine, configurez SPF/DKIM chez le fournisseur pour éviter les spams.
7. Copiez `.env.example` en `.env.local` et renseignez l'URL et la clé *publishable*.
   Pour les invitations, ajoutez `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement, **jamais** `NEXT_PUBLIC_`).

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # logique métier + isolation RLS sur un vrai PostgreSQL (PGlite)
npm run typecheck && npm run build
```

Déploiement : importez le dépôt dans Vercel (offre Hobby) et définissez les mêmes variables d'environnement.

## Modèle de sécurité

| Sujet | Mesure |
|---|---|
| Authentification | Supabase Auth (mots de passe hachés côté serveur), politique de 12 caractères, messages génériques (anti-énumération) |
| MFA | TOTP obligatoire : la base refuse toute donnée tant que la session n'est pas `aal2` |
| Autorisation | RLS forcée sur toutes les tables ; rôles contrôlés en base, doublés côté serveur |
| Isolation des entreprises | `tenant_id` immuable, politiques par entreprise, tests automatisés |
| Audit | Table alimentée par triggers, sans droit d'écriture/suppression pour les utilisateurs |
| Entrées | Validation Zod côté serveur, contraintes `CHECK` en base |
| XSS | React échappe par défaut, aucun HTML brut, CSP stricte à nonce par requête |
| En-têtes | HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| Redirections | Liste blanche (`/auth/confirm`) |
| Secrets | Aucun secret dans le code ; clé `service_role` serveur uniquement |
| CI | `npm audit`, typage, tests et build à chaque push |

## Alertes email : mise en service et vérification

1. Variables Vercel (Settings > Environment Variables) : `CRON_SECRET` (au moins 32 caractères aléatoires), `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. Puis redéployer.
2. **Paramètres > Alertes par email > « Envoyer un email de test »** : vérifie l'envoi vers votre propre adresse et affiche le code d'erreur du serveur SMTP en cas de refus.
3. Test complet de la route : `curl -H "Authorization: Bearer <CRON_SECRET>" "https://<votre-site>/api/cron/alerts?force=1"` (`force=1` ignore les jalons et la limite d'un envoi par jour, sans écrire au journal). La réponse indique les variables manquantes, l'erreur SMTP éventuelle, ou `sent`/`recipients`.
4. Vercel appelle ensuite la route chaque jour à 07:00 UTC (`vercel.json`).

## Variables d'environnement

Voir `.env.example`. Obligatoires : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Pour les invitations, les alertes email et les QR codes : `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `CRON_SECRET`, `SMTP_*`, `MAIL_FROM`. Sur Vercel, `vercel.json` programme l'envoi quotidien des alertes (`/api/cron/alerts`).

## Tests

`npm test` : 70+ tests, dont l'isolation de la base sur un vrai PostgreSQL (PGlite) et un **test différentiel** qui exécute les fonctions de l'ancienne version (`legacy/index.html`) et compare ses résultats à ceux des calculateurs actuels sur 600 cas aléatoires.
