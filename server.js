const crypto = require('crypto');
const path = require('path');
const express = require('express');
const { authenticateUser, registerUser, prisma } = require('./auth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_DURATION = 12 * 60 * 60 * 1000;
const sessions = new Map();
const cookieName = 'task_session';

app.use(express.json({ limit: '20kb' }));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

function getSessionToken(req) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([a-f0-9]{64})(?:;|$)`));
    return match ? match[1] : null;
}

function setSessionCookie(res, token) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader(
        'Set-Cookie',
        `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION / 1000}${secure}`
    );
}

function clearSessionCookie(res) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

function requireAuthentication(req, res, next) {
    const token = getSessionToken(req);
    const session = token && sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        if (token) {
            sessions.delete(token);
        }
        return res.status(401).json({ error: 'Não autenticado.' });
    }

    req.userId = session.userId;
    next();
}

function createSession(user, res) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_DURATION });
    setSessionCookie(res, token);
}

function reportServerError(message, error) {
    console.error(message, error);
}

app.post('/api/auth/register', async (req, res) => {
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
        reportServerError('Erro ao registrar usuário:', error);
        return res.status(500).json({ error: 'Não foi possível criar a conta.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    try {
        const user = await authenticateUser(email, password);
        createSession(user, res);
        return res.status(200).json(user);
    } catch (error) {
        if (error.message === 'Credenciais inválidas.') {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }
        reportServerError('Erro ao autenticar usuário:', error);
        return res.status(500).json({ error: 'Não foi possível entrar na conta.' });
    }
});

app.get('/api/auth/me', requireAuthentication, async (req, res) => {
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
        reportServerError('Erro ao carregar usuário:', error);
        return res.status(500).json({ error: 'Não foi possível carregar a conta.' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    for (const [token, session] of sessions) {
        if (session.userId === req.userId) {
            sessions.delete(token);
        }
    }
    clearSessionCookie(res);
    return res.status(204).end();
});

app.delete('/api/auth/account', requireAuthentication, async (req, res) => {
    try {
        const result = await prisma.user.deleteMany({
            where: { id: req.userId }
        });
        const token = getSessionToken(req);
        if (token) {
            sessions.delete(token);
        }
        clearSessionCookie(res);
        if (result.count === 0) {
            return res.status(401).json({ error: 'Não autenticado.' });
        }
        return res.status(204).end();
    } catch (error) {
        reportServerError('Erro ao excluir conta:', error);
        return res.status(500).json({ error: 'Não foi possível excluir a conta.' });
    }
});

app.get('/api/tasks', requireAuthentication, async (req, res) => {
    try {
        const tasks = await prisma.task.findMany({
            where: { userId: req.userId },
            orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }]
        });
        return res.status(200).json(tasks);
    } catch (error) {
        reportServerError('Erro ao buscar tarefas:', error);
        return res.status(500).json({ error: 'Não foi possível buscar as tarefas.' });
    }
});

app.post('/api/tasks', requireAuthentication, async (req, res) => {
    const { title, description } = req.body || {};
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
        return res.status(400).json({ error: 'O título deve ter entre 1 e 120 caracteres.' });
    }
    if (description != null && (typeof description !== 'string' || description.length > 1000)) {
        return res.status(400).json({ error: 'A descrição deve ter até 1000 caracteres.' });
    }

    try {
        const task = await prisma.task.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() || null : null,
                userId: req.userId
            }
        });
        return res.status(201).json(task);
    } catch (error) {
        reportServerError('Erro ao criar tarefa:', error);
        return res.status(500).json({ error: 'Não foi possível criar a tarefa.' });
    }
});

app.patch('/api/tasks/:id', requireAuthentication, async (req, res) => {
    const { completed } = req.body || {};
    if (typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'Informe se a tarefa foi concluída.' });
    }

    try {
        const result = await prisma.task.updateMany({
            where: { id: req.params.id, userId: req.userId },
            data: { completed }
        });
        if (result.count === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }
        const task = await prisma.task.findFirst({
            where: { id: req.params.id, userId: req.userId }
        });
        return res.status(200).json(task);
    } catch (error) {
        reportServerError('Erro ao atualizar tarefa:', error);
        return res.status(500).json({ error: 'Não foi possível atualizar a tarefa.' });
    }
});

app.delete('/api/tasks/:id', requireAuthentication, async (req, res) => {
    try {
        const result = await prisma.task.deleteMany({
            where: { id: req.params.id, userId: req.userId }
        });
        if (result.count === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }
        return res.status(204).end();
    } catch (error) {
        reportServerError('Erro ao excluir tarefa:', error);
        return res.status(500).json({ error: 'Não foi possível excluir a tarefa.' });
    }
});

const server = app.listen(PORT, () => {
    console.log(`Servidor disponível em http://localhost:${PORT}`);
});

async function shutdown() {
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
