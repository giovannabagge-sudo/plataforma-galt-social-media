import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const referenciasRouter = Router()

const DATA_DIR = path.join(import.meta.dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'referencias.json')

export interface FotoRef {
  base64: string
  mediaType: string
}

export interface Referencia {
  id: string
  clienteId: string
  legenda: string
  formato: string
  fotos: FotoRef[]
  criadoEm: string
}

function lerReferencias(): Referencia[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function salvarReferencias(refs: Referencia[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(refs, null, 2))
}

// GET /api/referencias/:clienteId
referenciasRouter.get('/:clienteId', (req, res) => {
  const refs = lerReferencias()
    .filter(r => r.clienteId === req.params.clienteId)
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
  res.json(refs)
})

// POST /api/referencias
referenciasRouter.post('/', (req, res) => {
  const { clienteId, legenda, formato, fotos } = req.body

  if (!clienteId || !legenda) {
    return res.status(400).json({ erro: 'clienteId e legenda são obrigatórios' })
  }

  const ref: Referencia = {
    id: crypto.randomUUID(),
    clienteId,
    legenda,
    formato: formato || 'carrossel',
    fotos: Array.isArray(fotos) ? fotos : [],
    criadoEm: new Date().toISOString(),
  }

  const refs = lerReferencias()
  refs.push(ref)
  salvarReferencias(refs)

  res.status(201).json(ref)
})

// DELETE /api/referencias/:id
referenciasRouter.delete('/:id', (req, res) => {
  const refs = lerReferencias()
  const idx = refs.findIndex(r => r.id === req.params.id)
  if (idx === -1) return res.status(404).json({ erro: 'Referência não encontrada' })

  refs.splice(idx, 1)
  salvarReferencias(refs)
  res.json({ ok: true })
})
