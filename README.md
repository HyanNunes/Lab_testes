# Gerenciador de tarefas

Aplicação de página única para cadastro de usuários e gerenciamento de tarefas, com Express, Prisma e SQLite.

## Requisitos

- Node.js 18 ou superior
- npm
- k6 para executar os testes de carga e de navegador

## Configuração

```powershell
npm install
Copy-Item .env.example .env
npx prisma migrate deploy
npm start
```

Abra <http://localhost:3000>. O banco SQLite local é criado a partir das migrações do Prisma e não deve ser enviado ao repositório.

## Testes

### Testes automatizados de autenticação e CRUD

```powershell
npm test
```

Esses testes usam o banco configurado em `.env`. Eles criam e removem os próprios dados de teste.

### Teste E2E do navegador

Com o servidor em execução, crie uma conta de teste pela aplicação e informe as credenciais no ambiente. Não use credenciais de produção:

```powershell
$env:TEST_USER_EMAIL = "conta-de-teste@example.com"
$env:TEST_USER_PASSWORD = "senha-da-conta-de-teste"
k6 run -e "TEST_USER_EMAIL=$env:TEST_USER_EMAIL" -e "TEST_USER_PASSWORD=$env:TEST_USER_PASSWORD" testes/E2E.js
```

O teste verifica o login e a tela de tarefas usando o navegador Chromium do k6.

### Testes de carga e estresse

Com o servidor em execução, rode cada cenário separadamente:

```powershell
k6 run testes/carga.js
k6 run testes/estresse.js
```

`carga.js` simula carga moderada e verifica limites de erro e latência. `estresse.js` aumenta o número de usuários virtuais para observar o comportamento sob maior carga.
