# Karomy 💚

Le karaoké qui tient dans une poche. On ouvre une **room** sur la télé, les
invités **scannent le QR code** avec leur téléphone et remplissent la file
d'attente. Pas de compte, pas d'installation.

## Comment ça marche

| Vue | URL | Rôle |
| --- | --- | --- |
| Accueil | `/` | Ouvrir une room, ou en rejoindre une avec son code |
| Room | `/room/ABCD` | L'écran partagé : vidéo karaoké, QR code, code de room, file d'attente. **C'est lui qui pilote la lecture.** |
| Téléphone | `/j/ABCD` | Chercher une chanson, l'ajouter, réordonner la file |

Les paroles viennent des vidéos karaoké YouTube (elles sont incrustées dans
l'image) — rien à héberger.

Sur le téléphone, un sélecteur permet de choisir entre deux types de version :

- **Karaoké** — instrumental avec paroles à l'écran (par défaut)
- **Originale** — le clip d'origine, voix comprise, pour chanter par-dessus

Le choix est mémorisé dans le navigateur. YouTube ne sait pas vraiment exclure
un terme (`-karaoke` ne fait qu'atténuer), donc le tri se fait côté serveur dans
`netlify/functions/search.ts` : sans ça, une recherche « originale » remonte
surtout des reprises karaoké, qui dominent les résultats pour les chansons
connues.

## Stack

- **Vite + React + TypeScript**
- **Supabase** — Postgres + Realtime, pour que la file soit identique sur tous
  les écrans instantanément
- **Netlify** — hébergement statique + une fonction serverless qui proxifie la
  recherche YouTube
- **PWA** (`vite-plugin-pwa`) — installable depuis le navigateur

Pas de librairie d'UI ni d'icônes : la direction artistique « cozy Sims »
(pastel chaud, coins ronds, plumbob vert) tient dans un seul fichier
[`src/styles.css`](src/styles.css) et des SVG faits main.

---

## Installation

### 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (le plan gratuit
   suffit largement).
2. Ouvrez le **SQL Editor** et exécutez [`supabase/schema.sql`](supabase/schema.sql).
3. Dans **Project Settings → API**, récupérez l'URL du projet et la clé `anon`.

### 2. Variables d'environnement

```bash
cp .env.example .env
```

Puis renseignez :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. Lancer

```bash
npm install
npm run dev          # http://localhost:5173
```

### 4. Recherche YouTube (optionnel)

Sans clé API, tout fonctionne : l'app bascule automatiquement sur le mode
**« coller un lien YouTube »**. Pour activer la recherche par titre :

1. Sur [console.cloud.google.com](https://console.cloud.google.com), activez
   **YouTube Data API v3** et créez une clé API.
2. Ajoutez `YOUTUBE_API_KEY=...` à votre `.env` (⚠️ **sans** le préfixe `VITE_`
   — cette clé doit rester côté serveur).

`npm run dev` suffit : le plugin [`build/netlifyDev.ts`](build/netlifyDev.ts)
sert `/api/search` en local avec le même code qu'en production, pas besoin de la
CLI Netlify.

Le quota gratuit est de 10 000 unités/jour, soit ~100 recherches. La fonction
met les résultats en cache 10 minutes pour l'économiser.

---

## Déploiement sur Netlify

```bash
npx netlify deploy --prod
```

Ou connectez le dépôt depuis l'interface Netlify — [`netlify.toml`](netlify.toml)
contient déjà la commande de build, le dossier de publication et le fallback SPA.

Puis dans **Site settings → Environment variables**, ajoutez :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `YOUTUBE_API_KEY` (optionnel)

> Le QR code encode `window.location.origin` : une fois déployé, il pointe
> automatiquement vers votre domaine. Aucune configuration nécessaire.

---

## Raccourcis clavier (vue room)

| Touche | Action |
| --- | --- |
| `Espace` | Play / pause |
| `→` ou `N` | Chanson suivante |

---

## Notes de conception

**Le contrôle appartient à l'écran room.** Les téléphones ajoutent et
réordonnent, mais ne peuvent ni mettre en pause ni passer une chanson — sinon la
soirée devient vite ingérable. Chacun peut en revanche retirer *ses propres*
chansons de la file.

**Pas d'authentification.** Le pseudo est stocké en `localStorage`, et les
policies RLS ouvrent les tables à la clé `anon` : qui connaît le code d'une room
peut y écrire. C'est un choix assumé pour une app de soirée — les rooms sont
éphémères et ne contiennent aucune donnée personnelle. Pour un usage plus large,
il faudrait resserrer les policies (voir les commentaires dans
`supabase/schema.sql`).

**Codes de room à 4 caractères**, sans `I`, `O`, `0` ni `1` pour éviter les
confusions quand on les dicte à voix haute. En cas de collision, `createRoom()`
retente avec un nouveau code.

**Ordre de la file par `sort_order` flottant.** Déplacer une chanson réécrit sa
valeur à mi-chemin entre ses nouveaux voisins, sans renuméroter toute la liste —
deux téléphones peuvent trier en même temps sans se marcher dessus.

**Ménage.** Les rooms portent un `last_seen_at` rafraîchi toutes les 5 minutes
par les clients connectés. La fonction `purge_stale_rooms()` supprime celles
inactives depuis 24 h — branchez-la sur `pg_cron` pour l'automatiser.
