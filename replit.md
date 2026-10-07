# JobMatch

Application mobile de matching d'offres d'emploi en français. Scrape des offres mockées, calcule un score de compatibilité (0–100) par rapport au profil candidat, et présente des résultats classés par pertinence.

## Run & Operate

- `PORT=5000 pnpm --filter @workspace/api-server run dev` — API Express (port 5000)
- `PORT=18115 pnpm --filter @workspace/mobile run dev` — App Expo (port 18115)
- `pnpm run typecheck` — typecheck complet
- `pnpm run build` — typecheck + build tous les packages
- `pnpm --filter @workspace/api-spec run codegen` — regénère les hooks React Query et schémas Zod
- `pnpm --filter @workspace/db run push` — push le schéma DB (dev uniquement)
- Env requis : `DATABASE_URL` — connexion Postgres

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API : Express 5, port 5000
- Mobile : Expo 54 / React Native 0.81.5 / expo-router
- DB : PostgreSQL + Drizzle ORM
- Validation : Zod (`zod/v4`), `drizzle-zod`
- API codegen : Orval (depuis OpenAPI spec)
- Build : esbuild (bundle CJS)

## Where things live

- `lib/api-spec/` — spec OpenAPI (source de vérité)
- `lib/api-client-react/` — hooks React Query générés (Orval)
- `lib/db/` — schéma Drizzle + connexion Postgres
- `artifacts/api-server/src/routes/` — routes Express (profile, jobs, matches, saved)
- `artifacts/api-server/src/lib/matching.ts` — algorithme de scoring (skills 40%, location 25%, experience 20%, salary 15%)
- `artifacts/api-server/src/lib/scraper.ts` — 30 offres mockées (LinkedIn, Welcome to the Jungle, Indeed)
- `artifacts/mobile/app/(tabs)/` — 4 onglets : Feed, Découvrir, Sauvegardés, Profil
- `artifacts/mobile/app/(tabs)/job/[id].tsx` — fiche offre détaillée avec score ring et barres
- `artifacts/mobile/app/onboarding.tsx` — wizard 5 étapes pour créer/modifier son profil
- `artifacts/mobile/components/FitScoreRing.tsx` — cercle SVG animé + ScoreBadge
- `artifacts/mobile/components/JobCard.tsx` — carte offre avec score, tags, compétences, bookmark

## Architecture decisions

- **API montée en `/api`** — le proxy shared route `/api` → port 5000. Ne pas changer le préfixe sans mettre à jour artifact.toml.
- **PORT explicite dans le workflow** — le runner Replit n'injecte pas PORT automatiquement pour les artifacts API ; utiliser `PORT=5000 pnpm ...` dans la commande workflow.
- **Score de compatibilité** — pondéré : compétences 40 %, localisation/remote 25 %, expérience 20 %, salaire 15 %. Voir `matching.ts`.
- **Scraper mockée** — 30 offres couvrant tech, finance, marketing, santé. Premier lancement de l'app déclenche un scrape automatique si le DB est vide.
- **useListSaved** — prend un seul argument `options?` (pas de params séparé). Les autres hooks (useGetMatches) prennent `params?, options?`.

## Product

- **Feed** : offres classées par score de compatibilité avec pull-to-refresh et déclenchement auto du scrape
- **Découvrir** : recherche texte + filtres (CDI/CDD/Alternance/Freelance/Stage, remote)
- **Sauvegardés** : liste des offres bookmarkées
- **Profil** : résumé du profil + stats du marché (offres disponibles, top compétences)
- **Fiche offre** : score ring animé SVG, barres de détail (skills/location/experience/salary), bouton "Voir l'offre"
- **Onboarding** : wizard 5 étapes (identité, compétences avec suggestions, expérience+ville+remote, types de contrat, fourchette salariale)

## User preferences

_À compléter selon les retours utilisateur._

## Gotchas

- **DB vide au premier lancement** : le Feed déclenche un scrape automatique si matches = []. Attendre quelques secondes puis tirer vers le bas.
- **PORT=8080 en conflit** : port 8080 est utilisé par l'infrastructure Replit — ne pas utiliser ce port pour l'API server.
- **Libs** : après modification d'un package `lib/*`, relancer `pnpm run typecheck:libs` avant les checks des artifacts.

## Pointers

- Voir le skill `pnpm-workspace` pour la structure du monorepo, TypeScript et les détails des packages
