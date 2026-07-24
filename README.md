# DHA · Dashboard catalogue

Interface interne pour gérer les articles du catalogue (ajout, modification,
photos) — mono-tenant pour l'instant, protégée par un mot de passe unique.

## Installation locale

```bash
npm install
cp .env.local.example .env.local
```

Remplissez `.env.local` avec vos vraies valeurs :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role secret |
| `DASHBOARD_PASSWORD` | Choisissez un mot de passe fort |
| `SESSION_SECRET` | Générez avec `openssl rand -base64 32` |
| `NEXT_PUBLIC_STORAGE_BUCKET` | `phone` (déjà créé, public) |
| `DASHBOARD_CLIENT_ID` | `select id from clients;` dans Supabase SQL Editor |

```bash
npm run dev
```

Ouvrez `http://localhost:3000` — vous serez redirigé vers `/login`.

## Déploiement sur Vercel

1. Poussez ce dossier dans un repo Git (GitHub/GitLab).
2. Sur vercel.com → New Project → importez le repo.
3. Dans **Settings → Environment Variables**, ajoutez les 6 variables
   ci-dessus (les mêmes que dans `.env.local`, jamais commitées).
4. Déployez.

⚠️ **Ne jamais** committer `.env.local` (déjà exclu par `.gitignore`) ni coller
la clé `service_role` ailleurs que dans les variables d'environnement Vercel.

## Ce que fait le dashboard

- **Login** : mot de passe unique → cookie de session signé (7 jours), protégé
  par `src/proxy.ts` (Next.js 16 : remplace l'ancien `middleware.ts`).
- **Liste des articles** : lecture directe de `catalogue_articles` (filtré par
  `DASHBOARD_CLIENT_ID`), avec indicateur visuel de stock (vert/orange/rouge).
- **Créer / modifier un article** : `nom`, `catégorie`, `marque`, `couleur`,
  `prix`, `devise`, `stock`, `description`, `actif`.
- **Photos** : upload vers le bucket Storage `phone`, stockage de l'URL
  publique dans la colonne `images` (tableau ; la première entrée = image
  principale, utilisée plus tard pour le catalogue Meta WhatsApp).
- **Désactivation** : les articles ne sont jamais supprimés en dur (pour ne
  pas casser l'historique des commandes existantes) — on bascule `actif =
  false`, ce qui les retire du bot immédiatement.

## Sécurité

- La clé `service_role` n'est utilisée que côté serveur (Server Actions,
  fichiers marqués `import "server-only"`), jamais envoyée au navigateur.
- Toutes les écritures re-vérifient `client_id` côté serveur (l'utilisateur
  du dashboard ne peut pas modifier les articles d'un autre tenant, même si
  le dashboard est mono-tenant aujourd'hui — la protection est déjà là pour
  plus tard).
- Limitation anti-bruteforce basique sur `/api/auth/login` (5 tentatives /
  15 min par IP). À remplacer par une solution persistante (Vercel KV, etc.)
  si le dashboard est exposé publiquement à grande échelle.

## Prochaines étapes suggérées

- Une fois de vraies photos en place pour tous les articles actifs, mettre en
  place la synchronisation vers un Meta Commerce Catalog (nécessite un compte
  Meta Business Manager, pas encore créé) pour activer le Multi-Product
  Message WhatsApp dans le bot.
- Ajouter une page de gestion des FAQ si besoin plus tard.
