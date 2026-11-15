# Modèles d'e-mails Supabase (DIOMETRO)

À coller dans **Supabase > Authentication > Emails > Templates**. Pour chaque modèle : remplacer l'objet, passer l'éditeur en mode source et coller tout le contenu du fichier.

| Modèle Supabase | Objet | Fichier |
|---|---|---|
| Confirm signup | Confirmez votre adresse e-mail · DIOMETRO | `1-confirmation-inscription.html` |
| Invite user | Vous êtes invité à rejoindre DIOMETRO | `2-invitation.html` |
| Reset password | Réinitialisez votre mot de passe DIOMETRO | `3-mot-de-passe-oublie.html` |
| Change Email Address | Confirmez votre nouvelle adresse e-mail · DIOMETRO | `4-changement-adresse.html` |
| Magic Link | Votre lien de connexion DIOMETRO | `5-lien-de-connexion.html` |

Prérequis :
- **Authentication > URL Configuration > Site URL** = `https://diometro.vercel.app` (ou le domaine définitif). Les liens et le logo utilisent `{{ .SiteURL }}`.
- Le logo est servi par le site : `{{ .SiteURL }}/email/diometro-logo.png`. Il s'affiche dès que ce fichier est en ligne.
- Un SMTP personnalisé (Authentication > Emails > SMTP Settings) est recommandé : sans lui, Supabase limite l'envoi à quelques e-mails par heure et l'expéditeur n'est pas DIOMETRO.

Fichiers générés par `node scripts/emails-supabase.mts` à partir de `lib/email-template.ts` : modifier le script puis relancer, ne pas éditer les .html à la main.
