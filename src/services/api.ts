import type { Briefing, Cliente, Producao } from '../schemas'

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('asas_token')
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

function handleAuth(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('asas_token')
    localStorage.removeItem('asas_usuario')
    window.location.reload()
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  handleAuth(res)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.erro || 'Erro na requisição')
  }
  return res.json()
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  handleAuth(res)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.erro || 'Erro na requisição')
  }
  return res.json()
}

async function authGet(path: string): Promise<Response> {
  const res = await fetch(path, { headers: authHeaders() })
  handleAuth(res)
  return res
}

export async function fetchClientes(): Promise<Cliente[]> {
  const res = await authGet('/api/clientes')
  if (!res.ok) throw new Error('Erro ao carregar clientes')
  return res.json()
}

export async function salvarBriefing(briefing: Briefing): Promise<Producao> {
  return post('/api/producoes', briefing)
}

export async function fetchProducoes(clienteId: string): Promise<Producao[]> {
  const res = await authGet(`/api/producoes/${clienteId}`)
  if (!res.ok) throw new Error('Erro ao carregar produções')
  return res.json()
}

export async function fetchProducao(id: string): Promise<Producao> {
  const res = await authGet(`/api/producoes/item/${id}`)
  if (!res.ok) throw new Error('Produção não encontrada')
  return res.json()
}

export async function atualizarProducao(id: string, dados: Partial<Pick<Producao, 'output' | 'veredito' | 'status'>>): Promise<Producao> {
  return patch(`/api/producoes/${id}`, dados)
}

export async function produzirConteudo(id: string): Promise<{ ok: boolean; message: string }> {
  return post(`/api/produzir/${id}`, {})
}

export async function corrigirConteudo(id: string, instrucao: string): Promise<{ ok: boolean; message: string }> {
  return post(`/api/corrigir/${id}`, { instrucao })
}

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

export async function fetchReferencias(clienteId: string): Promise<Referencia[]> {
  const res = await authGet(`/api/referencias/${clienteId}`)
  if (!res.ok) throw new Error('Erro ao carregar referências')
  return res.json()
}

export async function salvarReferencia(dados: { clienteId: string; legenda: string; formato: string; fotos: FotoRef[] }): Promise<Referencia> {
  return post('/api/referencias', dados)
}

export async function deletarReferencia(id: string): Promise<void> {
  const res = await fetch(`/api/referencias/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error('Erro ao deletar referência')
}

export async function criarCliente(dados: { nome: string; segmento: string }): Promise<Cliente> {
  return post('/api/clientes', dados)
}

export async function deletarCliente(id: string): Promise<void> {
  const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error('Erro ao deletar cliente')
}

export interface DocumentoCliente {
  id: string
  clienteId: string
  tipo: 'doc-mae' | 'linguagem' | 'linhas-editoriais' | 'outro'
  nome: string
  conteudo: string
  criadoEm: string
  atualizadoEm: string
}

export async function fetchDocumentos(clienteId: string): Promise<DocumentoCliente[]> {
  const res = await authGet(`/api/documentos/${clienteId}`)
  if (!res.ok) throw new Error('Erro ao carregar documentos')
  return res.json()
}

export async function salvarDocumento(dados: { clienteId: string; tipo: string; nome: string; conteudo: string }): Promise<DocumentoCliente> {
  return post('/api/documentos', dados)
}

export async function uploadPdfDocumento(dados: { clienteId: string; tipo: string; nome: string; pdfBase64: string }): Promise<DocumentoCliente> {
  return post('/api/documentos/upload-pdf', dados)
}

export async function atualizarDocumento(id: string, dados: { nome?: string; conteudo?: string }): Promise<DocumentoCliente> {
  const res = await fetch(`/api/documentos/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(dados),
  })
  if (!res.ok) throw new Error('Erro ao atualizar documento')
  return res.json()
}

export async function deletarDocumento(id: string): Promise<void> {
  const res = await fetch(`/api/documentos/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error('Erro ao deletar documento')
}

export async function loginApi(email: string, senha: string): Promise<{ token: string; usuario: { id: string; email: string; nome: string } }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.erro || 'Erro ao fazer login')
  }
  return res.json()
}

export async function verificarSessao(): Promise<{ userId: string; email: string; nome: string }> {
  const token = localStorage.getItem('asas_token')
  if (!token) throw new Error('Sem token')
  const res = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Sessao invalida')
  return res.json()
}
