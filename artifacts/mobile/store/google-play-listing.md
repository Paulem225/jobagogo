# Fiche Google Play — Jobagogo

> Référence complète à copier-coller dans la Google Play Console.  
> Langue : Français (fr-FR)  
> Package Android : `pro.jobagogo.app`

---

## 1. Nom de l'application

```
Jobagogo
```

## 2. Description courte (≤ 80 caractères)

```
Offres d'emploi personnalisées grâce à l'IA — trouvez votre prochain poste.
```

## 3. Description complète (≤ 4 000 caractères)

```
Jobagogo analyse votre profil et vos compétences pour vous proposer chaque jour les offres d'emploi qui vous correspondent vraiment.

Fini de parcourir des centaines d'annonces sans pertinence. Importez votre CV, renseignez vos préférences, et laissez Jobagogo faire le tri pour vous.

──────────────────────
🎯 UN FEED PERSONNALISÉ
──────────────────────
Chaque matin, votre fil d'actualité se met à jour avec une sélection d'offres triée par pertinence. La meilleure offre du jour est mise en avant avec un score de correspondance (FIT SCORE) qui explique pourquoi elle vous correspond.

──────────────────────
🔍 DÉCOUVREZ TOUTES LES OFFRES
──────────────────────
Explorez l'ensemble des annonces disponibles. Filtrez par secteur (Finance, Tech, Commercial, RH, Santé, BTP…), activez le filtre « Remote » pour le télétravail, ou recherchez directement par poste ou entreprise.

──────────────────────
📄 ANALYSE DE CV PAR IA
──────────────────────
Importez votre CV (PDF, Word ou texte) et notre intelligence artificielle en extrait automatiquement vos compétences, années d'expérience, formations et expériences professionnelles. Ces données enrichissent vos correspondances.

──────────────────────
🔖 SAUVEGARDEZ VOS FAVORIS
──────────────────────
Mettez de côté les offres qui vous intéressent pour les consulter plus tard depuis votre profil ou l'onglet Sauvegardés.

──────────────────────
⭐ PREMIUM : PLUS D'OFFRES, PLUS DE CHANCES
──────────────────────
La version gratuite vous donne accès aux meilleures offres du jour. Passez en Premium pour accéder à la totalité des offres sans limite et maximiser vos chances de décrocher le poste idéal.

──────────────────────
📊 MARCHÉ DE L'EMPLOI EN TEMPS RÉEL
──────────────────────
Consultez les statistiques du marché : offres disponibles, sources actives, compétences les plus demandées — pour adapter votre profil aux besoins du moment.

Jobagogo, c'est votre assistant emploi personnel. Créez votre profil en quelques minutes et commencez à recevoir des offres qui vous ressemblent.
```

---

## 4. Icône de l'application

- **Fichier source** : `artifacts/mobile/assets/images/icon.png`
- **Taille requise** : 512 × 512 px (PNG, fond transparent non requis)
- **Note** : L'icône actuelle fait 500 × 500 px — redimensionner à 512 × 512 avant upload.

```bash
# Commande de redimensionnement (ImageMagick)
convert artifacts/mobile/assets/images/icon.png -resize 512x512! artifacts/mobile/store/icon-512.png
```

---

## 5. Visuel promotionnel (Feature Graphic)

- **Fichier** : `artifacts/mobile/store/feature-graphic.png`
- **Dimensions** : 1024 × 500 px
- Affiché en tête de fiche Play Store sur tablettes et en mode paysage.

---

## 6. Captures d'écran Android (téléphone)

Minimum 2, maximum 8. Format portrait recommandé (9:16 ou similaire).

| # | Fichier | Contenu |
|---|---------|---------|
| 1 | `store/screenshot-1-feed.png` | Feed personnalisé — offre vedette du jour avec FIT SCORE |
| 2 | `store/screenshot-2-discover.png` | Découverte — recherche et filtres par secteur |
| 3 | `store/screenshot-3-profile.png` | Profil — informations, CV analysé, compétences |
| 4 | `store/screenshot-4-onboarding.png` | Onboarding — configuration rapide de ses préférences |

