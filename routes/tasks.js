const express = require('express');
const { prisma } = require('../auth');
const { requireAuthentication } = require('../session');

const router = express.Router();

router.use(requireAuthentication);

router.get('/', async (req, res) => {
    try {
        const tasks = await prisma.task.findMany({
            where: { userId: req.userId },
            orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }]
        });
        return res.status(200).json(tasks);
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
        return res.status(500).json({ error: 'Não foi possível buscar as tarefas.' });
    }
});

router.post('/', async (req, res) => {
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
        console.error('Erro ao criar tarefa:', error);
        return res.status(500).json({ error: 'Não foi possível criar a tarefa.' });
    }
});

router.patch('/:id', async (req, res) => {
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
        console.error('Erro ao atualizar tarefa:', error);
        return res.status(500).json({ error: 'Não foi possível atualizar a tarefa.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await prisma.task.deleteMany({
            where: { id: req.params.id, userId: req.userId }
        });
        if (result.count === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }
        return res.status(204).end();
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        return res.status(500).json({ error: 'Não foi possível excluir a tarefa.' });
    }
});

module.exports = router;
