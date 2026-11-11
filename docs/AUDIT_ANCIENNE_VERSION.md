# Audit du site DIOMETRO

Fichier audité : `BSL_suivi_metrologiquevf.index.html.html` (application monopage, 14 756 lignes, 1,1 Mo, aucun back-end).
Date : 2026-10-18. Audit statique du code (pas de test navigateur).

## Résumé

L'application est fonctionnellement riche (multi-entreprises, rôles, QR codes, PDF/Excel, corbeille, journal d'audit), et le JavaScript est syntaxiquement valide (4 blocs `<script>` vérifiés avec `node --check`).
Le point bloquant est la **sécurité** : toute l'authentification et toutes les données vivent dans le navigateur (`localStorage`). Le titre « Suivi Métrologique sécurisé » n'est pas tenu en l'état.

## 🔴 Critique

1. **Identifiants réels en clair dans le dépôt** (l. 6462-6463)
   `SEED_USERS` et `ADMIN_CURRENT_PASSWORD` contiennent l'email et le mot de passe de l'administrateur (`[mot de passe masqué]`). Le code ré-impose même ce mot de passe à chaque chargement (l. 7236, 7241).
   → Considérer ce mot de passe comme **compromis** : le changer partout où il est utilisé, et le retirer du code (il reste dans l'historique git).
2. **Mot de passe super-admin par défaut en dur** (l. 12833) : `superadmin` / `Metro@2024!`, valable tant que personne ne l'a changé dans `localStorage`.
3. **Authentification 100 % côté client**
   - `login()` compare le mot de passe en clair (`user.password !== password`, l. 8174) ; les mots de passe sont stockés en clair dans `localStorage`.
   - La session est juste `localStorage[session] = username` (l. 8209) : n'importe qui peut s'y faire passer pour un autre utilisateur, ou passer admin, depuis la console du navigateur.
   - Le contrôle des rôles (`isAdmin()`, l. 7324) et le statut d'abonnement (`currentTenant.status`, l. 8153) sont modifiables côté client : l'accès « bloqué / en attente » se contourne.
   - Le verrouillage anti-force-brute du super-admin (5 essais / 60 s) est en mémoire : un rechargement de page le remet à zéro.
4. **Réinitialisation de mot de passe et OTP non sécurisés**
   - Le code est généré avec `Math.random()` (l. 7828), non cryptographique, puis **stocké en clair dans `settings.pendingReset`** (l. 7842) dans le navigateur, donc lisible par l'utilisateur lui-même : le code est contournable sans accès à la boîte mail.
   - Le nouveau mot de passe n'est contrôlé qu'à 4 caractères (l. 7916), alors que la politique annoncée est de 8 avec chiffre et caractère spécial (écart avec `validatePassword`, l. 7406).
   - Aucune limite de tentatives sur le code.
5. **Pas de partage de données** : chaque appareil a ses propres données. Plusieurs utilisateurs d'une même entreprise ne voient pas les mêmes instruments, et l'« unicité globale des identifiants » (l. 7485+) ne couvre que le navigateur courant. Un vidage du cache = perte totale des données (pas de sauvegarde automatique).

**Recommandation de fond** : introduire un vrai back-end (par exemple Supabase ou Firebase : auth gérée, mots de passe hachés, règles d'accès par entreprise, base partagée). C'est le chantier prioritaire ; le reste est secondaire tant que ce point n'est pas traité.

## 🟠 Important

6. **XSS potentielle** : 123 usages de `innerHTML`, dont 14 avec interpolation directe. `safeHtml` (l. 7392) est bien utilisé (241 appels) mais **n'échappe pas l'apostrophe `'`** ; or 45 `onclick="fn('${...}')"` insèrent des valeurs dans des attributs JS. Un identifiant d'instrument ou un nom contenant `'` peut casser ou détourner le handler. Exemple d'interpolation brute : l. 9323 (`name`). Les `document.write` (l. 13662, 14343, impression/rapports) méritent la même vérification.
7. **Aucun en-tête de sécurité** : pas de Content-Security-Policy, pas d'attribut `integrity` (SRI) sur les scripts CDN (`@emailjs/browser@4` non figé en version exacte, `jspdf 2.5.1`).
8. **EmailJS non configuré** (l. 6476-6478 : `VOTRE_PUBLIC_KEY`…). Tant que ce n'est pas fait, aucun email (réinitialisation, OTP de connexion, notifications d'inscription) ne part. La connexion par OTP email risque donc d'être bloquée pour les utilisateurs.
9. **Stockage saturable** : les images (`instrumentImage`, certificats, etc.) sont stockées en base64 dans `localStorage` (limite d'environ 5 Mo). Aucune gestion visible de l'erreur de quota (`QuotaExceededError`) : risque de perte silencieuse à l'enregistrement.
10. **Données de démonstration** : 5 instruments `TEST-00x` injectés par défaut, avec des dates d'étalonnage déjà dépassées.

## 🟡 Qualité / maintenabilité

11. Fichier unique de 1,1 Mo : une bibliothèque XLSX (~450 Ko) et un générateur QR sont collés dans le HTML ; pas de découpage, difficile à relire et à versionner. Séparer en `index.html`, `app.js`, `style.css` et libs.
12. Nom de fichier incohérent : `…index.html.html`. Le renommer en `index.html` pour un déploiement (GitHub Pages, Netlify…).
13. 216 `onclick=` inline : incompatible avec une CSP stricte ; à migrer vers `addEventListener`.
14. 5 `console.log` restants, du code mort (`startRecoveryEmailVerification` / `confirmRecoveryEmailVerification` sont des fonctions vides, l. 7830-7831), commentaires de migration historiques.
15. Caractères corrompus dans des commentaires (encodage cassé, l. ~13113-13114, séparateurs `�`) : sans impact fonctionnel, à nettoyer.

## 🔵 Accessibilité / UX / PWA

16. Accessibilité faible : 3 attributs `aria-*` et 1 `role` pour toute l'application ; 5 images sur 15 sans `alt` ; navigation faite de `<button onclick>` et modales sans gestion du focus (piège de focus, `Esc`, `role="dialog"`).
17. Responsive : 10 `@media`, c'est correct, mais à tester sur mobile (usage terrain avec scan QR).
18. Pas de PWA réelle (aucun manifeste ni service worker) : pas d'usage hors ligne alors que c'est le cas d'usage naturel d'un outil terrain stocké en local.
19. Pas de `<meta name="description">`, pas de favicon déclaré.

## ✅ Points positifs

- Politique de mot de passe définie (8 caractères, chiffre, caractère spécial) et indicateur de robustesse.
- Journal d'audit (connexions, échecs, changements de mot de passe), corbeille, rôles admin / responsable.
- Échappement HTML systématique dans la plupart des rendus (`safeHtml`).
- Aucun `eval` / `new Function`, aucun identifiant dupliqué dans le HTML, JavaScript syntaxiquement valide.
- Multi-entreprises (tenants) avec thème par entreprise.

## Plan d'action proposé

| Priorité | Action |
|---|---|
| 1 | Changer le mot de passe admin exposé et le super-admin par défaut ; les retirer du code |
| 2 | Mettre en place un back-end avec authentification hachée et base partagée |
| 3 | Configurer EmailJS (ou l'email du back-end) et remplacer `Math.random()` par `crypto.getRandomValues` |
| 4 | Échapper aussi `'` dans `safeHtml`, remplacer les `onclick` à valeurs interpolées |
| 5 | Ajouter CSP + SRI, figer les versions CDN |
| 6 | Découper le fichier, renommer en `index.html`, ajouter PWA et passes d'accessibilité |

Dis-moi par quoi commencer et je corrige sur cette branche (le plus rapide sans back-end : points 1, 3, 4, 5 et 9).
