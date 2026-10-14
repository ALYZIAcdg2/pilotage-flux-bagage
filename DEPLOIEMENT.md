# Circuit de déploiement — Pilotage Flux Bagage

## Flux validé
1. Développer et committer sur `feature/render-static-test`.
2. Render TEST (`pilotage-flux-bagage.onrender.com`) suit cette branche, `Auto-Deploy: On Commit`, démarrage `node render-test-server.mjs`. Son API pointe exclusivement vers Cloudflare TEST et sa D1 TEST.
3. Tester les écrans, l'ajout de dossiers et la conservation des données.
4. Après validation explicite, ouvrir une Pull Request vers `main`, contrôler les différences, puis fusionner.
5. Cloudflare PROD suit `main` (vérifier Auto Deploy dans Cloudflare).
6. Un **second service Render PROD**, à créer dans Render avec une URL différente, doit suivre `main`, avec `Auto-Deploy: On Commit`, Build Command `echo "No build required"` et Start Command `node render-prod-server.mjs`. Il transmet les API vers Cloudflare PROD / D1 PROD sans copier les données.

## Protection des données
- Aucune migration, suppression, ni changement de schéma D1 dans cette configuration.
- Le serveur Render TEST cible uniquement Cloudflare TEST.
- Le serveur Render PROD cible uniquement Cloudflare PROD.
- Ne pas changer la branche du service Render TEST vers `main`.
- Ne pas publier le service Render PROD sous l'URL du TEST avant validation.
- Attention : Render PROD relaie les écritures API vers D1 PROD. Prévoir une protection d'accès avant un usage externe sensible.

## Point de contrôle
- Vérifier le commit SHA réellement déployé sur chacun des hébergeurs.
- Si Render ne déclenche pas automatiquement, contrôler la connexion GitHub App et l'historique Deploys. Un redémarrage ne télécharge pas les nouveaux commits.
- Ne pas fusionner une branche TEST non validée.
