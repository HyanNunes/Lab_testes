import { browser } from 'k6/browser'
import { check } from 'https://jslib.k6.io/k6-utils/1.6.0/index.js'

const testEmail = __ENV.TEST_USER_EMAIL
const testPassword = __ENV.TEST_USER_PASSWORD

if (!testEmail || !testPassword) {
    throw new Error('Defina TEST_USER_EMAIL e TEST_USER_PASSWORD para executar o teste E2E.')
}

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

    try {
        await page.goto('http://localhost:3000', {
            waitFor: 'networkidle',
        })

        await page.locator('#login-email').fill(testEmail)
        await page.locator('#login-password').fill(testPassword)
        await page.getByRole('button', { name: 'Entrar' }).click()

        // Wait for the logout button to be visible
        await page.locator('summary', { hasText: 'Conta' }).waitFor()
        await page.locator('summary', { hasText: 'Conta' }).click()
        await page.locator('#logout-button').waitFor()

        const label = page.locator('#tasks-title')
        await label.waitFor()

        const textContent = (await label.textContent()).trim()
        check(textContent, {
            header: (t) => t === 'Minhas tarefas',
        })
    } finally {
        await page.close()
    }
}
