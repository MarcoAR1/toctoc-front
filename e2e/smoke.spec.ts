import { expect, test } from '@playwright/test'

test('la landing muestra las tres personas', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /el timbre de tu edificio/i })).toBeVisible()
  await expect(page.getByText('Soy visitante')).toBeVisible()
  await expect(page.getByText('Soy residente')).toBeVisible()
  await expect(page.getByText('Administración')).toBeVisible()
})

test('el código manual del visitante navega a /r/:code', async ({ page }) => {
  await page.goto('/r')
  await page.getByLabel('Código de la propiedad').fill('UN2SSCJ')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page).toHaveURL(/\/r\/UN2SSCJ$/)
})
