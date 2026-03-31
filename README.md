# Site Curriculo 2.0

Portfolio pessoal com frontend estatico e backend Node.js + MongoDB.

## Visao geral

Este projeto foi separado em duas partes:

- `frontend/`: site publico e painel admin (`admin.html`)
- `backend/`: API REST com autenticacao JWT, CRUD de projetos e sync com GitHub

## Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express, Mongoose, JWT, CORS
- Banco: MongoDB Atlas
- Deploy: Vercel (frontend e backend em projetos separados)

## Estrutura

```text
site-curriculo/
  backend/
    index.js
    models/Projeto.js
    package.json
  frontend/
    index.html
    admin.html
    script.js
    admin.js
    config.js
    style.css
  README.md
```

## Requisitos

- Node.js 18+
- Conta no MongoDB Atlas
- Conta no Vercel
- Conta no GitHub

## Como rodar local

### 1) Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` em `backend/` (ou copie de `.env.example`) com:

```env
PORT=3000
MONGODB_URI=seu_mongodb_uri
GITHUB_USERNAME=seu_usuario
GITHUB_TOKEN=token_opcional
ADMIN_USERNAME=admin
ADMIN_PASSWORD=senha_forte
JWT_SECRET=jwt_secret_forte
FRONTEND_URL=http://localhost:5500
```

Inicie a API:

```bash
npm start
```

API local: `http://localhost:3000`

### 2) Frontend

Abra `frontend/index.html` com Live Server (porta 5500) ou outro servidor estatico.

## Configuracao de producao

### Frontend (Vercel)

- Root Directory: `frontend`
- Build Command: vazio
- Output Directory: vazio

### Backend (Vercel)

- Root Directory: `backend`
- Env vars obrigatorias:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `FRONTEND_URL`
- Env vars opcionais:
  - `GITHUB_USERNAME`
  - `GITHUB_TOKEN`

### Dominio atual

- Frontend: `https://andreluigidev.vercel.app`
- Backend: `https://site-curriculo-api.vercel.app`

## Fluxo de manutencao

### Alterar texto fixo do site (ex.: Sobre)

Edite `frontend/index.html`, commit e push.

### Gerenciar projetos no admin

1. Acesse `https://andreluigidev.vercel.app/admin.html`
2. Faça login com usuario/senha admin (configurados no Vercel da API)
3. Crie/edite/remova projetos

## Endpoints principais

- `GET /projetos`
- `POST /projetos` (admin)
- `PUT /projetos/:id` (admin)
- `DELETE /projetos/:id` (admin)
- `POST /admin/login`
- `GET /admin/validate`
- `POST /sync-github` (admin)

Base URL producao: `https://site-curriculo-api.vercel.app`

## Seguranca (recomendado)

- Nunca versionar `.env`
- Usar senhas fortes para admin e MongoDB
- Trocar credenciais que foram expostas durante configuracao
- Manter `FRONTEND_URL` restrito ao dominio real do frontend

## Licenca

Projeto de uso pessoal (portfolio).
