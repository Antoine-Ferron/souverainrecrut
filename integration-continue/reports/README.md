# Preuves de la CI

Jenkins conserve les rapports par numéro de build. `commit.txt` identifie la révision testée, `junit.xml` les résultats HTTP, `lcov.info` la couverture par fichier et `sonar.json` le Quality Gate et les mesures. `trivy.json` contient les vulnérabilités relevées dans l’image. Après publication, `image-tag.txt` et `image-digest.txt` identifient la version sur Docker Hub.
