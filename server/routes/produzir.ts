import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { executarClaude } from '../claude'
import { carregarContextoCliente, carregarContextoFormato, carregarSkill, getCliente } from '../vault'

export const produzirRouter = Router()

const DATA_DIR = path.join(import.meta.dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'producoes.json')
const REFS_FILE = path.join(DATA_DIR, 'referencias.json')

interface RefPost { legenda: string; formato: string }

function lerReferenciasCliente(clienteId: string): RefPost[] {
  try {
    const todas = JSON.parse(fs.readFileSync(REFS_FILE, 'utf-8'))
    return todas.filter((r: { clienteId: string }) => r.clienteId === clienteId)
  } catch {
    return []
  }
}

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

produzirRouter.post('/:id', async (req, res) => {
  const producoes = lerProducoes()
  const idx = producoes.findIndex((p: { id: string }) => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ erro: 'Produção não encontrada' })

  const producao = producoes[idx]

  if (producao.status === 'produzido' || producao.status === 'produzindo') {
    return res.status(400).json({ erro: 'Esta produção já está em andamento ou foi gerada' })
  }

  const cliente = getCliente(producao.clienteId)
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' })

  const contextoCliente = carregarContextoCliente(producao.clienteId)
  const contextoFormato = producao.formato !== 'estrategia'
    ? carregarContextoFormato(producao.formato)
    : ''

  const nomeFormato: Record<string, string> = {
    carrossel: 'Carrossel',
    estatico: 'Post Estático',
    stories: 'Stories',
    estrategia: 'Estratégia de conteúdo',
  }

  let instrucao = ''
  const preambulo = `IMPORTANTE: Todo o contexto do cliente, regras de formato e linguagem já estão incluídos abaixo neste prompt. NÃO tente acessar nenhum arquivo externo. Use APENAS o que está aqui.\n\n`

  if (producao.formato === 'estrategia') {
    instrucao = preambulo + `Você é um estrategista sênior de social media da Agência Asas.

Com base no contexto abaixo, gere ideias de posts para o cliente ${cliente.nome} (${cliente.segmento}).

Para cada ideia, inclua:
- Formato sugerido (carrossel, estático ou stories)
- Linha editorial
- Gancho/título do post
- Resumo do que o post abordaria
- Por que esse post funciona para o posicionamento do cliente

Gere entre 5 e 8 ideias variadas, cobrindo diferentes linhas editoriais.`
  } else {
    instrucao = preambulo + `Você é um copywriter sênior de social media da Agência Asas.

Crie um ${nomeFormato[producao.formato] || producao.formato} para o cliente ${cliente.nome} (${cliente.segmento}).

Canal: ${producao.canal}
Linha editorial: ${producao.linhaEditorial}

REGRAS IMPORTANTES:
- Você DEVE criar o gancho/título do post. O usuário forneceu o contexto, não o gancho.
- O conteúdo deve ser escrito do ponto de vista do cliente (como ${cliente.nome} fez/resolveu/entregou), nunca como conselho genérico.
- O gancho deve mostrar a capacidade do cliente, não ser instrucional.`

    if (producao.formato === 'carrossel') {
      instrucao += `
- O carrossel DEVE ter entre 5 e 7 slides completos.
- Slide 1: capa com gancho forte.
- Slides 2-6: desenvolvimento com continuidade narrativa. Cada slide puxa para o próximo.
- Último slide: CTA claro.
- Numere cada slide e escreva o texto completo de cada um.`
    }

    if (producao.formato === 'estatico') {
      instrucao += `
- Texto da arte: curto, de alto impacto, sem blocos extensos.
- Legenda: gancho forte na primeira linha, desenvolvimento que nutre o lead, CTA específico no final.
- A primeira linha da legenda NÃO pode repetir o texto da arte.`
    }
  }

  const skill = carregarSkill(producao.formato)
  const blocoSkill = skill
    ? `---\n\n## SKILL DE PRODUÇÃO (SIGA ESTAS INSTRUÇÕES À RISCA)\n\n${skill}\n\n`
    : ''

  const referencias = lerReferenciasCliente(producao.clienteId)
  let blocoReferencias = ''
  if (referencias.length > 0) {
    const exemplos = referencias.map((r, i) => `### Exemplo ${i + 1} (${r.formato})\n\n${r.legenda}`).join('\n\n---\n\n')
    blocoReferencias = `---

## POSTS APROVADOS COMO REFERÊNCIA (OBRIGATÓRIO SEGUIR)

Estes são posts reais aprovados pelo cliente. Eles definem o padrão de qualidade.

REGRA: O novo conteúdo DEVE replicar o mesmo padrão destes exemplos:
- Mesmo tom de voz (analise como os exemplos falam: formal, direto, provocativo, técnico?)
- Mesma estrutura (analise como os exemplos organizam a informação: gancho, desenvolvimento, CTA)
- Mesmo nível de profundidade (analise se os exemplos são densos ou leves)
- Mesma linguagem e vocabulário (use palavras e expressões similares às dos exemplos)
- Mesmo tamanho aproximado (se os exemplos têm 5 slides, faça 5 slides)

Se o conteúdo que você produzir não parecer escrito pela mesma pessoa que escreveu os exemplos abaixo, está ERRADO.

${exemplos}

`
  }

  const prompt = `${instrucao}

${blocoSkill}${blocoReferencias}---

## CONTEXTO FORNECIDO PELO USUÁRIO

${producao.tema}

${producao.referenciasExtras ? `## REFERÊNCIAS EXTRAS\n\n${producao.referenciasExtras}` : ''}

---

## BASE DE CONHECIMENTO DO CLIENTE

${contextoCliente}

${contextoFormato ? `---\n\n## REGRAS DO FORMATO (${nomeFormato[producao.formato] || producao.formato})\n\n${contextoFormato}` : ''}`

  producoes[idx].status = 'produzindo'
  producoes[idx].atualizadoEm = new Date().toISOString()
  salvarProducoes(producoes)

  res.json({ ok: true, message: 'Produção iniciada' })

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
    console.error('[produzir] Erro ao executar claude:', mensagem)
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
