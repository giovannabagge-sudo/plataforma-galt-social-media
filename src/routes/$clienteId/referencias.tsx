import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { fetchReferencias, salvarReferencia, deletarReferencia, type Referencia, type FotoRef } from '../../services/api'

export const Route = createFileRoute('/$clienteId/referencias')({
  component: TelaReferencias,
})

const FORMATOS = ['carrossel', 'estatico', 'stories', 'estrategia'] as const

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve({ base64, mediaType: file.type })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function NovoPost({ clienteId, onSalvo }: { clienteId: string; onSalvo: () => void }) {
  const [legenda, setLegenda] = useState('')
  const [formato, setFormato] = useState<string>('carrossel')
  const [fotos, setFotos] = useState<(FotoRef & { preview: string })[]>([])
  const [dragAtivo, setDragAtivo] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: salvarReferencia,
    onSuccess: () => {
      setLegenda('')
      setFormato('carrossel')
      fotos.forEach(f => URL.revokeObjectURL(f.preview))
      setFotos([])
      setErro('')
      onSalvo()
    },
    onError: (err) => setErro(err.message),
  })

  async function processarArquivos(files: FileList | File[]) {
    const novas: (FotoRef & { preview: string })[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 10 * 1024 * 1024) { setErro('Imagem muito grande (max 10MB)'); continue }
      const result = await fileToBase64(file)
      novas.push({ ...result, preview: URL.createObjectURL(file) })
    }
    if (novas.length > 0) {
      setFotos(prev => [...prev, ...novas])
      setErro('')
    }
  }

  function removerFoto(idx: number) {
    setFotos(prev => {
      const nova = [...prev]
      URL.revokeObjectURL(nova[idx].preview)
      nova.splice(idx, 1)
      return nova
    })
  }

  function submeter() {
    if (!legenda.trim()) { setErro('Escreva a legenda do post'); return }
    mutation.mutate({
      clienteId,
      legenda: legenda.trim(),
      formato,
      fotos: fotos.map(f => ({ base64: f.base64, mediaType: f.mediaType })),
    })
  }

  const btnStyle = (ativo: boolean) => ({
    padding: '6px 14px',
    background: ativo ? '#fff' : '#1a1a1a',
    color: ativo ? '#000' : '#888',
    border: '1px solid ' + (ativo ? '#fff' : '#333'),
    borderRadius: 6,
    cursor: 'pointer' as const,
    fontSize: 12,
    fontWeight: ativo ? 600 : 400,
  })

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Adicionar post aprovado</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Formato</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FORMATOS.map(f => (
            <button key={f} type="button" style={btnStyle(formato === f)} onClick={() => setFormato(f)}>
              {f === 'carrossel' ? 'Carrossel' : f === 'estatico' ? 'Estático' : f === 'stories' ? 'Stories' : 'Estratégia'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Imagens do post {fotos.length > 0 && <span style={{ color: '#666' }}>({fotos.length} {fotos.length === 1 ? 'imagem' : 'imagens'})</span>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={e => { if (e.target.files) processarArquivos(e.target.files); if (inputRef.current) inputRef.current.value = '' }}
          style={{ display: 'none' }}
        />

        {fotos.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {fotos.map((foto, i) => (
              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={foto.preview}
                  alt={`Slide ${i + 1}`}
                  style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #2a2a2a', display: 'block' }}
                />
                <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                  {i + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removerFoto(i)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.7)', border: '1px solid #555',
                    color: '#fff', width: 20, height: 20, borderRadius: '50%',
                    cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragAtivo(true) }}
          onDragLeave={() => setDragAtivo(false)}
          onDrop={e => { e.preventDefault(); setDragAtivo(false); if (e.dataTransfer.files.length) processarArquivos(e.dataTransfer.files) }}
          style={{
            border: '2px dashed ' + (dragAtivo ? '#fff' : '#333'),
            borderRadius: 8,
            padding: fotos.length > 0 ? '12px 16px' : '20px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragAtivo ? '#222' : 'transparent',
          }}
        >
          <div style={{ color: '#888', fontSize: 13 }}>
            {fotos.length > 0 ? '+ Adicionar mais imagens' : 'Clique ou arraste as imagens do post'}
          </div>
          {fotos.length === 0 && (
            <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>Selecione várias de uma vez ou adicione uma por uma</div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Legenda</div>
        <textarea
          value={legenda}
          onChange={e => { setLegenda(e.target.value); setErro('') }}
          placeholder="Cole aqui a legenda completa do post aprovado..."
          rows={6}
          style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#f0f0f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
        />
      </div>

      {erro && <div style={{ color: '#e55', fontSize: 12, marginBottom: 12 }}>{erro}</div>}

      <button
        onClick={submeter}
        disabled={mutation.isPending}
        style={{
          padding: '10px 24px',
          background: mutation.isPending ? '#333' : '#fff',
          color: mutation.isPending ? '#888' : '#000',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 14,
          cursor: mutation.isPending ? 'not-allowed' : 'pointer',
        }}
      >
        {mutation.isPending ? 'Salvando...' : 'Salvar referência'}
      </button>
    </div>
  )
}

function PostCard({ referencia, onDelete }: { referencia: Referencia; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fotos = referencia.fotos || []

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: '#222', color: '#aaa', textTransform: 'uppercase' }}>
            {referencia.formato}
          </span>
          {fotos.length > 0 && (
            <span style={{ fontSize: 11, color: '#555' }}>
              {fotos.length} {fotos.length === 1 ? 'imagem' : 'imagens'}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#555' }}>
            {new Date(referencia.criadoEm).toLocaleDateString('pt-BR')}
          </span>
        </div>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onDelete} style={{ padding: '3px 10px', background: '#e55', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
              Confirmar
            </button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: '3px 10px', background: '#333', color: '#aaa', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer' }}>
            Remover
          </button>
        )}
      </div>

      {fotos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
          {fotos.map((foto, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={`data:${foto.mediaType};base64,${foto.base64}`}
                alt={`Slide ${i + 1}`}
                style={{ height: 160, borderRadius: 8, display: 'block' }}
              />
              <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                {i + 1}/{fotos.length}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: '#ccc' }}>
        {referencia.legenda}
      </div>
    </div>
  )
}

export default function TelaReferencias() {
  const { clienteId } = useParams({ from: '/$clienteId/referencias' })
  const queryClient = useQueryClient()

  const { data: referencias, isLoading } = useQuery({
    queryKey: ['referencias', clienteId],
    queryFn: () => fetchReferencias(clienteId),
  })

  const deleteMutation = useMutation({
    mutationFn: deletarReferencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referencias', clienteId] })
    },
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Referências</h3>
        <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
          Posts aprovados que servem de referência para o Claude produzir conteúdo no tom certo.
        </p>
      </div>

      <NovoPost clienteId={clienteId} onSalvo={() => queryClient.invalidateQueries({ queryKey: ['referencias', clienteId] })} />

      {isLoading && <p style={{ color: '#666' }}>Carregando...</p>}

      {referencias && referencias.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#555', fontSize: 14 }}>
          Nenhuma referência ainda. Adicione posts aprovados acima.
        </div>
      )}

      {referencias && referencias.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {referencias.length} {referencias.length === 1 ? 'post' : 'posts'} salvos
          </div>
          {referencias.map((r, i) => (
            <div key={r.id}>
              <div style={{ fontSize: 12, color: '#555', fontWeight: 600, marginBottom: 6 }}>Post {String(i + 1).padStart(2, '0')}</div>
              <PostCard referencia={r} onDelete={() => deleteMutation.mutate(r.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
