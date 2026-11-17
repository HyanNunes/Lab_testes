import chai, { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.3/index.js';
import { Httpx, Get } from 'https://jslib.k6.io/httpx/0.0.6/index.js';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.0.0/index.js';

chai.config.logFailures = true;

export let options = {
  thresholds: {
    // fail the test if any checks fail or any requests fail
    checks: ['rate == 1.00'],
    http_req_failed: ['rate == 0.00'],
  },
  vus: 1,
  iterations: 1,
};

let session = new Httpx({
  baseURL: __ENV.BASE_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

function validateAuthService(user) {
  describe('[Auth service] user registration', () => {
    let registration = session.post('/api/auth/register', JSON.stringify(user));

    user.created = registration.status === 201;
    expect(registration.status, 'registration status').to.equal(201);
    expect(registration).to.have.validJsonBody();
    expect(registration.json(), 'registered user').to.include.keys('id', 'name', 'email');
    expect(registration.json(), 'registered user').to.not.have.a.property('password');

    user.id = registration.json('id'); // caching ID for the future
  });

  describe('[Auth service] user authentication', () => {
    let login = session.post(
      '/api/auth/login',
      JSON.stringify({ email: user.email, password: user.password })
    );

    expect(login.status, 'login status').to.equal(200);
    expect(login).to.have.validJsonBody();
    expect(login.json('id'), 'logged-in user').to.equal(user.id);
  });
}

function retrieveAccountAndTasksInABatch(user) {
  describe('[Auth and Tasks services] fetch account and task list in a batch', () => {
    let responses = session.batch([new Get('/api/auth/me'), new Get('/api/tasks')]);

    expect(responses, 'responses').to.be.an('array').lengthOf(2);

    responses.forEach((response) => {
      expect(response.status, 'response status').to.equal(200);
      expect(response).to.have.validJsonBody();
    });

    expect(responses[0].json('email'), 'current user').to.equal(user.email);
    expect(responses[1].json(), 'initial task list').to.be.an('array').that.is.empty;
  });
}

function validateTaskLifecycle() {
  let taskId;

  describe('[Tasks service] create a new task', () => {
    let payload = {
      title: 'Tarefa criada pelo k6',
      description: 'Verificação da API de tarefas',
    };

    let creation = session.post('/api/tasks', JSON.stringify(payload));

    expect(creation.status, 'task creation status').to.equal(201);
    expect(creation).to.have.validJsonBody();
    expect(creation.json(), 'created task').to.include.keys('id', 'title', 'completed', 'userId');
    expect(creation.json('completed'), 'initial completion state').to.equal(false);

    taskId = creation.json('id'); // caching ID for the future
  });

  describe('[Tasks service] fetch the task list', () => {
    let response = session.get('/api/tasks');

    expect(response.status, 'response status').to.equal(200);
    expect(response).to.have.validJsonBody();
    expect(response.json().map((task) => task.id), 'task list').to.include(taskId);
  });

  describe('[Tasks service] complete the task', () => {
    let update = session.patch(`/api/tasks/${taskId}`, JSON.stringify({ completed: true }));

    expect(update.status, 'task update status').to.equal(200);
    expect(update).to.have.validJsonBody();
    expect(update.json('completed'), 'updated completion state').to.equal(true);
  });

  describe('[Tasks service] delete the task', () => {
    let deletion = session.delete(`/api/tasks/${taskId}`);
    expect(deletion.status, 'task deletion status').to.equal(204);

    let finalList = session.get('/api/tasks');
    expect(finalList.status, 'final task list status').to.equal(200);
    expect(finalList).to.have.validJsonBody();
    expect(finalList.json(), 'final task list').to.be.an('array').that.is.empty;
  });
}

function cleanupAccount() {
  describe('[Auth service] delete the test account', () => {
    let cleanup = session.delete('/api/auth/account');
    expect(cleanup.status, 'account cleanup status').to.equal(204);
  });
}

export default function testSuite() {
  let user = {
    name: 'K6 API test',
    email: `k6-${randomString(10).toLowerCase()}-${__VU}-${__ITER}@example.com`,
    password: randomString(8),
    created: false,
  };

  try {
    validateAuthService(user);
    retrieveAccountAndTasksInABatch(user);
    validateTaskLifecycle();
  } finally {
    // runs even if an assertion above fails, so the test user never stays in the database
    if (user.created) {
      cleanupAccount();
    }
  }
}