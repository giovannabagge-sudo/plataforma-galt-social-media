import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

const VAULT = process.env.VAULT_PATH || ''
const DATA_DIR = path.join(import.meta.dirname, 'data')
const CLIENTES_FILE = path.join(DATA_DIR, 'clientes.json')
const DOCUMENTOS_FILE = path.join(DATA_DIR, 'documentos.json')

export interface ClienteData {
  id: string
  nome: string
  segmento: string
  docMae?: string
  linhasEditoriais?: string
  criadoEm: string
}

export interface Documento {
  id: string
  clienteId: string
  tipo: 'doc-mae' | 'linguagem' | 'linhas-editoriais' | 'outro'
  nome: string
  conteudo: string
  criadoEm: string
  atualizadoEm: string
}

const CLIENTES_SEED: ClienteData[] = [
  {
    id: 'galt',
    nome: 'Galt Growth Marketing',
    segmento: 'Marketing / Consultoria',
    docMae: '_Modelo de Cliente/Doc mãe do cliente/Galt Growth Marketing.md',
    linhasEditoriais: '_Linhas Editoriais/00-framework-estrategico.md',
    criadoEm: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'retrofit',
    nome: 'Retrofit Engenharia',
    segmento: 'Engenharia / Construção',
    docMae: '_Modelo de Cliente/Retrofit/doc-mae-retrofit.md',
    linhasEditoriais: '_Linhas Editoriais/linhas-engenharia.md',
    criadoEm: '2025-01-01T00:00:00.000Z',
  },
]

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function lerClientes(): ClienteData[] {
  try {
    return JSON.parse(fs.readFileSync(CLIENTES_FILE, 'utf-8'))
  } catch {
    ensureDataDir()
    fs.writeFileSync(CLIENTES_FILE, JSON.stringify(CLIENTES_SEED, null, 2))
    return CLIENTES_SEED
  }
}

export function salvarClientes(clientes: ClienteData[]) {
  ensureDataDir()
  fs.writeFileSync(CLIENTES_FILE, JSON.stringify(clientes, null, 2))
}

export function lerDocumentos(): Documento[] {
  try {
    return JSON.parse(fs.readFileSync(DOCUMENTOS_FILE, 'utf-8'))
  } catch {
    ensureDataDir()
    fs.writeFileSync(DOCUMENTOS_FILE, '[]')
    return []
  }
}

export function salvarDocumentos(docs: Documento[]) {
  ensureDataDir()
  fs.writeFileSync(DOCUMENTOS_FILE, JSON.stringify(docs, null, 2))
}

export function lerArquivo(caminho: string): string {
  try {
    return fs.readFileSync(path.join(VAULT, caminho), 'utf-8')
  } catch {
    return ''
  }
}

export function getCliente(id: string) {
  return lerClientes().find(c => c.id === id)
}

export function carregarContextoCliente(clienteId: string) {
  const cliente = getCliente(clienteId)
  if (!cliente) return ''

  const documentos = lerDocumentos().filter(d => d.clienteId === clienteId)
  const docMaeUpload = documentos.find(d => d.tipo === 'doc-mae')
  const linguagemUpload = documentos.find(d => d.tipo === 'linguagem')
  const linhasUpload = documentos.find(d => d.tipo === 'linhas-editoriais')
  const outros = documentos.filter(d => d.tipo === 'outro')

  const docMae = docMaeUpload?.conteudo || (cliente.docMae ? lerArquivo(cliente.docMae) : '')
  const linhas = linhasUpload?.conteudo || (cliente.linhasEditoriais ? lerArquivo(cliente.linhasEditoriais) : '')
  const framework = lerArquivo('_Linhas Editoriais/00-framework-estrategico.md')
  const linguagemSemIA = linguagemUpload?.conteudo || lerArquivo('Linguagem sem IA.md')

  const blocos = [
    '## DOC MÃE DO CLIENTE\n' + docMae,
    '## LINHAS EDITORIAIS\n' + linhas,
    '## FRAMEWORK ESTRATÉGICO\n' + framework,
    '## LINGUAGEM SEM IA\n' + linguagemSemIA,
  ]

  for (const doc of outros) {
    blocos.push(`## ${doc.nome.toUpperCase()}\n` + doc.conteudo)
  }

  return blocos.join('\n\n---\n\n')
}

export function carregarSkill(formato: string): string {
  const mapaSkill: Record<string, string> = {
    carrossel: '_Skills/carrossel-writing.md',
    estatico: '_Skills/carrossel-writing.md',
    stories: '_Skills/stories-writing.md',
    reels: '_Skills/reels-writing.md',
    estrategia: '_Skills/estrategia-and-editorias.md',
  }
  const arquivo = mapaSkill[formato]
  if (!arquivo) return ''

  const skill = lerArquivo(arquivo)
  const padroesProibidos = lerArquivo('_Skills/padroes-proibidos.md')

  return [skill, padroesProibidos].filter(Boolean).join('\n\n---\n\n')
}

export function carregarContextoFormato(formato: string) {
  const mapaFormato: Record<string, string[]> = {
    carrossel: [
      '_Formatos/Carrossel/Carrossel.md',
      '_Formatos/Carrossel/Linguagem.md',
      '_Formatos/Carrossel/Exemplos que performam.md',
    ],
    estatico: [
      '_Formatos/Estáticos/Estáticos.md',
      '_Formatos/Estáticos/Quando escolher o estático.md',
      '_Formatos/Legendas/O que precisa conter.md',
    ],
    stories: [
      '_Formatos/Legendas/O que precisa conter.md',
    ],
  }

  const arquivos = mapaFormato[formato] || []
  return arquivos
    .map(a => lerArquivo(a))
    .filter(Boolean)
    .join('\n\n---\n\n')
}
