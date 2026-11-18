import chai, { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.3/index.js';
import { Httpx } from 'https://jslib.k6.io/httpx/0.0.6/index.js';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.0.0/index.js';

chai.config.logFailures = true;

const TEST_EMAIL = __ENV.TEST_USER_EMAIL || 'admin@exemplo.com';
const TEST_PASSWORD = __ENV.TEST_USER_PASSWORD || 'adminadmin';

export const options = {
    thresholds: {
        checks: ['rate==1.0'],
    },
}

const session = new Httpx({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

function validateAuthService() {
  describe('[Auth service] Autenticação do usuário', () => {
    const authData = {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    };

    const resp = session.post('/api/auth/login', JSON.stringify(authData));

    expect(resp.status, 'status do login').to.be.within(200, 204);
    expect(resp).to.have.validJsonBody();

    const body = resp.json();
    if (body && body.token) {
      session.addHeader('Authorization', `Bearer ${body.token}`);
    }
  });
}

function validateTaskLifecycle() {
  const tituloTarefa = `Tarefa K6 ${randomString(6)}`;
  const descricaoTarefa = 'Criada automaticamente pelo teste de integração.';
  let taskId;

  describe('[Tasks service] Criar uma nova tarefa', () => {
    const payload = {
      title: tituloTarefa,
      description: descricaoTarefa,
    };

    
    const resp = session.post('/api/tasks', JSON.stringify(payload));

    expect(resp.status, 'status da criação').to.equal(201);
    expect(resp).to.have.validJsonBody();
    expect(resp.json(), 'objeto da tarefa').to.include.keys('id', 'title');

    taskId = resp.json('id');
  });

  describe('[Tasks service] Listar tarefas do usuário', () => {
    const resp = session.get('/api/tasks');

    expect(resp.status, 'status da listagem').to.equal(200);
    expect(resp).to.have.validJsonBody();

    const lista = Array.isArray(resp.json()) ? resp.json() : resp.json('tasks');
    expect(lista, 'lista de tarefas').to.be.an('array').and.not.be.empty;
  });

  describe('[Tasks service] Excluir tarefa de teste', () => {
    const resp = session.delete(`/api/tasks/${taskId}`);

    expect(resp.status, 'status da exclusão').to.be.within(200, 204);
  });
}

export default function testSuite() {
  validateAuthService();
  validateTaskLifecycle();
}