---

## 7. Classification du contenu (Content Rating)

Répondre au questionnaire IARC dans la Play Console :

| Question | Réponse |
|----------|---------|
| Violence | Non |
| Sexualité | Non |
| Langage offensant | Non |
| Drogues / alcool | Non |
| Jeux d'argent | Non |
| Informations personnelles collectées | Oui (profil, CV) |
| Achats intégrés | Oui (abonnement Premium) |

**Classification attendue** : **Tout public (Everyone)** — aucun contenu sensible.

---

## 8. Audience cible

| Paramètre | Valeur |
|-----------|--------|
| Tranche d'âge | 18 ans et plus |
| Contenu axé enfants | Non |
| Publicités personnalisées pour enfants | N/A |

---

## 9. Publicité

```
Cette application contient-elle des publicités ? → NON
```

Jobagogo ne diffuse pas de publicités tierces. La monétisation repose uniquement sur l'abonnement Premium intégré.

---

## 10. Sécurité des données (Data Safety)

### Données collectées

| Type de donnée | Collectée | Partagée | Chiffrement | Suppression possible |
|----------------|-----------|----------|-------------|----------------------|
| Nom | Oui | Non | Oui (transit) | Oui |
| Adresse e-mail | Oui (optionnel) | Non | Oui (transit) | Oui |
| Numéro de téléphone | Oui (optionnel) | Non | Oui (transit) | Oui |
| Profil LinkedIn | Oui (optionnel) | Non | Oui (transit) | Oui |
| Localisation (ville) | Oui | Non | Oui (transit) | Oui |
| CV / Documents | Oui | Non | Oui (transit) | Oui |
| Historique d'utilisation (offres consultées/sauvegardées) | Oui | Non | Oui (transit) | Oui |

### Partage de données

Aucune donnée n'est vendue ni partagée avec des tiers à des fins publicitaires.

### Finalités du traitement

- Personnalisation des offres d'emploi
- Analyse du CV par IA pour améliorer les correspondances
- Gestion de l'abonnement Premium

### Formulaires Play Console à remplir

- **Les données sont-elles chiffrées en transit ?** → Oui (HTTPS)
- **Les utilisateurs peuvent-ils demander la suppression de leurs données ?** → Oui (suppression du profil via l'application ou par e-mail à contact@jobagogo.pro)
- **Les données sont-elles collectées pour les enfants ?** → Non

---

## 11. Politique de confidentialité

**URL publique** : `https://jobagogo.pro/privacy`

> En attendant le déploiement de production, l'URL de développement est :
> `https://<REPLIT_DEV_DOMAIN>/api/privacy`

La politique est servie dynamiquement par le serveur API (route `GET /api/privacy`).  
Source : `artifacts/api-server/src/routes/privacy.ts`

---

## 12. Catégorie d'application

```
Catégorie principale : Entreprises
Sous-catégorie : Emploi
```

---

## 13. Informations de contact du développeur

| Champ | Valeur |
|-------|--------|
| Site web | https://jobagogo.pro |
| E-mail | contact@jobagogo.pro |
| Adresse physique | (à compléter avant soumission) |

---

## 14. Pays de distribution

Distribution recommandée : **Côte d'Ivoire, Sénégal, Mali, Burkina Faso, Cameroun, Guinée, Togo, Bénin** (Afrique francophone).  
Ou sélectionner **Tous les pays** et affiner si nécessaire.

---

## 15. Prix

```
Application gratuite avec achats intégrés (abonnement Premium)
```

---

## 16. Checklist avant soumission

- [ ] Icône 512 × 512 px uploadée
- [ ] Feature graphic 1024 × 500 px uploadée
- [ ] Minimum 2 captures d'écran portrait uploadées
- [ ] Politique de confidentialité déployée et URL accessible publiquement
- [ ] Questionnaire IARC complété (classification de contenu)
- [ ] Section Data Safety remplie
- [ ] APK / AAB signé avec la clé de production
- [ ] `versionCode` incrémenté si nécessaire (`app.json` → `android.versionCode`)
- [ ] Adresse physique du développeur renseignée
