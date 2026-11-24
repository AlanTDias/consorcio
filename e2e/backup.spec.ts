import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('exportar, restaurar exemplo e importar backup', async ({ page }) => {
  page.on('dialog', (dialogo) => dialogo.accept())
  await page.goto('')
  await page.getByRole('button', { name: /Administrador/ }).click()
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('#/configuracoes')

  await page.getByLabel('Razão social').fill('Backup Fictício Ltda.')
  await page.getByRole('button', { name: 'Salvar dados da empresa' }).click()
  await expect(page.getByText('Dados da empresa salvos.')).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar JSON' }).click()
  const arquivo = await (await download).path()
  const conteudo = JSON.parse(await readFile(arquivo, 'utf8'))
  expect(conteudo.app).toBe('consorcio')
  expect(conteudo.dados.config.empresa.razaoSocial).toBe('Backup Fictício Ltda.')

  await page.getByRole('button', { name: 'Restaurar dados de exemplo' }).click()
  await expect(page.getByText('Dados de exemplo restaurados.')).toBeVisible()
  await expect(page.getByLabel('Razão social')).toHaveValue(
    'Empresa Exemplo de Consórcios Ltda. (fictícia)',
  )

  await page.getByTestId('arquivo-backup').setInputFiles(arquivo)
  await expect(page.getByText('Backup importado com sucesso.')).toBeVisible()
  await expect(page.getByLabel('Razão social')).toHaveValue('Backup Fictício Ltda.')

  await page.getByTestId('arquivo-backup').setInputFiles({
    name: 'ruim.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"app":"outro"}'),
  })
  await expect(page.getByRole('alert')).toHaveText(
    'O arquivo não é um backup válido deste sistema.',
  )
})
