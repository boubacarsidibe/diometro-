// Habillage des e-mails DIOMETRO : en-tête bordeaux avec le logo, liseré orange, carte crème, bouton orange.
// Mise en page en tableaux et styles en ligne : c'est ce que Gmail, Outlook et les applications mobiles affichent de façon fiable.
// Le logo est une image PNG hébergée sur le site (les SVG ne s'affichent pas dans Gmail ni Outlook).

export const BRAND = {
  wine: "#4B1B27", wineDeep: "#2A0F17", orange: "#FF6B1A", cream: "#F6F3EE", card: "#FFFFFF",
  sage: "#E4E8E0", line: "#E6E1D8", ink: "#24131A", muted: "#7A6A6F",
  red: "#B42318", redBg: "#FDE7E4", amber: "#9A4A06", amberBg: "#FFEBD9", yellow: "#7A5B00", yellowBg: "#FFF4C7", green: "#1B6B3A", greenBg: "#E1F3E7",
};
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function appBaseUrl(url?: string | null): string {
  return (url || process.env.APP_URL || "https://diometro.vercel.app").replace(/\/$/, "");
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export type EmailParts = {
  appUrl: string;
  /** Texte d'aperçu affiché par la messagerie à côté de l'objet. */
  preheader: string;
  /** Petit libellé au-dessus du titre (ex. « Sécurité », « Alertes d'échéance »). */
  kicker: string;
  title: string;
  /** Contenu HTML déjà échappé. */
  body: string;
  cta?: { label: string; url: string };
  /** Pourquoi la personne reçoit ce message (pied de page). */
  reason: string;
};

export function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px"><tr><td style="border-radius:999px;background:${BRAND.orange}">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:${BRAND.wineDeep};text-decoration:none;border-radius:999px">${escapeHtml(label)}&nbsp;&rarr;</a>
</td></tr></table>`;
}

export function emailLayout(p: EmailParts): string {
  const logo = `${p.appUrl}/email/diometro-logo.png`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(p.title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.sage};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(p.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.sage}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${BRAND.card};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.line}">
<tr><td style="background:${BRAND.wine};padding:22px 28px">
<a href="${escapeHtml(p.appUrl)}" target="_blank" style="text-decoration:none"><img src="${escapeHtml(logo)}" width="180" height="38" alt="DIOMETRO" style="display:block;border:0;outline:none;width:180px;height:38px;color:${BRAND.cream};font-family:${FONT};font-size:22px;font-weight:800"></a>
</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND.orange}">&nbsp;</td></tr>
<tr><td style="padding:30px 28px 8px;font-family:${FONT};color:${BRAND.ink}">
<div style="font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.orange};font-weight:700;margin-bottom:8px">${escapeHtml(p.kicker)}</div>
<h1 style="margin:0 0 16px;font-size:23px;line-height:1.25;color:${BRAND.wineDeep};font-weight:800">${escapeHtml(p.title)}</h1>
<div style="font-size:15px;line-height:1.6;color:${BRAND.ink}">${p.body}</div>
${p.cta ? button(p.cta.label, p.cta.url) : ""}
</td></tr>
<tr><td style="padding:22px 28px 26px;font-family:${FONT}">
<div style="border-top:1px solid ${BRAND.line};padding-top:16px;font-size:12px;line-height:1.55;color:${BRAND.muted}">
${escapeHtml(p.reason)}<br>
<strong style="color:${BRAND.wine}">DIOMETRO</strong> · Suivi métrologique des instruments de mesure · <a href="${escapeHtml(p.appUrl)}" style="color:${BRAND.muted}">${escapeHtml(p.appUrl.replace(/^https?:\/\//, ""))}</a>
</div>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 12px">${html}</p>`;

// ── Code de connexion (double authentification par e-mail) ──
export function codeEmail(code: string, validityMin: number, appUrl: string) {
  const body = p("Voici votre code pour terminer la connexion à DIOMETRO :") +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 18px"><tr><td style="padding:14px 22px;border:1.5px solid ${BRAND.orange};border-radius:12px;background:${BRAND.cream};font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:10px;color:${BRAND.wineDeep}">${escapeHtml(code)}</td></tr></table>` +
    p(`Il est valable <strong>${validityMin} minutes</strong> et ne sert qu'une seule fois.`) +
    p(`<span style="color:${BRAND.muted}">Vous n'êtes pas à l'origine de cette connexion ? Ne communiquez ce code à personne et changez votre mot de passe.</span>`);
  return {
    subject: `${code} est votre code de connexion DIOMETRO`,
    text: `Votre code de connexion DIOMETRO : ${code}\n\nIl est valable ${validityMin} minutes et ne sert qu'une seule fois.\nSi vous n'êtes pas à l'origine de cette connexion, ne communiquez ce code à personne et changez votre mot de passe.\n\n${appUrl}`,
    html: emailLayout({ appUrl, preheader: `Code valable ${validityMin} minutes`, kicker: "Sécurité", title: "Votre code de connexion", body, reason: "Vous recevez cet e-mail car une connexion à votre compte DIOMETRO est en cours." }),
  };
}

// ── E-mail de test (Paramètres) ──
export function testEmail(displayName: string, tenantName: string, appUrl: string) {
  const body = p(`Bonjour ${escapeHtml(displayName)},`) +
    p(`Si vous lisez ce message, l'envoi d'e-mails de DIOMETRO fonctionne pour <strong>${escapeHtml(tenantName)}</strong> : les alertes d'échéance d'étalonnage arriveront dans cette boîte.`) +
    p(`<span style="color:${BRAND.muted}">Pensez à ajouter l'adresse d'expédition à vos contacts pour éviter le dossier « Spam ».</span>`);
  return {
    subject: "DIOMETRO · e-mail de test",
    text: `Bonjour ${displayName},\n\nSi vous lisez ce message, l'envoi d'e-mails de DIOMETRO fonctionne pour ${tenantName} : les alertes d'échéance arriveront dans cette boîte.\n\n${appUrl}`,
    html: emailLayout({ appUrl, preheader: "L'envoi d'e-mails fonctionne", kicker: "Paramètres", title: "L'envoi d'e-mails fonctionne", body, cta: { label: "Ouvrir DIOMETRO", url: `${appUrl}/dashboard` }, reason: "Vous recevez cet e-mail car un administrateur a demandé un e-mail de test depuis les Paramètres." }),
  };
}

// ── Tableau de lignes « libellé : valeur » (e-mails internes à l'équipe DIOMETRO) ──
export function infoTable(lines: [string, string][]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;margin:4px 0 6px">${lines
    .map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;color:${BRAND.muted};white-space:nowrap;vertical-align:top;border-bottom:1px solid ${BRAND.line}">${escapeHtml(k)}</td><td style="padding:8px 0;font-weight:600;border-bottom:1px solid ${BRAND.line}">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;
}

// ── Demande de formule (envoyée à l'équipe DIOMETRO) ──
export function planRequestEmail(info: { company: string; displayName: string; email: string; plan: string; scope: string }, appUrl: string) {
  const body = p(`<strong>${escapeHtml(info.company)}</strong> demande à passer à la formule <strong>${escapeHtml(info.plan)}</strong>.`) +
    infoTable([["Entreprise", info.company], ["Demandeur", info.displayName], ["E-mail", info.email], ["Formule", info.plan], ["Capacité", info.scope]]) +
    p(`<span style="color:${BRAND.muted}">Répondez directement à cet e-mail pour joindre le demandeur. Activez la formule depuis la page Plateforme une fois le paiement reçu.</span>`);
  return {
    subject: `DIOMETRO · demande de formule ${info.plan} · ${info.company}`.replace(/[\r\n]+/g, " "),
    text: `Entreprise : ${info.company}\nDemandeur : ${info.displayName} (${info.email})\nFormule demandée : ${info.plan} (${info.scope})\n\nActivez la formule depuis la page Plateforme une fois le paiement reçu.\n${appUrl}/admin`,
    html: emailLayout({ appUrl, preheader: `${info.company} · formule ${info.plan}`, kicker: "Demande de formule", title: `Formule ${info.plan} demandée`, body, cta: { label: "Ouvrir la page Plateforme", url: `${appUrl}/admin` }, reason: "Vous recevez cet e-mail car vous administrez la plateforme DIOMETRO." }),
  };
}

// ── Nouvelle entreprise inscrite (envoyée à l'équipe DIOMETRO) ──
export function newTenantEmail(lines: [string, string][], company: string, appUrl: string) {
  const body = p(`Une nouvelle entreprise vient de créer son espace : <strong>${escapeHtml(company)}</strong>.`) + infoTable(lines);
  return {
    subject: `Nouvelle inscription : ${company}`.replace(/[\r\n]+/g, " "),
    text: `Nouvelle inscription sur DIOMETRO\n\n${lines.map(([k, v]) => `${k} : ${v}`).join("\n")}\n\nPlateforme : ${appUrl}/admin`,
    html: emailLayout({ appUrl, preheader: `${company} vient de s'inscrire`, kicker: "Nouvelle inscription", title: "Une entreprise a rejoint DIOMETRO", body, cta: { label: "Ouvrir la page Plateforme", url: `${appUrl}/admin` }, reason: "Vous recevez cet e-mail car vous administrez la plateforme DIOMETRO." }),
  };
}
