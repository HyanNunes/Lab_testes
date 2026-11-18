const path = require('path');
const express = require('express');
const { prisma } = require('./auth');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20kb' }));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

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
