# Preuves de la CI

Ces preuves proviennent du [build Jenkins local n° 2](http://127.0.0.1:18080/job/souverainrecrut-Dev/2/), exécuté le 9 novembre 2026. Les sept artefacts ont été copiés après la publication du tag sur Docker Hub.

| Artefact | Contenu |
|---|---|
| [commit.txt](commit.txt) | SHA Git complet du code testé |
| [junit.xml](junit.xml) | Dix scénarios HTTP et leur résultat |
| [lcov.info](lcov.info) | Couverture par fichier TypeScript |
| [sonar.json](sonar.json) | Identifiant de l’analyse, conditions du Quality Gate et mesures du Backend |
| [trivy.json](trivy.json) | Vulnérabilités détectées dans l’image construite |
| [image-tag.txt](image-tag.txt) | Dépôt Docker Hub et tag publié |
| [image-digest.txt](image-digest.txt) | Empreinte immuable vérifiée dans le registre |

Un [essai local complémentaire](runtime-local.json) vérifie le commit, la migration et les réponses HTTP de l’image téléchargée par ce digest avec PostgreSQL 16.

Les captures montrent le [build Jenkins](jenkins-2-build.png), les [tests JUnit](jenkins-2-tests.png), le [Quality Gate sur le nouveau code](jenkins-2-sonar.png) et les [mesures globales](jenkins-2-sonar-global.png). Le [rapport final](../../documentation/rapport-final.md) explique les résultats.
