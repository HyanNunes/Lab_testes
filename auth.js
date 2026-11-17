require('./load-env');

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function registerUser(name, email, plainPassword) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
        throw new Error('Informe um nome com até 80 caracteres.');
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new Error('Informe um e-mail válido.');
    }
    if (typeof plainPassword !== 'string' || plainPassword.length < 8) {
        throw new Error('A senha deve ter no mínimo 8 caracteres.');
    }

    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const user = await prisma.user.create({
        data: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword
        }
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

async function authenticateUser(email, plainPassword) {
    if (typeof email !== 'string' || typeof plainPassword !== 'string') {
        throw new Error('Credenciais inválidas.');
    }

    const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() }
    });
    if (!user || !(await bcrypt.compare(plainPassword, user.password))) {
        throw new Error('Credenciais inválidas.');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

module.exports = { registerUser, authenticateUser, prisma };
