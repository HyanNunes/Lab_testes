import http from 'k6/http'
import { check } from 'https://jslib.k6.io/k6-utils/1.6.0/index.js'

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'
const headers = { 'Content-Type': 'application/json' }

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: {
        checks: ['rate==1.0'],
        http_req_failed: ['rate==0.0'],
    },
}

export default function () {
    const email = `k6-${Date.now()}@exemplo.com`
    const password = 'senhaSegura123'

    // 1. Registro: API + Prisma gravam o usuário e criam a sessão
    const registro = http.post(
        `${baseUrl}/api/auth/register`,
        JSON.stringify({ name: 'Teste k6', email, password }),
        { headers }
    )
    check(registro, { 'registro retorna 201': (r) => r.status === 201 })

    try {
        // 2. Cria uma tarefa usando a sessão (o cookie vai sozinho)
        const criada = http.post(
            `${baseUrl}/api/tasks`,
            JSON.stringify({ title: 'Tarefa de integração' }),
            { headers }
        )
        check(criada, { 'tarefa criada retorna 201': (r) => r.status === 201 })

        // 3. Confirma que a tarefa foi persistida no banco
        const lista = http.get(`${baseUrl}/api/tasks`)
        check(lista, {
            'lista contém a tarefa': (r) =>
                r.json().some((t) => t.id === criada.json('id')),
        })
    } finally {
        // 4. Limpeza: exclui a conta (e as tarefas, em cascata)
        const exclusao = http.del(`${baseUrl}/api/auth/account`)
        check(exclusao, { 'conta excluída retorna 204': (r) => r.status === 204 })
    }
}