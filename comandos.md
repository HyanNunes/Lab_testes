## The web dashboard is a built-in feature of k6. You can enable it by setting the K6_WEB_DASHBOARD environment variable to true when running your test script, for example:

($env:K6_WEB_DASHBOARD="true"; k6 run estresse.js)

## Comando para usar outro navegador além do chrome

($env:K6_BROWSER_EXECUTABLE_PATH="C:\Program Files\Local\Do\Executavel"; k6 run E2E.js)

($env:K6_BROWSER_EXECUTABLE_PATH = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"; $env:K6_BROWSER_HEADLESS = "false"; k6 run e2e_lento.js)

## Execução das Migrations  e Inspeção

npx prisma migrate dev

npx prisma studio


## ver o teste sendo executado no navegador

($env:K6_BROWSER_HEADLESS="false"; $env:K6_BROWSER_EXECUTABLE_PATH="C:\Program Files\Local\Do\Executavel"; 
k6 run E2E.js)

npm start