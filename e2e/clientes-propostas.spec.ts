import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { entrarComo, irPara, semRolagemLateral, USUARIOS, vigiarConsole } from './apoio'

const ano = new Date().getFullYear()

test('fluxo completo: simulação → proposta → PDF → venda', async ({ page }) => {
  const erros = vigiarConsole(page)
  await entrarComo(page, USUARIOS.vendedora)
  await irPara(page, 'simulador')
  await page.getByRole('button', { name: 'Serviço' }).click()
  await expect(page.getByTestId('parcela-inicial')).toHaveText('R$ 521,67')
  await page.getByRole('button', { name: 'Gerar proposta' }).click()

  await expect(page.getByRole('heading', { name: 'Nova proposta' })).toBeVisible()
  await page.getByRole('button', { name: 'Novo cliente' }).click()
  await page.getByRole('button', { name: 'Salvar proposta' }).click()
  await expect(page.getByText('Informe o nome.')).toBeVisible()
  await page.getByLabel('Nome *').fill('Cliente Teste Fictício')
  await page.getByLabel('Telefone').fill('11988887777')
  await expect(page.getByLabel('Telefone')).toHaveValue('(11) 98888-7777')
  await page.getByLabel('Observações').fill('Prefere débito automático.')
  await page.getByRole('button', { name: 'Salvar proposta' }).click()

  await expect(page.getByRole('heading', { name: `Proposta P-${ano}-0015` })).toBeVisible()
  await expect(page.getByText('Em aberto')).toBeVisible()
  await semRolagemLateral(page)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar PDF' }).click()
  const arquivo = await download
  expect(arquivo.suggestedFilename()).toBe(`proposta-P-${ano}-0015.pdf`)
  const bytes = await readFile(await arquivo.path())
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  expect(bytes.length).toBeGreaterThan(3000)

  await page.getByRole('button', { name: 'Marcar como enviada' }).click()
  await expect(page.getByText('Enviada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Registrar venda' }).click()
  await expect(page.getByText('Proposta encerrada.')).toBeVisible()
  await expect(page.getByText('Aceita', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Cliente Teste Fictício' }).click()
  await expect(page.getByText('Venda', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(`Proposta P-${ano}-0015: aceita`)).toBeVisible()
  expect(erros).toEqual([])
})

test('vendedora só vê os próprios clientes e é barrada no cliente de outro', async ({ page }) => {
  await entrarComo(page, USUARIOS.vendedora)
  await irPara(page, 'clientes')
  await expect(page.locator('table[aria-label="Clientes"] tbody tr')).toHaveCount(8)
  await expect(page.getByRole('link', { name: 'Helena Duarte' })).toHaveCount(0)
  await expect(page.getByRole('columnheader', { name: 'Vendedor' })).toHaveCount(0)
  await irPara(page, 'clientes/c-09')
  await expect(page.getByRole('heading', { name: 'Acesso não permitido' })).toBeVisible()
  await irPara(page, 'propostas')
  await expect(page.getByRole('link', { name: /P-\d{4}-0004/ })).toHaveCount(0)
})

test('gestor vê toda a equipe e filtra propostas por status', async ({ page }) => {
  await entrarComo(page, USUARIOS.gestor)
  await irPara(page, 'clientes')
  await expect(page.locator('table[aria-label="Clientes"] tbody tr')).toHaveCount(16)
  await page.getByLabel('Buscar').fill('helena')
  await expect(page.locator('table[aria-label="Clientes"] tbody tr')).toHaveCount(1)
  await irPara(page, 'propostas')
  await page.getByRole('button', { name: 'Aceita' }).click()
  await expect(page.locator('table[aria-label="Propostas"] tbody tr')).toHaveCount(9)
  await semRolagemLateral(page)
})

test('funil, anotação e cadastro de cliente', async ({ page }) => {
  await entrarComo(page, USUARIOS.vendedora)
  await irPara(page, 'clientes')
  await page.getByRole('button', { name: 'Funil' }).click()
  const leads = page.getByRole('region', { name: 'Lead' })
  const primeiro = leads.locator('.funil-cartao a').first()
  const nome = (await primeiro.textContent()) ?? ''
  await page.getByRole('button', { name: `Avançar ${nome} para Proposta` }).click()
  await expect(
    page.getByRole('region', { name: 'Proposta' }).getByRole('link', { name: nome }),
  ).toBeVisible()
  await semRolagemLateral(page)

  await page.getByRole('region', { name: 'Proposta' }).getByRole('link', { name: nome }).click()
  await page.getByLabel('Nova anotação').fill('Retornar com proposta de imóvel.')
  await page.getByRole('button', { name: 'Adicionar anotação' }).click()
  await expect(page.getByText('Retornar com proposta de imóvel.')).toBeVisible()
  await expect(page.getByText('Etapa: Lead → Proposta')).toBeVisible()

  await irPara(page, 'clientes/novo')
  await page.getByLabel('Nome *').fill('Novo Lead Fictício')
  await page.getByLabel('Telefone').fill('1190')
  await page.getByRole('button', { name: 'Salvar cliente' }).click()
  await expect(page.getByText('Use (11) 90000-0000')).toBeVisible()
  await page.getByLabel('Telefone').fill('11900001234')
  await page.getByRole('button', { name: 'Salvar cliente' }).click()
  await expect(page.getByRole('heading', { name: 'Novo Lead Fictício' })).toBeVisible()
  await expect(page.getByText('Cliente cadastrado')).toBeVisible()
})

test('simular a partir da ficha já traz o cliente na proposta', async ({ page }) => {
  await entrarComo(page, USUARIOS.vendedora)
  await irPara(page, 'clientes/c-02')
  await page.getByRole('link', { name: 'Simular para este cliente' }).click()
  await page.getByRole('button', { name: 'Gerar proposta' }).click()
  await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue('c-02')
})
