import { browser } from 'k6/browser'
import { check } from 'https://jslib.k6.io/k6-utils/1.6.0/index.js'
import { randomString } from 'https://jslib.k6.io/k6-utils/1.0.0/index.js'

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
    scenarios: {
        ui: {
            executor: 'shared-iterations',
            options: {
                browser: {
                    type: 'chromium',
                },
            },
        },
    },
    thresholds: {
        checks: ['rate==1.0'],
    },
}

export default async function () {
    const page = await browser.newPage()
    const email = `e2e-${randomString(10).toLowerCase()}@example.com`
    const password = `Senha${randomString(12)}123`
    const taskTitle = `Tarefa E2E ${randomString(6)}`

    try {
        await page.goto(baseUrl, { waitFor: 'networkidle' })

        await page.locator('#register-tab').click()
        await page.locator('#register-name').fill('Usuário E2E')
        await page.waitForTimeout(500)
        await page.locator('#register-email').fill(email)
        await page.waitForTimeout(500)
        await page.locator('#register-password').fill(password)
        await page.waitForTimeout(500)
        await page.getByRole('button', { name: 'Criar conta' }).click()

        await page.locator('#tasks-view:not(.hidden)').waitFor()
        check(await page.locator('#welcome-message').textContent(), {
            'usuario criado e autenticado': (text) =>
                text && text.includes('Usuário E2E'),
        })

        await page.locator('#task-title').fill(taskTitle)
        await page.waitForTimeout(500)
        await page.locator('#task-description').fill('Criada pelo teste E2E completo.')
        await page.waitForTimeout(500)
        await page.getByRole('button', { name: 'Adicionar tarefa' }).click()

        await page.getByText(taskTitle, { exact: true }).waitFor()
        await page.locator('.task-item input[type="checkbox"]').check(500)
        await page.waitForTimeout(300)

        const checkbox = page.locator('.task-item input[type="checkbox"]')
        check(await checkbox.isChecked(await page.waitForTimeout(500)), {
            'checkbox da tarefa marcado': (checked) => checked,
        })

        await page.getByRole('button', { name: `Excluir ${taskTitle}` }).click()
        await page.waitForTimeout(500)
        await page.locator('.task-item').waitFor({ state: 'detached' })

        check(await page.locator('#task-count').textContent(), {
            'tarefa excluida': (text) => text.trim() === '0 tarefas',
        })

        await page.locator('#account-menu summary').click()
        await page.waitForTimeout(500)
        await page.locator('#logout-button').click()
        await page.waitForTimeout(500)
        await page.locator('#auth-view:not(.hidden)').waitFor()

        check(await page.locator('#login-form').isVisible(), {
            'usuario saiu da conta': (visible) => visible,
        })

        await page.locator('#login-email').fill(email)
        await page.waitForTimeout(500)
        await page.locator('#login-password').fill(password)
        await page.waitForTimeout(500)
        await page.getByRole('button', { name: 'Entrar' }).click()
        await page.locator('#tasks-view:not(.hidden)').waitFor()

        check(await page.locator('#welcome-message').textContent(), {
            'usuario entrou novamente': (text) =>
                text && text.includes('Usuário E2E'),
        })

        await page.locator('#account-menu summary').click()
        await page.waitForTimeout(500)
        await page.evaluate(() => {
            window.confirm = () => true
        })
        await page.locator('#delete-account-button').click()
        await page.waitForTimeout(500)
        await page.locator('#auth-view:not(.hidden)').waitFor()

        check(await page.locator('#auth-message').textContent(), {
            'conta excluida': (text) =>
                text && text.includes('conta'),
        })
    } finally {
        await page.close()
    }
}
