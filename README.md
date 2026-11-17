# Gerenciador de tarefas

Aplicação de página única para cadastro de usuários e gerenciamento de tarefas, com Express, Prisma e SQLite.

## Requisitos

- Node.js 18 ou superior
- npm

## Configuração

```powershell
npm install
Copy-Item .env.example .env
npx prisma migrate deploy
npm start
```

Abra <http://localhost:3000>. O banco SQLite local é criado a partir das migrações do Prisma e não deve ser enviado ao repositório.

## Testes

```powershell
npm test
```

Os testes de autenticação e operações CRUD usam o banco configurado em `.env`.
