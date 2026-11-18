const express = require('express');
const { authenticateUser, registerUser, prisma } = require('../auth');
const {
    clearSessionCookie,
    createSession,
    getSessionToken,
    invalidateSession,
    invalidateUserSessions,
    requireAuthentication
} = require('../session');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body || {};
    try {
        const user = await registerUser(name, email, password);
        createSession(user, res);
        return res.status(201).json(user);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
        }
        if (error.message && (
            error.message.startsWith('Informe um nome') ||
            error.message.startsWith('Informe um e-mail') ||
            error.message.startsWith('A senha deve')
        )) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Erro ao registrar usuário:', error);
        return res.status(500).json({ error: 'Não foi possível criar a conta.' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    try {
        const user = await authenticateUser(email, password);
        createSession(user, res);
        return res.status(200).json(user);
    } catch (error) {
        if (error.message === 'Credenciais inválidas.') {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }
        console.error('Erro ao autenticar usuário:', error);
        return res.status(500).json({ error: 'Não foi possível entrar na conta.' });
    }
});

router.get('/me', requireAuthentication, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, name: true, email: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'Não autenticado.' });
        }
        return res.status(200).json(user);
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        return res.status(500).json({ error: 'Não foi possível carregar a conta.' });
    }
});

router.post('/logout', (req, res) => {
    invalidateSession(getSessionToken(req));
    clearSessionCookie(res);
    return res.status(204).end();
});

router.delete('/account', requireAuthentication, async (req, res) => {
    try {
        const result = await prisma.user.deleteMany({
            where: { id: req.userId }
        });
        invalidateUserSessions(req.userId);
        clearSessionCookie(res);
        if (result.count === 0) {
            return res.status(401).json({ error: 'Não autenticado.' });
        }
        return res.status(204).end();
    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        return res.status(500).json({ error: 'Não foi possível excluir a conta.' });
    }
});

module.exports = router;
