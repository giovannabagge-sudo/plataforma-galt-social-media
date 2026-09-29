import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { clientesRouter } from './routes/clientes'
import { contextoRouter } from './routes/contexto'
import { producoesRouter } from './routes/producoes'
import { produzirRouter } from './routes/produzir'
import { corrigirRouter } from './routes/corrigir'
import { referenciasRouter } from './routes/referencias'
import { documentosRouter } from './routes/documentos'
import { authRouter } from './routes/auth'
import { authMiddleware, inicializarAdmin } from './auth'

dotenv.config()

const app = express()
const PORT = process.env.API_PORT || 3001
const __dirname = dirname(fileURLToPath(import.meta.url))

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.use('/api/auth', authRouter)
app.use(authMiddleware)

app.use('/api/clientes', clientesRouter)
app.use('/api/contexto', contextoRouter)
app.use('/api/producoes', producoesRouter)
app.use('/api/produzir', produzirRouter)
app.use('/api/corrigir', corrigirRouter)
app.use('/api/referencias', referenciasRouter)
app.use('/api/documentos', documentosRouter)

const distPath = join(__dirname, '..', 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

inicializarAdmin()

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
