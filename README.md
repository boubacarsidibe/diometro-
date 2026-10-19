# DIOMETRO

Solution numérique de gestion et de suivi métrologique des instruments de mesure.

**Stack (100 % offre gratuite)** : Next.js 16 (App Router, TypeScript) · Supabase (PostgreSQL, Auth, MFA) · Vercel. Les emails d'authentification sont envoyés par Supabase (EmailJS n'est plus nécessaire).

> L'ancienne application mono-fichier est archivée dans `legacy/`. Elle stockait mots de passe et données dans le navigateur ; elle ne doit plus être utilisée. Voir `SECURITY_AUDIT.md`.

## Fonctionnalités (v1)

- Inscription d'une entreprise, connexion, mot de passe oublié, **double authentification TOTP obligatoire**
- Multi-entreprise **isolé par la base de données** (Row Level Security)
- Rôles : administrateur, **coordinateur** (lecture/écriture, gère les comptes des autres coordinateurs et des consultants, jamais ceux des administrateurs), consultation (lecture seule)
- Tableau de bord de conformité (mêmes seuils : expiré, < 15 j, ≤ 30 j), alertes d'échéance
- Instruments, fiches de vie, historique des interventions ; un étalonnage conforme replanifie automatiquement l'échéance
- Gestion des utilisateurs (invitation par email, rôle, désactivation)
- Audit trail non modifiable (alimenté par triggers)

À venir (hors v1) : QR codes et étiquettes, planning, inventaire, prestataires, exports Excel/PDF, pièces jointes (Supabase Storage), corbeille.

## Installation

1. Créez un projet gratuit sur [supabase.com](https://supabase.com).
2. Exécutez, dans l'ordre, `supabase/migrations/0001_init.sql` puis `0002_coordinators_manage_coordinators.sql` dans **SQL Editor** (ou via la CLI Supabase).
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
