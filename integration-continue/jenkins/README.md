# Exécuter la CI du jour 1 en local

Depuis la racine du dépôt, avec PowerShell et Docker Desktop en mode conteneurs Linux, lancer :

```powershell
./integration-continue/jenkins/start.ps1
```

Le premier démarrage télécharge les images et les plugins. Les suivants réutilisent les volumes. La pile réserve les ports locaux 18080 et 19000. Le moteur Docker-in-Docker (DinD) utilise un conteneur privilégié dédié et des certificats TLS. Ses images, ses conteneurs et les ports éphémères des tests restent dans la pile CI.

1. Ouvrir [Jenkins local](http://127.0.0.1:18080/), avec l’utilisateur `tp-admin`. Le script génère son mot de passe dans `.state/jenkins_password`, à côté de ce guide.
2. Depuis la racine, exécuter `./integration-continue/jenkins/Set-DockerHubCredential.ps1 -Username brextiar` avec le nom du compte Docker Hub cible. Saisir un jeton personnel **Read & Write** dans l’invite masquée. Cette commande crée ou remplace le credential Jenkins `dockerhub`. L’interface **Administrer Jenkins → Credentials** permet également de le gérer comme **Username with password**.
3. Ouvrir [le job souverainrecrut-Dev](http://127.0.0.1:18080/job/souverainrecrut-Dev/), puis lancer **Build Now** ou **Build with Parameters**. Jenkins lit `integration-continue/Jenkinsfile` sur la branche `Dev` du dépôt GitHub. Consulter **Console Output** et les artefacts du build pour retrouver les résultats.
4. Ouvrir [le projet SonarQube local](http://127.0.0.1:19000/dashboard?id=souverainrecrut-backend). L’utilisateur est `admin` et le mot de passe généré se trouve dans `.state/sonar_password`. Le projet utilise une copie de **Sonar way** complétée par une couverture globale d’au moins **80 %**. Jenkins interroge SonarQube pour obtenir le verdict de l’analyse du build.

Les mots de passe et le jeton d’analyse spécifique au projet sont exclus de Git. Le fichier de configuration Jenkins indique le dépôt et le nom du job. Réserver ce contrôleur local à la branche de confiance du TP, car celle-ci exécute ses scripts directement sur le contrôleur.

Pour arrêter les services en conservant la configuration, les rapports et les images :

```powershell
docker compose -f integration-continue/jenkins/compose.yaml down
```

La base H2 intégrée à SonarQube convient à l’évaluation locale. La pile s’utilise sans serveur externe. Une connexion Internet est nécessaire pour GitHub, les dépendances, les images, les plugins et les bases de vulnérabilités. [Jenkins dans Docker](https://www.jenkins.io/doc/book/installing/docker/) · [Jetons SonarQube](https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens)
