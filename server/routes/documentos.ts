import { Router } from 'express'
import { randomUUID } from 'crypto'
import { lerDocumentos, salvarDocumentos, type Documento } from '../vault'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdf = require('pdf-parse')

export const documentosRouter = Router()

documentosRouter.get('/:clienteId', (req, res) => {
  const docs = lerDocumentos().filter(d => d.clienteId === req.params.clienteId)
  res.json(docs)
})

documentosRouter.post('/upload-pdf', async (req, res) => {
  const { clienteId, tipo, nome, pdfBase64 } = req.body
  if (!clienteId || !tipo || !nome?.trim() || !pdfBase64) {
    return res.status(400).json({ erro: 'clienteId, tipo, nome e pdfBase64 são obrigatórios' })
  }

  try {
    const buffer = Buffer.from(pdfBase64, 'base64')
    const data = await pdf(buffer)
    const conteudo = data.text?.trim()
    if (!conteudo) {
      return res.status(400).json({ erro: 'Não foi possível extrair texto do PDF' })
    }

    const docs = lerDocumentos()
    const existente = docs.findIndex(d => d.clienteId === clienteId && d.tipo === tipo)
    if (existente !== -1 && tipo !== 'outro') {
      docs[existente].conteudo = conteudo
      docs[existente].nome = nome.trim()
      docs[existente].atualizadoEm = new Date().toISOString()
      salvarDocumentos(docs)
      return res.json(docs[existente])
    }

    const novo: Documento = {
      id: randomUUID(),
      clienteId,
      tipo,
      nome: nome.trim(),
      conteudo,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }
    docs.push(novo)
    salvarDocumentos(docs)
    res.json(novo)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(400).json({ erro: `Erro ao processar PDF: ${msg}` })
  }
})

documentosRouter.post('/', (req, res) => {
  const { clienteId, tipo, nome, conteudo } = req.body
  if (!clienteId || !tipo || !nome?.trim() || !conteudo?.trim()) {
    return res.status(400).json({ erro: 'clienteId, tipo, nome e conteudo são obrigatórios' })
  }

  const docs = lerDocumentos()

  const existente = docs.findIndex(d => d.clienteId === clienteId && d.tipo === tipo)
  if (existente !== -1 && tipo !== 'outro') {
    docs[existente].conteudo = conteudo.trim()
    docs[existente].nome = nome.trim()
    docs[existente].atualizadoEm = new Date().toISOString()
    salvarDocumentos(docs)
    return res.json(docs[existente])
  }

  const novo: Documento = {
    id: randomUUID(),
    clienteId,
    tipo,
    nome: nome.trim(),
    conteudo: conteudo.trim(),
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  }

  docs.push(novo)
  salvarDocumentos(docs)

  res.json(novo)
})

documentosRouter.put('/:id', (req, res) => {
  const { nome, conteudo } = req.body
  const docs = lerDocumentos()
  const idx = docs.findIndex(d => d.id === req.params.id)
  if (idx === -1) return res.status(404).json({ erro: 'Documento não encontrado' })

  if (nome?.trim()) docs[idx].nome = nome.trim()
  if (conteudo?.trim()) docs[idx].conteudo = conteudo.trim()
  docs[idx].atualizadoEm = new Date().toISOString()

  salvarDocumentos(docs)
  res.json(docs[idx])
})

documentosRouter.delete('/:id', (req, res) => {
  const docs = lerDocumentos()
  const idx = docs.findIndex(d => d.id === req.params.id)
  if (idx === -1) return res.status(404).json({ erro: 'Documento não encontrado' })

  docs.splice(idx, 1)
  salvarDocumentos(docs)

  res.json({ ok: true })
})
