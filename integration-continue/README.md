# CI du jour 1

À chaque changement détecté sur `Dev`, Jenkins teste l’API avec PostgreSQL, soumet la couverture à SonarQube, construit l’image Backend et la publie sur Docker Hub si les contrôles passent.

## Rejouer la chaîne

1. Cloner le [fork du TP](https://github.com/Antoine-Ferron/souverainrecrut/tree/Dev) puis se placer sur `Dev`. Sur le poste Windows du TP, démarrer Docker Desktop en mode conteneurs Linux.
2. Depuis la racine du dépôt, lancer `./integration-continue/jenkins/start.ps1` dans PowerShell. Suivre le [guide Jenkins](jenkins/README.md) pour renseigner le credential Docker Hub `dockerhub`. L’installation démarre Jenkins, SonarQube et le moteur Docker utilisé par le job.
3. Lancer le premier build du job **souverainrecrut-Dev**. Les suivants interrogent GitHub toutes les cinq minutes. Le job utilise le chemin `integration-continue/Jenkinsfile`.
4. Ouvrir la page du build. **Tests** affiche les assertions JUnit. **Artifacts** donne accès au LCOV, au résultat du Quality Gate, aux mesures SonarQube, au scan Trivy et aux références de l’image publiée. Les preuves du rendu se trouvent dans [reports/](reports/).

## Ce qui conditionne la publication

| Étape | Contrôle |
|---|---|
| Checkout | Le commit analysé doit correspondre à la branche distante `Dev` du fork. |
| Installation et compilation | Node.js 22, installation depuis le lockfile avec `npm ci`, génération du client Prisma, puis compilation TypeScript stricte. |
| Tests | Les migrations sont appliquées à une base PostgreSQL 16 vierge. Les requêtes HTTP passent par Express et Prisma. Un test en échec ou une couverture de lignes inférieure à 80 % arrête la CI. |
| SonarQube | Le scanner importe le LCOV et le Quality Gate doit renvoyer `OK`. Les règles Sonar way sont complétées par une condition de couverture globale à 80 % afin de contrôler aussi la première analyse. |
| Image | Le [Dockerfile](Dockerfile) utilise le contexte `backend/`, compile TypeScript, embarque les dépendances de production et les migrations, puis lance Node avec un compte sans privilèges. |
| Trivy | Le rapport JSON couvre les vulnérabilités détectées. Toute vulnérabilité `CRITICAL`, y compris sans correctif disponible, interdit le push. |
| Docker Hub | Jenkins utilise le credential `dockerhub` à l’étape de publication et archive le digest après le push. Le tag `git-<SHA complet>` désigne le commit analysé. |

## Rejouer uniquement les tests

Depuis la racine avec Node.js 22+, Docker et un shell POSIX (Git Bash sous Windows), installer et compiler le Backend, puis lancer le même script que Jenkins.

```sh
cd backend
npm ci
npm run prisma:generate
npm run build
cd ..
sh integration-continue/test-postgres.sh
```

Le script choisit un port libre, attend PostgreSQL, applique les migrations et supprime le conteneur à la fin. Les résultats locaux sont dans `backend/reports/junit.xml` et `backend/coverage/lcov.info`. Les schémas OpenAPI déclaratifs et les fichiers de types sont exclus du calcul de couverture. Pour examiner le détail du rendu, consulter le [rapport du jour 1](../documentation/rapport-final.md).

La CI crée ses propres comptes de test. Le seed de démonstration fourni pour un usage manuel réinitialise les données et demande la variable `SEED_RECRUITER_PASSWORD`.
