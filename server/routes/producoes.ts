import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const producoesRouter = Router()

const DATA_DIR = path.join(import.meta.dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'producoes.json')

export interface Producao {
  id: string
  clienteId: string
  formato: string
  canal: string
  linhaEditorial: string
  tema: string
  referenciasExtras?: string
  fotoBase64?: string
  fotoMediaType?: string
  output?: string
  veredito?: string
  status: 'pendente' | 'produzindo' | 'produzido' | 'revisado'
  criadoEm: string
  atualizadoEm: string
}

function lerProducoes(): Producao[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function salvarProducoes(producoes: Producao[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(producoes, null, 2))
}

// GET /api/producoes/:clienteId — lista produções do cliente
producoesRouter.get('/:clienteId', (req, res) => {
  const producoes = lerProducoes()
    .filter(p => p.clienteId === req.params.clienteId)
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
  res.json(producoes)
})

// GET /api/producoes/item/:id — busca uma produção específica
producoesRouter.get('/item/:id', (req, res) => {
  const producao = lerProducoes().find(p => p.id === req.params.id)
  if (!producao) return res.status(404).json({ erro: 'Produção não encontrada' })
  res.json(producao)
})

// POST /api/producoes — cria nova produção (briefing)
producoesRouter.post('/', (req, res) => {
  const { clienteId, formato, canal, linhaEditorial, tema, referenciasExtras, fotoBase64, fotoMediaType } = req.body

  if (!clienteId || !formato || !tema) {
    return res.status(400).json({ erro: 'clienteId, formato e tema são obrigatórios' })
  }

  const agora = new Date().toISOString()
  const producao: Producao = {
    id: crypto.randomUUID(),
    clienteId,
    formato,
    canal: canal || 'Instagram',
    linhaEditorial: linhaEditorial || '',
    tema,
    referenciasExtras,
    fotoBase64,
    fotoMediaType,
    status: 'pendente',
    criadoEm: agora,
    atualizadoEm: agora,
  }

  const producoes = lerProducoes()
  producoes.push(producao)
  salvarProducoes(producoes)

  res.status(201).json(producao)
})

// PATCH /api/producoes/:id — atualiza produção (output, veredito, status)
producoesRouter.patch('/:id', (req, res) => {
  const producoes = lerProducoes()
  const idx = producoes.findIndex(p => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ erro: 'Produção não encontrada' })

  const { output, veredito, status } = req.body
  if (output !== undefined) producoes[idx].output = output
  if (veredito !== undefined) producoes[idx].veredito = veredito
  if (status !== undefined) producoes[idx].status = status
  producoes[idx].atualizadoEm = new Date().toISOString()

  salvarProducoes(producoes)
  res.json(producoes[idx])
})

// DELETE /api/producoes/:id
producoesRouter.delete('/:id', (req, res) => {
  const producoes = lerProducoes()
  const idx = producoes.findIndex(p => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ erro: 'Produção não encontrada' })

  producoes.splice(idx, 1)
  salvarProducoes(producoes)
  res.json({ ok: true })
})
