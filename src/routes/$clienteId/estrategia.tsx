import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchDocumentos, salvarDocumento, uploadPdfDocumento, deletarDocumento, type DocumentoCliente } from '../../services/api'
import { useState, useRef } from 'react'

export const Route = createFileRoute('/$clienteId/estrategia')({
  component: TelaContexto,
})

const TIPOS_DOC = [
  { tipo: 'doc-mae', label: 'Doc Mãe', desc: 'Documento principal com dados estratégicos do cliente' },
  { tipo: 'linguagem', label: 'Linguagem sem IA', desc: 'Tom de voz, palavras proibidas e regras de escrita' },
  { tipo: 'linhas-editoriais', label: 'Linhas Editoriais', desc: 'Pilares de conteúdo e linhas editoriais do cliente' },
] as const

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function DocUploader({ clienteId, tipo, label, desc, docExistente, onSalvo }: {
  clienteId: string
  tipo: string
  label: string
  desc: string
  docExistente?: DocumentoCliente
  onSalvo: () => void
}) {
  const [conteudo, setConteudo] = useState(docExistente?.conteudo || '')
  const [editando, setEditando] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: () => salvarDocumento({ clienteId, tipo, nome: label, conteudo: conteudo.trim() }),
    onSuccess: () => {
      setEditando(false)
      setErro('')
      onSalvo()
    },
    onError: (err) => setErro(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletarDocumento(docExistente!.id),
    onSuccess: () => {
      setConteudo('')
      setEditando(false)
      setErro('')
      onSalvo()
    },
  })

  async function handleFile(file: File) {
    setErro('')
    if (file.type === 'application/pdf') {
      setUploading(true)
      try {
        const base64 = await readFileAsBase64(file)
        const doc = await uploadPdfDocumento({ clienteId, tipo, nome: label, pdfBase64: base64 })
        setConteudo(doc.conteudo)
        setEditando(false)
        onSalvo()
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao processar PDF')
      } finally {
        setUploading(false)
      }
    } else {
      const texto = await readFileAsText(file)
      setConteudo(texto)
      setEditando(true)
    }
  }

  const temConteudo = docExistente?.conteudo || conteudo.trim()

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 20, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{desc}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {docExistente && !editando && (
            <button
              onClick={() => { setConteudo(docExistente.conteudo); setEditando(true) }}
              style={{ padding: '5px 12px', background: '#222', border: '1px solid #333', color: '#aaa', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            >
              Editar
            </button>
          )}
          {docExistente && (
            <button
              onClick={() => { if (confirm('Remover este documento?')) deleteMutation.mutate() }}
              style={{ padding: '5px 12px', background: '#222', border: '1px solid #333', color: '#e55', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            >
              Remover
            </button>
          )}
        </div>
      </div>

      {docExistente && !editando ? (
        <div style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: 14,
          maxHeight: 200,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          fontSize: 13,
          lineHeight: 1.6,
          color: '#999',
          fontFamily: 'monospace',
        }}>
          {docExistente.conteudo.slice(0, 500)}{docExistente.conteudo.length > 500 ? '...' : ''}
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".md,.txt,.pdf,.doc,.docx"
            onChange={async e => { if (e.target.files?.[0]) await handleFile(e.target.files[0]); if (inputRef.current) inputRef.current.value = '' }}
            style={{ display: 'none' }}
          />

          {erro && <div style={{ color: '#e55', fontSize: 12, marginBottom: 8 }}>{erro}</div>}

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ padding: '6px 14px', background: '#222', border: '1px solid #333', color: uploading ? '#555' : '#aaa', borderRadius: 6, fontSize: 12, cursor: uploading ? 'not-allowed' : 'pointer' }}
            >
              {uploading ? 'Processando PDF...' : 'Enviar arquivo (.md, .txt, .pdf)'}
            </button>
            {!editando && !conteudo && (
              <button
                onClick={() => setEditando(true)}
                style={{ padding: '6px 14px', background: '#222', border: '1px solid #333', color: '#aaa', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
              >
                Escrever manualmente
              </button>
            )}
          </div>

          {(editando || conteudo) && (
            <>
              <textarea
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                placeholder="Cole ou escreva o conteúdo do documento aqui..."
                rows={8}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#111',
                  border: '1px solid #333',
                  borderRadius: 8,
                  color: '#f0f0f0',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  lineHeight: 1.6,
                  fontFamily: 'monospace',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={!conteudo.trim() || mutation.isPending}
                  style={{
                    padding: '8px 20px',
                    background: !conteudo.trim() || mutation.isPending ? '#333' : '#fff',
                    color: !conteudo.trim() || mutation.isPending ? '#888' : '#000',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: !conteudo.trim() || mutation.isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {mutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => { setEditando(false); setConteudo(docExistente?.conteudo || '') }}
                  style={{ padding: '8px 16px', background: '#222', border: '1px solid #333', color: '#aaa', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {docExistente && (
        <div style={{ fontSize: 11, color: '#444', marginTop: 8 }}>
          Atualizado em {new Date(docExistente.atualizadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}

function DocExtra({ clienteId, onSalvo }: { clienteId: string; onSalvo: () => void }) {
  const [nome, setNome] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [aberto, setAberto] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: () => salvarDocumento({ clienteId, tipo: 'outro', nome: nome.trim(), conteudo: conteudo.trim() }),
    onSuccess: () => {
      setNome('')
      setConteudo('')
      setAberto(false)
      setErro('')
      onSalvo()
    },
    onError: (err) => setErro(err.message),
  })

  async function handleFile(file: File) {
    setErro('')
    if (file.type === 'application/pdf') {
      if (!nome) setNome(file.name.replace(/\.[^.]+$/, ''))
      setUploading(true)
      try {
        const base64 = await readFileAsBase64(file)
        const doc = await uploadPdfDocumento({ clienteId, tipo: 'outro', nome: nome || file.name.replace(/\.[^.]+$/, ''), pdfBase64: base64 })
        setConteudo('')
        setNome('')
        setAberto(false)
        onSalvo()
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao processar PDF')
      } finally {
        setUploading(false)
      }
    } else {
      const texto = await readFileAsText(file)
      setConteudo(texto)
      if (!nome) setNome(file.name.replace(/\.[^.]+$/, ''))
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: 'transparent',
          border: '2px dashed #2a2a2a',
          borderRadius: 10,
          color: '#555',
          fontSize: 13,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        + Adicionar outro documento
      </button>
    )
  }

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 20, marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Novo documento</div>

      <input
        value={nome}
        onChange={e => setNome(e.target.value)}
        placeholder="Nome do documento (ex: Briefing Institucional, Tom de Voz...)"
        style={{ width: '100%', padding: '8px 12px', background: '#111', border: '1px solid #333', borderRadius: 6, color: '#f0f0f0', fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }}
      />

      <input
        ref={inputRef}
        type="file"
        accept=".md,.txt,.pdf,.doc,.docx"
        onChange={async e => { if (e.target.files?.[0]) await handleFile(e.target.files[0]); if (inputRef.current) inputRef.current.value = '' }}
        style={{ display: 'none' }}
      />

      {erro && <div style={{ color: '#e55', fontSize: 12, marginBottom: 8 }}>{erro}</div>}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ padding: '6px 14px', background: '#222', border: '1px solid #333', color: uploading ? '#555' : '#aaa', borderRadius: 6, fontSize: 12, cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: 10 }}
      >
        {uploading ? 'Processando PDF...' : 'Enviar arquivo (.md, .txt, .pdf)'}
      </button>

      <textarea
        value={conteudo}
        onChange={e => setConteudo(e.target.value)}
        placeholder="Cole ou escreva o conteúdo..."
        rows={6}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: '#111',
          border: '1px solid #333',
          borderRadius: 8,
          color: '#f0f0f0',
          fontSize: 13,
          resize: 'vertical',
          boxSizing: 'border-box',
          lineHeight: 1.6,
          fontFamily: 'monospace',
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => mutation.mutate()}
          disabled={!nome.trim() || !conteudo.trim() || mutation.isPending}
          style={{
            padding: '8px 20px',
            background: !nome.trim() || !conteudo.trim() || mutation.isPending ? '#333' : '#fff',
            color: !nome.trim() || !conteudo.trim() || mutation.isPending ? '#888' : '#000',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: !nome.trim() || !conteudo.trim() || mutation.isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={() => { setAberto(false); setNome(''); setConteudo('') }}
          style={{ padding: '8px 16px', background: '#222', border: '1px solid #333', color: '#aaa', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function DocExtraCard({ doc, onDeleted }: { doc: DocumentoCliente; onDeleted: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: () => deletarDocumento(doc.id),
    onSuccess: onDeleted,
  })

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{doc.nome}</div>
        <button
          onClick={() => { if (confirm('Remover este documento?')) deleteMutation.mutate() }}
          style={{ padding: '4px 10px', background: 'none', border: '1px solid #333', color: '#e55', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
        >
          Remover
        </button>
      </div>
      <div style={{
        background: '#111',
        border: '1px solid #2a2a2a',
        borderRadius: 8,
        padding: 12,
        maxHeight: 150,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        fontSize: 12,
        lineHeight: 1.5,
        color: '#888',
        fontFamily: 'monospace',
      }}>
        {doc.conteudo.slice(0, 400)}{doc.conteudo.length > 400 ? '...' : ''}
      </div>
      <div style={{ fontSize: 11, color: '#444', marginTop: 6 }}>
        {new Date(doc.atualizadoEm).toLocaleDateString('pt-BR')}
      </div>
    </div>
  )
}

interface ContextoVault {
  docMae: string
  linhasEditoriais: string
  frameworkEstrategico: string
  linguagemSemIA: string
}

function VaultPreview({ label, conteudo }: { label: string; conteudo: string }) {
  if (!conteudo) return null
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 20, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Carregado da vault (somente leitura)</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#555' }}>{conteudo.length} chars</span>
          <span style={{ fontSize: 10, padding: '3px 8px', background: '#1a2a1a', color: '#6a6', borderRadius: 4 }}>vault</span>
        </div>
      </div>
      <div style={{
        background: '#111',
        border: '1px solid #2a2a2a',
        borderRadius: 8,
        padding: 14,
        maxHeight: 400,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        fontSize: 13,
        lineHeight: 1.6,
        color: '#999',
        fontFamily: 'monospace',
      }}>
        {conteudo}
      </div>
    </div>
  )
}

export default function TelaContexto() {
  const { clienteId } = useParams({ from: '/$clienteId/estrategia' })
  const queryClient = useQueryClient()

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['documentos', clienteId],
    queryFn: () => fetchDocumentos(clienteId),
  })

  const { data: contextoVault } = useQuery<ContextoVault>({
    queryKey: ['contexto', clienteId],
    queryFn: async () => {
      const token = localStorage.getItem('asas_token')
      const res = await fetch(`/api/contexto/${clienteId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Erro')
      return res.json()
    },
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['documentos', clienteId] })
    queryClient.invalidateQueries({ queryKey: ['contexto', clienteId] })
  }

  const docsPorTipo = (tipo: string) => documentos?.find(d => d.tipo === tipo)
  const docsExtras = documentos?.filter(d => d.tipo === 'outro') || []

  const vaultMap: Record<string, string> = {
    'doc-mae': contextoVault?.docMae || '',
    'linguagem': contextoVault?.linguagemSemIA || '',
    'linhas-editoriais': contextoVault?.linhasEditoriais || '',
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Contexto do cliente</h3>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>
        Documentos que alimentam o Claude na produção de conteúdo. Envie arquivos ou cole o texto diretamente.
      </p>

      {isLoading && <p style={{ color: '#666' }}>Carregando...</p>}

      {TIPOS_DOC.map(({ tipo, label, desc }) => {
        const docEnviado = docsPorTipo(tipo)
        const conteudoVault = vaultMap[tipo]

        if (docEnviado) {
          return (
            <DocUploader
              key={tipo}
              clienteId={clienteId}
              tipo={tipo}
              label={label}
              desc={desc}
              docExistente={docEnviado}
              onSalvo={refresh}
            />
          )
        }

        if (conteudoVault) {
          return <VaultPreview key={tipo} label={label} conteudo={conteudoVault} />
        }

        return (
          <DocUploader
            key={tipo}
            clienteId={clienteId}
            tipo={tipo}
            label={label}
            desc={desc}
            onSalvo={refresh}
          />
        )
      })}

      {docsExtras.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Documentos adicionais</div>
          {docsExtras.map(doc => (
            <DocExtraCard key={doc.id} doc={doc} onDeleted={refresh} />
          ))}
        </div>
      )}

      <DocExtra clienteId={clienteId} onSalvo={refresh} />
    </div>
  )
}
