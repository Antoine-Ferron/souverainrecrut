# Architecture de l’intégration continue

```text
GitHub · Antoine-Ferron/souverainrecrut · Dev
  │  lecture par Jenkins
  ▼
Jenkins ── npm ci → Prisma → build TypeScript → tests HTTP
  │                                               │
  │                                      PostgreSQL 16 éphémère
  │                                               │
  ├── JUnit et LCOV ◄─────────────────────────────┘
  │
  ├── SonarScanner → SonarQube → webhook → Quality Gate
  │
  └── Docker build → analyse Trivy → Docker Hub
                                      brextiar/souverainrecrut-backend:git-<SHA>
```

Le Backend et ses migrations restent dans `backend/`. Jenkins lit la définition du job dans `integration-continue/Jenkinsfile`. Le moteur Docker dédié construit l’image et fournit un PostgreSQL neuf aux tests. Ce moteur communique avec Jenkins par TLS. Jenkins et SonarQube sont accessibles sur l’interface de boucle locale du poste.

La couverture LCOV alimente SonarQube. Un webhook rend le résultat du Quality Gate au build qui a soumis l’analyse. Trivy inspecte ensuite une archive de l’image locale. Jenkins pousse cette même image sur le registre et conserve son digest avec les rapports. Une seule exécution du job travaille à la fois.
