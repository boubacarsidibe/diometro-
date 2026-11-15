// Génère les modèles d'e-mails Supabase (Authentication > Emails > Templates) aux couleurs DIOMETRO.
// Usage : node scripts/emails-supabase.mts  →  docs/emails-supabase/*.html, à coller dans le tableau de bord Supabase.
// Les liens passent par /auth/confirm (token_hash), qui vérifie le jeton côté serveur puis redirige vers la bonne page.
import { writeFileSync } from "node:fs";
import { BRAND, emailLayout } from "../lib/email-template.ts";

const SITE = "{{ .SiteURL }}";
const link = (type: string) => `${SITE}/auth/confirm?token_hash={{ .TokenHash }}&type=${type}`;
const p = (html: string) => `<p style="margin:0 0 12px">${html}</p>`;
const small = (html: string) => p(`<span style="color:${BRAND.muted}">${html}</span>`);
const fallback = (url: string) => small(`Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br><a href="${url}" style="color:${BRAND.wine};word-break:break-all">${url}</a>`);

const templates = [
  {
    file: "1-confirmation-inscription.html", name: "Confirm signup", subject: "Confirmez votre adresse e-mail · DIOMETRO",
    kicker: "Bienvenue", title: "Confirmez votre adresse e-mail", preheader: "Un clic pour activer votre espace DIOMETRO",
    body: p("Merci d'avoir choisi DIOMETRO pour le suivi métrologique de vos instruments.") + p("Confirmez votre adresse e-mail pour activer votre compte, puis renseignez votre entreprise : vous pourrez ensuite importer votre parc d'instruments."),
    cta: "Confirmer mon adresse", url: link("email"), after: small("Ce lien est valable pour une durée limitée. Vous n'avez pas créé de compte ? Ignorez simplement cet e-mail."),
    reason: "Vous recevez cet e-mail car une inscription à DIOMETRO a été faite avec cette adresse.",
  },
  {
    file: "2-invitation.html", name: "Invite user", subject: "Vous êtes invité à rejoindre DIOMETRO",
    kicker: "Invitation", title: "Rejoignez votre équipe sur DIOMETRO", preheader: "Choisissez votre mot de passe pour accéder au suivi des instruments",
    body: p("Un administrateur de votre entreprise vous a ouvert un accès à DIOMETRO, l'outil de suivi des étalonnages et des vérifications de vos instruments de mesure.") + p("Cliquez sur le bouton pour choisir votre mot de passe et accéder à votre espace."),
    cta: "Accepter l'invitation", url: link("invite"), after: small("Ce lien est valable pour une durée limitée. Vous ne vous attendiez pas à cette invitation ? Ignorez cet e-mail."),
    reason: "Vous recevez cet e-mail car un administrateur DIOMETRO a invité cette adresse.",
  },
  {
    file: "3-mot-de-passe-oublie.html", name: "Reset password", subject: "Réinitialisez votre mot de passe DIOMETRO",
    kicker: "Sécurité", title: "Choisissez un nouveau mot de passe", preheader: "Lien à usage unique",
    body: p("Vous avez demandé à réinitialiser le mot de passe de votre compte DIOMETRO.") + p("Cliquez sur le bouton pour en choisir un nouveau."),
    cta: "Choisir un nouveau mot de passe", url: link("recovery"), after: small("Ce lien est valable pour une durée limitée et ne sert qu'une fois. Vous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail : votre mot de passe actuel reste valable."),
    reason: "Vous recevez cet e-mail car une réinitialisation du mot de passe a été demandée pour cette adresse.",
  },
  {
    file: "4-changement-adresse.html", name: "Change Email Address", subject: "Confirmez votre nouvelle adresse e-mail · DIOMETRO",
    kicker: "Sécurité", title: "Confirmez votre nouvelle adresse", preheader: "Changement d'adresse e-mail du compte DIOMETRO",
    body: p(`Vous avez demandé à remplacer l'adresse de votre compte DIOMETRO <strong>{{ .Email }}</strong> par <strong>{{ .NewEmail }}</strong>.`) + p("Confirmez ce changement avec le bouton ci-dessous."),
    cta: "Confirmer le changement", url: link("email_change"), after: small("Vous n'êtes pas à l'origine de cette demande ? Ne cliquez pas et changez votre mot de passe."),
    reason: "Vous recevez cet e-mail car un changement d'adresse a été demandé sur un compte DIOMETRO.",
  },
  {
    file: "5-lien-de-connexion.html", name: "Magic Link", subject: "Votre lien de connexion DIOMETRO",
    kicker: "Connexion", title: "Votre lien de connexion", preheader: "Lien à usage unique",
    body: p("Cliquez sur le bouton pour vous connecter à DIOMETRO."),
    cta: "Me connecter", url: link("magiclink"), after: small("Ce lien est valable pour une durée limitée et ne sert qu'une fois. Vous n'avez rien demandé ? Ignorez cet e-mail."),
    reason: "Vous recevez cet e-mail car une connexion à DIOMETRO a été demandée avec cette adresse.",
  },
];

for (const t of templates) {
  const html = emailLayout({ appUrl: SITE, preheader: t.preheader, kicker: t.kicker, title: t.title, body: t.body, cta: { label: t.cta, url: t.url }, reason: t.reason })
    // le bouton est inséré après le corps : on ajoute le lien de secours et l'avertissement juste après lui
    .replace(/(<\/a>\n<\/td><\/tr><\/table>)/, `$1\n<div style="font-size:15px;line-height:1.6;margin-top:14px">${t.after}${fallback(t.url)}</div>`)
    .replace(/&amp;type=/g, "&type=");
  writeFileSync(`docs/emails-supabase/${t.file}`, html);
}
writeFileSync("docs/emails-supabase/README.md", `# Modèles d'e-mails Supabase (DIOMETRO)

À coller dans **Supabase > Authentication > Emails > Templates**. Pour chaque modèle : remplacer l'objet, passer l'éditeur en mode source et coller tout le contenu du fichier.

| Modèle Supabase | Objet | Fichier |
|---|---|---|
${templates.map((t) => `| ${t.name} | ${t.subject} | \`${t.file}\` |`).join("\n")}

Prérequis :
- **Authentication > URL Configuration > Site URL** = \`https://diometro.vercel.app\` (ou le domaine définitif). Les liens et le logo utilisent \`{{ .SiteURL }}\`.
- Le logo est servi par le site : \`{{ .SiteURL }}/email/diometro-logo.png\`. Il s'affiche dès que ce fichier est en ligne.
- Un SMTP personnalisé (Authentication > Emails > SMTP Settings) est recommandé : sans lui, Supabase limite l'envoi à quelques e-mails par heure et l'expéditeur n'est pas DIOMETRO.

Fichiers générés par \`node scripts/emails-supabase.mts\` à partir de \`lib/email-template.ts\` : modifier le script puis relancer, ne pas éditer les .html à la main.
`);
console.log(templates.length, "modèles écrits dans docs/emails-supabase/");
