# Mutatech CRM — Clients, Devis, Factures

Mini-app Next.js : gestion des clients Mutatech, génération de devis avec
sauvegarde automatique sur Google Drive, et facturation avec envoi par
Gmail — connectée au backend FastAPI (`mutatech-backend`).

## Installation locale

```bash
npm install
cp .env.local.example .env.local   # renseigne NEXT_PUBLIC_API_URL, TOTP_SECRET, ACCESS_TOKEN
npm run dev
```

## Déploiement via GitHub + Netlify

Même procédure que les autres sites Mutatech :

```bash
git init
git add .
git commit -m "Initial commit — Mutatech CRM"
git branch -M main
git remote add origin https://github.com/<ton-compte>/mutatech-crm-frontend.git
git push -u origin main
```

Puis sur [app.netlify.com](https://app.netlify.com) : **Add new site** →
**Import an existing project** → ce repo. Build command : `npm run build`.

## Variables d'environnement (Netlify)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL du backend Railway (ex: `https://mutatech-orchestrator-backend-production.up.railway.app`) |
| `TOTP_SECRET` | Le même secret base32 que les autres outils Mutatech |
| `ACCESS_TOKEN` | Une longue chaîne aléatoire propre à ce site |

**Sur Railway**, une fois ce site déployé, ajoute aussi :
| Variable | Description |
|---|---|
| `FRONTEND_CRM_URL` | L'URL Netlify de ce site (pour la redirection après connexion Google) |

## Fonctionnement

1. **Clients** (`app/clients`) : CRUD simple (nom, secteur, email, téléphone, adresse, SIRET, notes).
2. **Devis** (`app/devis`) : sélection client + lignes de prestation dynamiques →
   le backend génère le PDF et l'envoie automatiquement sur Drive si Google
   est connecté (sinon créé sans copie Drive, pas bloquant).
3. **Factures** (`app/factures`) : création depuis un devis existant (lignes
   reprises automatiquement) ou de zéro, puis bouton **"Envoyer par email"**
   qui génère le PDF et l'envoie via Gmail au client (nécessite que le client
   ait une adresse email et que Google soit connecté).
4. **Connexion Google** : bouton dans la barre de nav si non connecté —
   redirige vers `/api/auth/google/login` côté backend (flux OAuth complet,
   refresh_token stocké en base, aucune reconnexion nécessaire ensuite).
