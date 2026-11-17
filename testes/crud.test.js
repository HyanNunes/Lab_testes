const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { prisma } = require('../auth');

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

test('executa operações CRUD e exclusão em cascata de tarefas', async () => {
    const user = await prisma.user.create({
        data: {
            name: 'Usuário de teste CRUD',
            email: `crud-${crypto.randomUUID()}@example.com`,
            password: 'hash-de-teste',
            tasks: {
                create: [
                    { title: 'Tarefa concluída', completed: true },
                    { title: 'Tarefa pendente', completed: false }
                ]
            }
        },
        include: { tasks: true }
    });
    userId = user.id;

    assert.equal(user.tasks.length, 2);

    const pendingTasks = await prisma.task.findMany({
        where: { userId: user.id, completed: false }
    });
    assert.equal(pendingTasks.length, 1);
    assert.equal(pendingTasks[0].title, 'Tarefa pendente');

    const updatedTask = await prisma.task.update({
        where: { id: pendingTasks[0].id },
        data: { completed: true }
    });
    assert.equal(updatedTask.completed, true);

    await prisma.user.delete({ where: { id: user.id } });
    userId = null;
    assert.equal(await prisma.task.count({ where: { userId: user.id } }), 0);
});
