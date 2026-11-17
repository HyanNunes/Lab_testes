const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { after, test } = require('node:test');
const { prisma } = require('../auth');

const baseUrl = 'http://localhost:3000';
const testUsers = [];

async function request(path, { method = 'GET', body, cookie } = {}) {
    return fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(cookie ? { Cookie: cookie } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
}

async function registerTestUser() {
    const email = `api-${crypto.randomUUID()}@example.com`;
    const password = 'api-test-password-123';
    const response = await request('/api/auth/register', {
        method: 'POST',
        body: { name: 'API test user', email, password }
    });
    assert.equal(response.status, 201);

    const user = await response.json();
    const cookie = response.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);
    testUsers.push(user.id);
    return { user, email, password, cookie };
}

after(async () => {
    try {
        if (testUsers.length > 0) {
            await prisma.user.deleteMany({ where: { id: { in: testUsers } } });
        }
    } finally {
        await prisma.$disconnect();
    }
});

test('logout invalida a sessão mesmo se o cookie antigo for reapresentado', async () => {
    const { cookie } = await registerTestUser();

    const logout = await request('/api/auth/logout', {
        method: 'POST',
        cookie
    });
    assert.equal(logout.status, 204);

    const currentUser = await request('/api/auth/me', { cookie });
    assert.equal(currentUser.status, 401);
});

test('excluir conta invalida todas as sessões do usuário', async () => {
    const { email, password, cookie: firstCookie } = await registerTestUser();
    const login = await request('/api/auth/login', {
        method: 'POST',
        body: { email, password }
    });
    assert.equal(login.status, 200);
    const secondCookie = login.headers.get('set-cookie')?.split(';')[0];
    assert.ok(secondCookie);

    const deletion = await request('/api/auth/account', {
        method: 'DELETE',
        cookie: firstCookie
    });
    assert.equal(deletion.status, 204);

    const createTask = await request('/api/tasks', {
        method: 'POST',
        cookie: secondCookie,
        body: { title: 'Tarefa após excluir conta' }
    });
    assert.equal(createTask.status, 401);
});
