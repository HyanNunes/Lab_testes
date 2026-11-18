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

Para mostrar o navegador durante a execução, defina o modo headful:

```powershell
$env:K6_BROWSER_EXECUTABLE_PATH = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$env:K6_BROWSER_HEADLESS = "false"
k6 run -e "TEST_USER_EMAIL=$env:TEST_USER_EMAIL" -e "TEST_USER_PASSWORD=$env:TEST_USER_PASSWORD" testes/E2E.js
```

### Teste E2E completo

Com o servidor em execução e o Chrome ou Chromium instalado, rode:

```powershell
k6 run -e BASE_URL=http://localhost:3000 testes/E2E-completo.js
```

O teste cria um usuário exclusivo, cria uma tarefa, marca o check box, exclui a tarefa, faz logout, entra novamente e exclui a conta.

### Teste da API com k6

Com o servidor em execução, rode:

```powershell
k6 run testes/api-k6.js
```

O teste cria uma conta temporária, valida login e operações CRUD de tarefas e exclui a conta ao final. Para usar outro endereço local, defina `BASE_URL`, por exemplo `$env:BASE_URL = "http://localhost:3001"`.

### Testes de carga e estresse

Com o servidor em execução, rode cada cenário separadamente:

```powershell
k6 run testes/carga.js
k6 run testes/estresse.js
```

`carga.js` simula carga moderada e verifica limites de erro e latência. `estresse.js` aumenta o número de usuários virtuais para observar o comportamento sob maior carga.
