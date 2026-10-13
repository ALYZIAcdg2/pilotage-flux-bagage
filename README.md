# PILOTAGE FLUX BAGAGE

Application Cloudflare Workers + D1 **indépendante** du dépôt `compte-rendu-pilotage`.

## État

Code frontend V18.1 et backend copié dans ce dépôt. **Non déployé.** Aucune base D1 créée, aucune donnée migrée. La configuration D1 est volontairement désactivée tant que le nouvel identifiant de base n'est pas connu.

## Mise en service (après vérification)

1. Créer les bases D1 `pilotage-flux-bagage-db` et `pilotage-flux-bagage-test-db` dans Cloudflare.
2. Renseigner le `database_id` de la base de production dans `wrangler.toml` et ajouter la configuration de test distincte.
3. Appliquer `migrations/0001_init.sql` sur les nouvelles bases uniquement.
4. Vérifier le Worker et les pages /flux-bags.html et /flux-bags-import.html.
5. Tester import, export, conflits, KPI et mobile avant de rendre le Worker public.
6. Migrer les données existantes uniquement après sauvegarde et validation explicite.

**Attention :** l'API actuelle ne possède pas encore de contrôle d'accès et permet des écritures. Ne pas exposer publiquement en production avant ajout d'une authentification et des protections d'écriture. L'import XLSX nécessite également une validation de bout en bout et la correction du mois fixé à septembre 2026.
