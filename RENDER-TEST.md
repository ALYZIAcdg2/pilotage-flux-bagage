# Render — essai Outlook (TEST uniquement)

Cette branche héberge l'interface sur Render et transmet les appels `/api/health`, `/api/data` et `/api/days` au Worker **Cloudflare TEST**. Aucune donnée de production n'est utilisée.

Dans Render : **New → Web Service**, connecter le dépôt GitHub `ALYZIAcdg2/pilotage-flux-bagage`, sélectionner la branche `feature/render-static-test`, Runtime **Node**, Build Command `echo "No build required"`, Start Command `node render-test-server.mjs`. Choisir l'offre gratuite si disponible.

Ouvrir l'URL `https://<nom>.onrender.com/`, tester l'ouverture de Nouveau dossier et la lecture des données de TEST, puis envoyer ce lien via Outlook pour voir s'il reste visible.

Ne pas utiliser cette adresse comme environnement de production. Les modifications de dossiers sur cette URL affectent **la base TEST**.
