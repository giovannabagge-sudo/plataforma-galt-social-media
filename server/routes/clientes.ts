import { Router } from 'express'
import { randomUUID } from 'crypto'
import { lerClientes, salvarClientes, type ClienteData } from '../vault'

export const clientesRouter = Router()

clientesRouter.get('/', (_req, res) => {
  const clientes = lerClientes()
  res.json(clientes.map(({ id, nome, segmento }) => ({ id, nome, segmento })))
})

clientesRouter.post('/', (req, res) => {
  const { nome, segmento } = req.body
  if (!nome?.trim() || !segmento?.trim()) {
    return res.status(400).json({ erro: 'Nome e segmento são obrigatórios' })
  }

  const clientes = lerClientes()
  const id = nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')

  if (clientes.find(c => c.id === id)) {
    return res.status(400).json({ erro: 'Já existe um cliente com esse nome' })
  }

  const novo: ClienteData = {
    id,
    nome: nome.trim(),
    segmento: segmento.trim(),
    criadoEm: new Date().toISOString(),
  }

  clientes.push(novo)
  salvarClientes(clientes)

  res.json({ id: novo.id, nome: novo.nome, segmento: novo.segmento })
})

clientesRouter.delete('/:id', (req, res) => {
  const clientes = lerClientes()
  const idx = clientes.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ erro: 'Cliente não encontrado' })

  clientes.splice(idx, 1)
  salvarClientes(clientes)

  res.json({ ok: true })
})
