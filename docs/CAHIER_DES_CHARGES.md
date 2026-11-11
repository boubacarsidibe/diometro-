# DIOMETRO — Cahier des charges global (reconstitué à partir du code)

Document interne. Il décrit ce que le site fait aujourd'hui, pour qui, et ce qu'il faut pour en faire un produit livrable.
Il a été reconstitué en lisant le code de `BSL_suivi_metrologiquevf.index.html.html` (aucun test en navigateur). Les points marqués **(à confirmer)** sont des déductions.

## 1. But du site

DIOMETRO est une **application web de gestion et de suivi métrologique** : elle sert à savoir, pour chaque instrument de mesure d'une entreprise (pied à coulisse, manomètre, pipette, sonde de température, etc.) :
- où il est, qui en est responsable, et dans quel état il se trouve ;
- quand il a été étalonné, quand il doit l'être de nouveau ;
- quelles sont ses preuves (certificat, fiche de vie, procédure) ;
- ce qui lui est arrivé (étalonnage, vérification, maintenance, réparation, incident).

Objectif métier : être prêt pour un audit qualité (ISO 9001, ISO 17025, BPF/GMP **(à confirmer)**) et ne plus laisser un instrument dépasser sa date d'étalonnage.

C'est aussi un **produit commercial (SaaS)** : plusieurs entreprises clientes ont chacune leur espace, avec un abonnement payant selon le nombre d'instruments.

## 2. Utilisateurs et rôles

| Rôle | Ce qu'il peut faire |
|---|---|
| **Super-administrateur** (le propriétaire de la plateforme) | Accès via un bouton dédié sur l'écran de connexion. Gère toutes les entreprises : activer, bloquer, configurer l'envoi d'emails global, changer ses propres identifiants. |
| **Administrateur** (d'une entreprise) | Tout dans son entreprise : instruments, utilisateurs, corbeille, journal d'audit, paramètres. |
| **Responsable** | Ajoute des instruments ; modifie uniquement ceux dont il est le responsable. |
| **Consultation** | Lecture seule. |

## 3. Fonctionnalités actuelles

### 3.1 Comptes, connexion, abonnement
- **Inscription d'une entreprise** : nom, secteur, email professionnel (sert d'identifiant), téléphone, nombre d'instruments souhaité, bâtiments du site, logo, forfait. Confirmation de l'email par code. Le compte reste **« en attente »** jusqu'à validation du paiement par le super-admin.
- **Connexion** par email + mot de passe, avec vérification en deux étapes par code envoyé par email.
- **Mot de passe oublié** : code envoyé par email ou SMS, valable 15 minutes. Politique : 8 caractères, 1 chiffre, 1 caractère spécial. Mot de passe temporaire à changer à la première connexion.
- **Statuts d'une entreprise** : en attente, active, bloquée (connexion refusée avec message).
- **Thème par entreprise** (couleurs et logo).
- **Assistant d'aide (FAQ)** intégré.

### 3.2 Tableau de bord
Indicateurs du parc, répartition par bâtiment, alertes immédiates, statuts du parc, répartition étalonnage interne / externe, planning d'étalonnage par mois (clic sur un mois pour voir les instruments).

### 3.3 Instruments (cœur de l'application)
- Fiche instrument : identifiant, désignation, domaine de mesure (Dimensionnel, Pression, Température, Humidité, Masse, Force, Couple, Électrique, Optique, Acoustique, Volume, Vitesse, Chimique, Autre), graduation / étendue, tolérance, bâtiment, zone / poste, responsable, conformité (Oui / Non / À vérifier), **statut** (En service, En stock, En réparation, En étalonnage, Au rebut, Manquante), date d'étalonnage, date de prochaine calibration, fréquence (jours à années, à chaque utilisation, à vie), type d'étalonnage (Interne / Externe / À définir), raccordement COFRAC, stockage, commentaires.
- Pièces jointes : fiche de vie, certificat d'étalonnage, procédure, document prestataire, photo de l'instrument.
- Recherche et filtres (dont par échéance : dépassée, moins de 15 jours, 15 à 30 jours, au-delà de 30 jours).
- Limite du nombre d'instruments selon le forfait.
- Import / export **Excel** du parc.
- **Corbeille** : suppression récupérable (admin).

