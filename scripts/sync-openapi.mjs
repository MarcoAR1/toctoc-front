#!/usr/bin/env node
/**
 * Sincroniza el OpenAPI del backend a openapi/toctoc.openapi.json.
 * Fuente por prioridad:
 *   1) OPENAPI_URL  -> descarga (ej: http://localhost:8080/api-docs/swagger.json)
 *   2) OPENAPI_SRC  -> copia un archivo local
 *   3) ruta hermana por defecto: ../TocToc/src/infrastructure/routes/swagger.json
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const OUT = resolve(root, 'openapi/toctoc.openapi.json')
const DEFAULT_SRC = resolve(root, '../TocToc/src/infrastructure/routes/swagger.json')

async function main() {
  mkdirSync(dirname(OUT), { recursive: true })

  const url = process.env.OPENAPI_URL
  if (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`No se pudo descargar OpenAPI de ${url}: HTTP ${res.status}`)
    writeFileSync(OUT, await res.text())
    console.log(`OpenAPI descargado de ${url} -> ${OUT}`)
    return
  }

  const src = process.env.OPENAPI_SRC || DEFAULT_SRC
  if (!existsSync(src)) {
    throw new Error(
      `No se encontró el OpenAPI en ${src}.\n` +
        `Definí OPENAPI_SRC=<ruta> o OPENAPI_URL=<url>, o levantá el backend (/api-docs).`,
    )
  }
  copyFileSync(src, OUT)
  console.log(`OpenAPI copiado de ${src} -> ${OUT}`)
}

main().catch((err) => {
  console.error(`[sync-openapi] ${err.message}`)
  process.exit(1)
})
