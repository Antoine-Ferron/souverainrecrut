# Rapport du jour 1 · SouverainRecrut

## Vérification du Backend

Les dix scénarios d’intégration envoient des requêtes à Express et vérifient les réponses et leurs effets sur PostgreSQL. Ils exercent la connexion, les jetons invalides, la distinction administrateur/recruteur, le cycle de vie des candidats, des offres et des candidatures, la validation des saisies et l’état de la base.

La vérification des routes administrateur a mis en évidence deux défauts. Prisma masque désormais le champ `password` dans les réponses et le service hache tout nouveau mot de passe lors de sa modification. Le test de régression vérifie que le nouveau mot de passe fonctionne, que l’ancien est rejeté et que l’API ne renvoie pas l’empreinte. Le seed de démonstration lit son mot de passe depuis l’environnement.

Une première exécution locale a donné **10 tests réussis sur 10**, **93,30 % de lignes**, **81,16 % de branches** et **96,09 % de fonctions** couvertes. L’audit des dépendances a conduit à mettre à niveau `proxy-addr` vers la version corrigée 2.0.8 avant la publication. [Avis de sécurité du mainteneur](https://github.com/advisories/GHSA-jqcg-44mw-7w3h)

Les [preuves du build Jenkins](../integration-continue/reports/) accompagnent le rendu. La [procédure de reproduction](../integration-continue/README.md) détaille les prérequis, l’ordre des contrôles et le seuil Trivy.
