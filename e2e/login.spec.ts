import { expect, test, type Page } from '@playwright/test'

const AVISO =
  'Simulação ilustrativa. Valores sujeitos às condições do grupo e da administradora. Consórcio regulado pelo Banco Central (Lei 11.795/2008).'

async function entrar(page: Page, email: string, lembrar = false) {
  await page.goto('')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('demo123')
  if (lembrar) await page.getByLabel('Lembrar de mim').check()
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
}

async function abrirMenu(page: Page) {
  const botao = page.getByRole('button', { name: 'Abrir menu' })
  if (await botao.isVisible()) await botao.click()
}

test.describe('login de demonstração', () => {
  test('mostra aviso de demonstração, usuários de exemplo, aviso legal e CSP', async ({ page }) => {
    const errosConsole: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errosConsole.push(msg.text())
    })
    await page.goto('')
    await expect(page).toHaveURL(/#\/login$/)
    await expect(page.getByText('Este login não é uma autenticação real')).toBeVisible()
    await expect(page.getByRole('button', { name: /Administrador/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Gestor/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Vendedor/ })).toHaveCount(2)
    await expect(page.getByText(AVISO)).toBeVisible()
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content')
    expect(csp).toContain("script-src 'self'")
    expect(errosConsole).toEqual([])
  })

  test('valida campos vazios e senha errada', async ({ page }) => {
    await page.goto('')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page.getByText('Informe a senha.')).toBeVisible()

    await page.getByLabel('E-mail').fill('ana.admin@exemplo.test')
    await page.getByLabel('Senha', { exact: true }).fill('errada')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
  })

  test('mostrar e ocultar senha', async ({ page }) => {
    await page.goto('')
    const senha = page.getByLabel('Senha', { exact: true })
    await expect(senha).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Mostrar senha' }).click()
    await expect(senha).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar senha' }).click()
    await expect(senha).toHaveAttribute('type', 'password')
  })

  test('clicar num usuário de demonstração preenche o formulário', async ({ page }) => {
    await page.goto('')
    await page.getByRole('button', { name: /Gestor/ }).click()
    await expect(page.getByLabel('E-mail')).toHaveValue('carlos.gestor@exemplo.test')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByTestId('usuario-perfil')).toHaveText('Gestor')
  })

  test('Vendedor não vê Grupos nem Configurações e é barrado pela URL', async ({ page }) => {
    await entrar(page, 'julia.vendas@exemplo.test')
    await abrirMenu(page)
    const menu = page.getByRole('navigation', { name: 'Principal' })
    await expect(menu.getByRole('link', { name: 'Simulador' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Grupos e cotas' })).toHaveCount(0)
    await expect(menu.getByRole('link', { name: 'Configurações' })).toHaveCount(0)
    await page.goto('#/configuracoes')
    await expect(page.getByRole('heading', { name: 'Acesso não permitido' })).toBeVisible()
  })

  test('Administrador acessa Configurações e altera dados da empresa', async ({ page }) => {
    await entrar(page, 'ana.admin@exemplo.test')
    await abrirMenu(page)
    await page.getByRole('link', { name: 'Configurações' }).click()
    await page.getByLabel('CNPJ').fill('12345678000199')
    await expect(page.getByLabel('CNPJ')).toHaveValue('12.345.678/0001-99')
    await page.getByLabel('Razão social').fill('Nova Razão Fictícia Ltda.')
    await page.getByRole('button', { name: 'Salvar dados da empresa' }).click()
    await expect(page.getByText('Dados da empresa salvos.')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Razão social')).toHaveValue('Nova Razão Fictícia Ltda.')
  })

  test('sem "lembrar de mim" a sessão não vale numa nova aba; com, vale', async ({ context }) => {
    const aba1 = await context.newPage()
    await entrar(aba1, 'carlos.gestor@exemplo.test')
    const aba2 = await context.newPage()
    await aba2.goto('')
    await expect(aba2).toHaveURL(/#\/login$/)

    await entrar(aba2, 'carlos.gestor@exemplo.test', true)
    const aba3 = await context.newPage()
    await aba3.goto('')
    await expect(aba3).toHaveURL(/#\/dashboard$/)
  })

  test('sair volta ao login e protege as rotas', async ({ page }) => {
    await entrar(page, 'ana.admin@exemplo.test')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/#\/login$/)
    await page.goto('#/simulador')
    await expect(page).toHaveURL(/#\/login$/)
  })
})
