const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const bcrypt = require('bcrypt');
const { authenticateUser, prisma, registerUser } = require('../auth');

let userId;

test.after(async () => {
    try {
        if (userId) {
            await prisma.user.deleteMany({ where: { id: userId } });
        }
    } finally {
        await prisma.$disconnect();
    }
});

test('cadastra usuário com hash bcrypt e autentica credenciais', async () => {
    const email = `audit-${crypto.randomUUID()}@example.com`;
    const password = 'SuperSecretPass123!';
    const user = await registerUser('Usuário de teste', email, password);
    userId = user.id;

    assert.equal(user.email, email);
    assert.equal(Object.hasOwn(user, 'password'), false);

    const storedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert.match(storedUser.password, /^\$2[aby]\$10\$/);
    assert.equal(storedUser.password.length, 60);
    assert.notEqual(storedUser.password, password);
    assert.equal(await bcrypt.compare(password, storedUser.password), true);

    const authenticatedUser = await authenticateUser(email, password);
    assert.equal(authenticatedUser.id, user.id);
    assert.equal(Object.hasOwn(authenticatedUser, 'password'), false);
    await assert.rejects(
        authenticateUser(email, 'senha-incorreta'),
        { message: 'Credenciais inválidas.' }
    );
});
