# Rapport du jour 1 · SouverainRecrut

Le **build Jenkins n° 2** a terminé les sept contrôles et la publication le **9 novembre 2026**, en **2 min 28 s**, pour la révision [34debcd de la branche Dev](https://github.com/Antoine-Ferron/souverainrecrut/commit/34debcddf6b39f8b5e5d3466300f718ab7ba3d5f). Les preuves jointes correspondent à ce build.

| Contrôle | Résultat du build n° 2 |
|---|---|
| JUnit | 10 tests exécutés, 10 réussis, 0 ignoré |
| Quality Gate | `OK` · couverture globale 91,3 %, nouveau code 80,0 % |
| Duplication | 20,7 % au global, 0,0 % sur le nouveau code |
| Trivy | 0 critique, 2 élevées, 7 moyennes |
| Docker Hub | `brextiar/souverainrecrut-backend:git-34debcddf6b39f8b5e5d3466300f718ab7ba3d5f` |

Le digest retourné par Docker Hub correspond à celui archivé par Jenkins. [Référence immuable](../integration-continue/reports/image-digest.txt) · [Image sur Docker Hub](https://hub.docker.com/r/brextiar/souverainrecrut-backend/tags)

L’image a ensuite été téléchargée par son digest et démarrée sur le poste avec une base PostgreSQL 16 vierge. La migration Prisma `20260630124434_init` s’est appliquée. L’API a répondu HTTP 200 sur `/v1/health` et `/v1/ready`, avec les états `UP` et `READY / CONNECTED`. Le label OCI correspond au commit du build n° 2. [Résultat de l’essai local](../integration-continue/reports/runtime-local.json)

## Vérification du Backend

Les dix scénarios d’intégration envoient des requêtes à Express et vérifient les réponses et leurs effets sur PostgreSQL. Ils exercent la connexion, les jetons invalides, la distinction administrateur/recruteur, le cycle de vie des candidats, des offres et des candidatures, la validation des saisies et l’état de la base.

La vérification des routes administrateur a mis en évidence deux défauts. Prisma masque désormais le champ `password` dans les réponses et le service hache tout nouveau mot de passe lors de sa modification. Le test de régression vérifie que le nouveau mot de passe fonctionne, que l’ancien est rejeté et que l’API ne renvoie pas l’empreinte. Le seed de démonstration lit son mot de passe depuis l’environnement.

Une première exécution locale a donné **10 tests réussis sur 10**, **93,30 % de lignes**, **81,16 % de branches** et **96,09 % de fonctions** couvertes. L’audit des dépendances a conduit à mettre à niveau `proxy-addr` vers la version corrigée 2.0.8 avant la publication. [Avis de sécurité du mainteneur](https://github.com/advisories/GHSA-jqcg-44mw-7w3h)

## Lecture des résultats SonarQube

La première analyse a signalé la divulgation du nom du framework par l’en-tête HTTP `X-Powered-By` et deux usages de `parseInt` dans la pagination. L’API désactive maintenant cet en-tête et utilise `Number.parseInt`. Jenkins attend le résultat auprès de l’API SonarQube en donnant l’identifiant précis de son analyse. Cette configuration conserve la protection qui interdit les webhooks vers des adresses privées.

Après correction, le Quality Gate passe avec **91,3 % de couverture SonarQube** pour un minimum global de **80 %**, **0 bug**, **0 vulnérabilité**, **0 code smell** et **0 security hotspot**. Le pourcentage de SonarQube combine lignes et conditions, tandis que les 93,30 % de c8 mesurent les lignes. La duplication globale atteint **20,7 %**. Les quatre fichiers les plus concernés décrivent les routes OpenAPI des utilisateurs, candidats, offres et candidatures. La règle Sonar way sur la duplication porte sur le nouveau code. La documentation OpenAPI reste incluse dans la mesure globale de duplication.

## Lecture du scan de l’image

La mise à jour des dépendances transitives compatibles et de npm embarqué a réduit les alertes élevées de **26 à 2** lors des scans locaux. Les deux alertes restantes concernent `deepmerge-ts` et `effect`, dont les versions sont imposées par la chaîne de dépendances Prisma 6.16.2. Le seuil de publication est fixé à **zéro vulnérabilité critique**. Le code de retour de Trivy a été vérifié sur un même rapport avec des seuils de sévérité différents.

Les [preuves du build Jenkins](../integration-continue/reports/) accompagnent le rendu. La [procédure de reproduction](../integration-continue/README.md) détaille les prérequis, l’ordre des contrôles et le seuil Trivy.
