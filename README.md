# SouverainRecrut

## TP CI/CD · Jour 1

Le [guide d’intégration continue](integration-continue/README.md) décrit le job Jenkins de la branche `Dev`, les tests PostgreSQL, les contrôles SonarQube et Trivy et la publication de l’image Backend.

## Présentation

SouverainRecrut est une plateforme web de gestion des recrutements destinée aux entreprises.

Elle permet de :

- gérer les candidats ;
- publier des offres d'emploi ;
- suivre les candidatures ;
- centraliser le processus de recrutement.

Ce projet est utilisé comme **projet fil rouge** des cours  DevOps.

---

## Architecture

Le projet est composé de deux applications.

```
Frontend (React)
        │
        ▼
Backend (Express API)
        │
        ▼
PostgreSQL
```

---

## Stack technique

### Frontend

- React
- TypeScript
- Vite
- Axios
- Material UI

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL

### DevOps

- Git
- GitLab
- Docker
- GitLab CI/CD
- Terraform
- Ansible
- Nginx

---

## Arborescence

```
souverainrecrut/
│
├── backend/
├── frontend/
├── docs/
└── README.md
```

---

## Auteur

ALIMOU DIALLO