### 3.4 Interventions et étalonnage
- **Journal d'interventions** par instrument : étalonnage, vérification, maintenance, réparation, incident ; résultat (Conforme / Non conforme / À surveiller / Sans objet) ; réalisé en interne ou par un prestataire.
- Mise à jour automatique des dates quand un étalonnage est enregistré (la prochaine échéance est recalculée).
- **Modules de calcul intégrés** :
  - étalonnage de **pipettes par pesée** (ISO 8655, correction de masse volumique de l'eau, incertitude GUM) ;
  - étalonnage de **sondes Pt100** par comparaison à un étalon (coefficients a, b, c, incertitude) ;
  - **vérification par comparaison directe** à un étalon (sans incertitude, méthode simplifiée).
  Les résultats peuvent être enregistrés comme intervention.
- **Fiches de vie** : historique complet d'un instrument, imprimable / PDF.

### 3.5 Alertes
Liste des instruments à échéance (dépassée, moins de 15 jours, entre 15 et 30 jours) avec pastille de nombre dans le menu.

### 3.6 Étiquettes et QR codes
- Génération d'**étiquettes** imprimables par instrument.
- **QR codes** (générés dans le navigateur) à coller sur l'instrument ; scanné, il ouvre la fiche. Impression en planche.

### 3.7 Prestataires (laboratoires d'étalonnage)
Annuaire des prestataires (coordonnées, site, domaines couverts, types de prestations, grille tarifaire par domaine) et **comparateur de prestataires** par domaine de mesure.

### 3.8 Inventaire physique
Campagne d'inventaire : on coche les instruments retrouvés, on clôture, l'historique des campagnes est conservé (date, auteur, nombre retrouvé / manquant).

### 3.9 Utilisateurs et traçabilité
- Gestion des utilisateurs de l'entreprise (création, rôle, activation, réinitialisation de mot de passe).
- **Journal d'audit (audit trail)** : qui a fait quoi et quand (création, modification, suppression, restauration, changement de statut ou de date, connexions et échecs, changements de mot de passe, exports, interventions, étalonnages). Filtrable, exportable en Excel.

### 3.10 Espace super-administrateur
Liste des entreprises, activation / blocage, configuration de l'envoi d'emails (EmailJS) partagée, gestion de ses identifiants et récupération par email.

## 4. Offre commerciale prévue (dans le code)

Frais d'inscription uniques : **599 €** pour tous les forfaits.

| Forfait | Instruments | Mensuel | Annuel |
|---|---|---|---|
| Starter | 50 | 75 € | 750 € |
| Standard | 200 | 149 € | 1 490 € |
| Pro | 500 | 299 € | 2 990 € |
| Entreprise | 1 000 | 525 € | 5 250 € |
| Grand Compte | 2 000 | 990 € | 9 900 € |
| Sur-mesure | > 2 000 | sur devis | sur devis |

Aucun paiement en ligne n'est branché : le paiement est vérifié à la main, puis le super-admin active le compte.

## 5. Architecture actuelle

- Un seul fichier HTML (≈ 14 800 lignes) : interface, logique, styles, bibliothèques (Excel, QR code) ; PDF (jsPDF) et emails (EmailJS) chargés depuis un CDN.
- **Aucun serveur, aucune base de données** : toutes les données sont dans le `localStorage` du navigateur, séparées par entreprise.
- Conséquence : chaque appareil a ses propres données, rien n'est partagé entre utilisateurs, et la sécurité est contournable (voir `AUDIT.md`).

## 6. Ce qui est essentiel pour « rendre le projet » (livrable)

**Bloquant (sans cela, le produit ne peut pas être vendu ni utilisé à plusieurs) :**
1. **Back-end et base de données partagée** (par exemple Supabase ou Firebase) : une vraie authentification avec mots de passe hachés, données centralisées par entreprise, sauvegardes.
2. **Retirer les secrets du code** : mot de passe admin, mot de passe super-admin par défaut ; changer ceux qui ont été exposés.
3. **Rôles et statut d'abonnement contrôlés côté serveur**, pas dans le navigateur.
4. **Envoi d'emails fonctionnel** (EmailJS non configuré actuellement : aucune réinitialisation ni code de connexion ne part) et codes générés de façon sécurisée avec limite d'essais.
5. **Stockage des fichiers** (certificats, photos) sur un stockage dédié, pas en base64 dans le navigateur.

**Important :**
6. Conformité : mentions légales, CGU / CGV, politique de confidentialité (RGPD).
7. Paiement en ligne et facturation (ou procédure manuelle clairement documentée) ; prix en euros alors que la cible semble aussi l'Afrique de l'Ouest **(à confirmer)** : prévoir le FCFA et les moyens de paiement locaux.
8. Notifications automatiques des échéances par email (aujourd'hui, les alertes sont visibles seulement dans l'application).
9. Nettoyage : données de démonstration `TEST-00x`, code mort, découpage du fichier, renommage en `index.html`, hébergement avec nom de domaine et HTTPS.
10. Accessibilité, usage mobile (scan QR sur le terrain), mode hors ligne (PWA).
11. Tests de validation des calculs d'étalonnage par un métrologue (les calculs ISO 8655 / GUM engagent la responsabilité de l'éditeur).
12. Documentation utilisateur (guide, FAQ) et support.

## 7. Questions à trancher en interne

- Le public cible est-il uniquement des laboratoires et industries soumis à une norme précise (laquelle) ?
- Faut-il garder le principe « une entreprise = un espace », ou aussi multi-sites dans une même entreprise ?
- Qui assure l'activation des comptes et le support ?
- Hébergement et pays des données (important pour le RGPD) ?
- Priorité : sécuriser d'abord (back-end), ou compléter les fonctionnalités (notifications, paiement) ?
