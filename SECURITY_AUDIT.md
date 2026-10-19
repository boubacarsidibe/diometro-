# Audit de sécurité — ancienne version (`legacy/index.html`)

Audit statique de l'ancienne application mono-fichier et correspondance avec la refonte.
Cause racine commune : **toute la sécurité s'exécutait dans le navigateur** (données, mots de passe et rôles dans le `localStorage`).

| ID | Constat (ancienne version) | Sévérité | Traitement dans la refonte |
|---|---|---|---|
| S-01 | Mots de passe stockés et comparés en clair | Critique | Supabase Auth : hachage côté serveur |
| S-02 | Identifiants super-admin / admin codés en dur dans le code, PIN `1234` | Critique | Supprimés ; aucun compte par défaut. **Considérer ces mots de passe comme compromis** |
| S-03 | OTP généré et vérifié côté client (`Math.random`), contournable | Critique | TOTP géré par Supabase, exigé par la base (`aal2`) |
| S-04 | Rôles et isolation entre entreprises vérifiés en JavaScript seulement | Critique | RLS forcée + rôles en base ; tests `tests/rls.test.ts` |
| S-05 | Session restaurée à partir du seul nom d'utilisateur en `localStorage` | Critique | Sessions Supabase (jetons signés, cookies) validées par `getUser()` |
| S-06 | XSS : ~120 `innerHTML`, échappement incomplet | Élevée | React + CSP à nonce, aucun HTML brut |
| S-07 | Clés EmailJS modifiables et visibles côté client | Élevée | Emails envoyés par Supabase ; plus de clé client |
| S-08 | Scripts CDN sans SRI, aucune CSP | Élevée | Dépendances npm figées (`package-lock.json`) + CSP |
| S-09 | Pas de limitation des tentatives | Moyenne | Rate limiting natif de Supabase Auth |
| S-10 | Journal d'audit modifiable | Moyenne | Table append-only via triggers (testé) |
| S-11 | `document.write` sans échappement (étiquettes, QR) | Moyenne | Plus de `document.write` ; à reprendre lors du portage des étiquettes |

## Reste à traiter manuellement

- Changer les mots de passe de tout système où les identifiants de l'ancienne version ont servi.
- Rotation de la clé EmailJS si elle a été saisie dans l'ancienne version.
- Supprimer `legacy/` une fois la migration terminée (il contient les identifiants par défaut, toujours présents dans l'historique git).
- Activer le MFA et la confirmation d'email dans Supabase (voir README).
- Prévoir : politique de conservation des journaux, sauvegardes (quotidiennes sur plan payant Supabase), conformité à la loi sénégalaise 2008-12 sur les données personnelles (déclaration CDP, mentions d'information).
