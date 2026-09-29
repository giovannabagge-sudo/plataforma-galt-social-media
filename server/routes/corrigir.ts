import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { executarClaude } from '../claude'
import { carregarSkill, getCliente } from '../vault'

export const corrigirRouter = Router()

const DATA_DIR = path.join(import.meta.dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'producoes.json')

function lerProducoes() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function salvarProducoes(producoes: unknown[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(producoes, null, 2))
}

corrigirRouter.post('/:id', async (req, res) => {
  const { instrucao } = req.body
  if (!instrucao || !instrucao.trim()) {
    return res.status(400).json({ erro: 'Instrução de correção é obrigatória' })
  }

  const producoes = lerProducoes()
  const idx = producoes.findIndex((p: { id: string }) => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ erro: 'Produção não encontrada' })

  const producao = producoes[idx]

  if (!producao.output || producao.status === 'produzindo') {
    return res.status(400).json({ erro: 'Esta produção não tem conteúdo para corrigir' })
  }

  const cliente = getCliente(producao.clienteId)
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' })

  const skill = carregarSkill(producao.formato)
  const blocoSkill = skill
    ? `\n\n## SKILL DE PRODUÇÃO (mantenha estas regras na correção)\n\n${skill}\n\n`
    : ''

  const prompt = `IMPORTANTE: NÃO tente acessar nenhum arquivo externo. Use APENAS o que está aqui.

Você é um copywriter sênior de social media da Agência Asas.

Abaixo está um conteúdo que foi produzido para o cliente ${cliente.nome} (${cliente.segmento}).
O conteúdo precisa de correções. Leia o conteúdo original, aplique as correções solicitadas e reescreva o conteúdo COMPLETO corrigido.

Não explique o que mudou. Não adicione comentários. Entregue apenas o conteúdo final corrigido, pronto para uso.
${blocoSkill}
---

## CONTEÚDO ORIGINAL

${producao.output}

---

## CORREÇÕES SOLICITADAS

${instrucao.trim()}`

  producoes[idx].status = 'produzindo'
  producoes[idx].atualizadoEm = new Date().toISOString()
  salvarProducoes(producoes)

  res.json({ ok: true, message: 'Correção iniciada' })

  try {
    const output = await executarClaude(prompt)
    const atualizado = lerProducoes()
    const i = atualizado.findIndex((p: { id: string }) => p.id === req.params.id)
    if (i !== -1) {
      atualizado[i].output = output
      atualizado[i].status = 'produzido'
      atualizado[i].atualizadoEm = new Date().toISOString()
      salvarProducoes(atualizado)
    }
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
    console.error('[corrigir] Erro ao executar claude:', mensagem)
    const atualizado = lerProducoes()
    const i = atualizado.findIndex((p: { id: string }) => p.id === req.params.id)
    if (i !== -1) {
      atualizado[i].output = `ERRO: ${mensagem}`
      atualizado[i].status = 'erro'
      atualizado[i].atualizadoEm = new Date().toISOString()
      salvarProducoes(atualizado)
    }
  }
})
