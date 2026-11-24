import { expect, type Page } from '@playwright/test'

export const USUARIOS = {
  admin: 'ana.admin@exemplo.test',
  gestor: 'carlos.gestor@exemplo.test',
  vendedora: 'julia.vendas@exemplo.test',
  vendedor: 'marcos.vendas@exemplo.test',
} as const

export function vigiarConsole(page: Page): string[] {
  const erros: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') erros.push(msg.text())
  })
  page.on('pageerror', (erro) => erros.push(erro.message))
  return erros
}

export async function entrarComo(page: Page, email: string) {
  await page.goto('')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('demo123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
}

export async function irPara(page: Page, rota: string) {
  await page.goto(`#/${rota}`)
}

export async function semRolagemLateral(page: Page) {
  const larguras = await page.evaluate(() => ({
    conteudo: document.documentElement.scrollWidth,
    janela: document.documentElement.clientWidth,
  }))
  expect(larguras.conteudo, 'rolagem lateral na página').toBeLessThanOrEqual(larguras.janela)
}
