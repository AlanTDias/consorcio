import { expect, test } from '@playwright/test'
import { entrarComo, irPara, semRolagemLateral, USUARIOS, vigiarConsole } from './apoio'

test.describe('simulador', () => {
  test.beforeEach(async ({ page }) => {
    await entrarComo(page, USUARIOS.vendedora)
    await irPara(page, 'simulador')
  })

  test('imóvel R$ 300.000 em 200 meses: parcela R$ 1.765,00', async ({ page }) => {
    const erros = vigiarConsole(page)
    await expect(page.getByTestId('parcela-inicial')).toHaveText('R$ 1.765,00')
    await expect(page.getByTestId('total-pago')).toHaveText('R$ 353.000,00')
    await expect(page.getByTestId('custo-total')).toHaveText('R$ 53.000,00')
    await expect(page.getByText('Taxa de administração (16,67% no prazo)')).toBeVisible()
    await semRolagemLateral(page)
    expect(erros).toEqual([])
  })

  test('veículo R$ 80.000 em 80 meses: parcela R$ 1.076,67', async ({ page }) => {
    await page.getByRole('button', { name: 'Veículo' }).click()
    await page.getByTestId('campo-carta').fill('80000')
    await page.getByTestId('campo-prazo').fill('80')
    await expect(page.getByTestId('parcela-inicial')).toHaveText('R$ 1.076,67')
  })

  test('serviço R$ 20.000 em 40 meses: última parcela R$ 521,54 na evolução', async ({ page }) => {
    await page.getByRole('button', { name: 'Serviço' }).click()
    await page.getByTestId('campo-carta').fill('20000')
    await page.getByTestId('campo-prazo').fill('40')
    await expect(page.getByTestId('parcela-inicial')).toHaveText('R$ 521,67')
    await page.getByRole('button', { name: 'Ver 40 meses' }).click()
    const ultima = page.locator('.tabela-evolucao tbody tr').last()
    await expect(ultima.locator('td').nth(0)).toHaveText('40')
    await expect(ultima.locator('td').nth(3)).toHaveText('R$ 521,54')
    await semRolagemLateral(page)
  })

  test('lance embutido de 25% no imóvel: crédito líquido R$ 225.000,00', async ({ page }) => {
    await page.getByRole('button', { name: 'Lance', exact: true }).click()
    await page.getByRole('button', { name: 'Embutido' }).click()
    await page.getByTestId('campo-lance').fill('25')
    await page.getByTestId('campo-mes').fill('12')
    await expect(page.getByTestId('credito-liquido')).toHaveText('R$ 225.000,00')
    await expect(page.getByText('Lance embutido (25,00% da carta)')).toBeVisible()
  })

  test('lance embutido acima do máximo configurado é recusado', async ({ page }) => {
    await page.getByRole('button', { name: 'Lance', exact: true }).click()
    await page.getByRole('button', { name: 'Embutido' }).click()
    await page.getByTestId('campo-lance').fill('45')
    await expect(page.getByText('Informe um percentual entre 0,01% e 30%.')).toBeVisible()
    await expect(page.getByTestId('resultado-simulacao')).toHaveCount(0)
  })

  test('carta fora dos limites da categoria mostra erro', async ({ page }) => {
    await page.getByTestId('campo-carta').fill('1000')
    await expect(page.getByText('Entre R$ 50.000 e R$ 1.500.000.')).toBeVisible()
  })
})

test('comparador: SAC de R$ 100.000 a 1% a.m. em 12 meses custa R$ 6.500,00', async ({ page }) => {
  const erros = vigiarConsole(page)
  await entrarComo(page, USUARIOS.gestor)
  await irPara(page, 'comparador')
  await page.getByTestId('comp-valor').fill('100000')
  await page.getByTestId('comp-prazo').fill('12')
  await page.getByTestId('comp-juros').fill('1')
  await expect(page.getByTestId('custo-Financiamento SAC')).toHaveText('R$ 6.500,00')
  await expect(page.getByTestId('custo-Consórcio')).toHaveText('R$ 2.000,00')
  await expect(page.getByText('Equivale a 12,68% ao ano')).toBeVisible()
  await semRolagemLateral(page)
  expect(erros).toEqual([])
})

test('configurações: alterar a taxa de administração muda o simulador', async ({ page }) => {
  await entrarComo(page, USUARIOS.admin)
  await irPara(page, 'configuracoes')
  await page.getByLabel('Taxa de administração').fill('1,2')
  await page.getByRole('button', { name: 'Salvar taxas e categorias' }).click()
  await expect(page.getByText('Parâmetros salvos.')).toBeVisible()
  await irPara(page, 'simulador')
  await expect(page.getByText('Taxa de administração (20,00% no prazo)')).toBeVisible()
})
