import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BriefingSchema, type Briefing } from '../../schemas'
import { useProducaoStore } from '../../stores/producaoStore'
import { salvarBriefing } from '../../services/api'

export const Route = createFileRoute('/$clienteId/briefing')({
  component: TelaBriefing,
})

const LINHAS_POR_CLIENTE: Record<string, string[]> = {
  retrofit: [
    'Educação Técnica — Gestão Patrimonial',
    'Autoridade Técnica — Diagnóstico e Processo',
    'Prova Social — Cases e Resultados',
    'Institucional — Posicionamento e Cultura',
  ],
  galt: [
    'Educação — Marketing e Estratégia',
    'Cases e Resultados',
    'Bastidores e Processo',
    'Institucional',
  ],
}

const FORMATOS = ['carrossel', 'estatico', 'stories', 'estrategia'] as const
const CANAIS = ['Instagram', 'LinkedIn'] as const

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

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

export default function TelaBriefing() {
  const { clienteId } = useParams({ from: '/$clienteId/briefing' })
  const navigate = useNavigate()
  const setProducaoAtiva = useProducaoStore(s => s.setProducaoAtiva)

  const [form, setForm] = useState<Partial<Briefing>>({
    clienteId,
    formato: 'carrossel',
    canal: 'Instagram',
    linhaEditorial: '',
    tema: '',
    referenciasExtras: '',
  })
  const [erros, setErros] = useState<Record<string, string>>({})
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoBase64, setFotoBase64] = useState<string>('')
  const [fotoMediaType, setFotoMediaType] = useState<string>('')
  const [dragAtivo, setDragAtivo] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  const linhas = LINHAS_POR_CLIENTE[clienteId] || []

  const mutation = useMutation({
    mutationFn: salvarBriefing,
    onSuccess: (producao) => {
      setProducaoAtiva(producao)
      navigate({ to: '/$clienteId/producao', params: { clienteId } })
    },
  })

  function atualizar(campo: keyof Briefing, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }))
    setErros(e => ({ ...e, [campo]: '' }))
  }

  async function processarFoto(file: File) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      setErros(e => ({ ...e, foto: 'Imagem muito grande (max 10MB)' }))
      return
    }
    const result = await fileToBase64(file)
    setFotoBase64(result.base64)
    setFotoMediaType(result.mediaType)
    setFotoPreview(URL.createObjectURL(file))
    setErros(e => ({ ...e, foto: '' }))
  }

  function removerFoto() {
    setFotoBase64('')
    setFotoMediaType('')
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFotoPreview(null)
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    const isEstrategia = form.formato === 'estrategia'
    const dados = {
      ...form,
      canal: isEstrategia ? 'Instagram' as const : form.canal,
      linhaEditorial: isEstrategia ? 'estrategia' : form.linhaEditorial,
      fotoBase64: fotoBase64 || undefined,
      fotoMediaType: fotoMediaType || undefined,
    }
    const resultado = BriefingSchema.safeParse(dados)
    if (!resultado.success) {
      const novosErros: Record<string, string> = {}
      resultado.error.errors.forEach(err => {
        if (err.path[0]) novosErros[err.path[0] as string] = err.message
      })
      setErros(novosErros)
      return
    }
    mutation.mutate(resultado.data)
  }

  const btnStyle = (ativo: boolean) => ({
    padding: '10px 20px',
    background: ativo ? '#fff' : '#1a1a1a',
    color: ativo ? '#000' : '#888',
    border: '1px solid ' + (ativo ? '#fff' : '#333'),
    borderRadius: 8,
    cursor: 'pointer' as const,
    fontSize: 14,
    fontWeight: ativo ? 600 : 400,
  })

  return (
    <form onSubmit={submeter}>
      <Campo label="Formato">
        <div style={{ display: 'flex', gap: 8 }}>
          {FORMATOS.map(f => (
            <button key={f} type="button" style={btnStyle(form.formato === f)} onClick={() => atualizar('formato', f)}>
              {f === 'carrossel' ? '📋 Carrossel' : f === 'estatico' ? '🖼 Estático' : f === 'stories' ? '📱 Stories' : '💡 Estratégia'}
            </button>
          ))}
        </div>
      </Campo>

      {form.formato !== 'estrategia' && (
        <Campo label="Canal">
          <div style={{ display: 'flex', gap: 8 }}>
            {CANAIS.map(c => (
              <button key={c} type="button" style={btnStyle(form.canal === c)} onClick={() => atualizar('canal', c)}>{c}</button>
            ))}
          </div>
        </Campo>
      )}

      {form.formato !== 'estrategia' && (
        <Campo label="Linha Editorial">
          <select
            value={form.linhaEditorial}
            onChange={e => atualizar('linhaEditorial', e.target.value)}
            style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid ' + (erros.linhaEditorial ? '#e55' : '#333'), borderRadius: 8, color: '#f0f0f0', fontSize: 14 }}
          >
            <option value="">Selecione uma linha</option>
            {linhas.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {erros.linhaEditorial && <div style={{ color: '#e55', fontSize: 12, marginTop: 4 }}>{erros.linhaEditorial}</div>}
        </Campo>
      )}

      <Campo label={form.formato === 'estrategia' ? 'Contexto para ideias' : 'Contexto do post'}>
        <textarea
          value={form.tema}
          onChange={e => atualizar('tema', e.target.value)}
          placeholder={form.formato === 'estrategia'
            ? 'Ex: Preciso de ideias de posts para a próxima semana, foco em autoridade técnica'
            : 'Descreva o contexto: o que aconteceu, o projeto, o resultado. O gancho será criado pelo agente.\nEx: Fizemos um retrofit hospitalar e a operação não parou em nenhum momento'}
          rows={4}
          style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid ' + (erros.tema ? '#e55' : '#333'), borderRadius: 8, color: '#f0f0f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
        />
        {erros.tema && <div style={{ color: '#e55', fontSize: 12, marginTop: 4 }}>{erros.tema}</div>}
      </Campo>

      <Campo label="Foto de referência (opcional)">
        <input
          ref={inputFotoRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={e => { if (e.target.files?.[0]) processarFoto(e.target.files[0]) }}
          style={{ display: 'none' }}
        />
        {!fotoPreview ? (
          <div
            onClick={() => inputFotoRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragAtivo(true) }}
            onDragLeave={() => setDragAtivo(false)}
            onDrop={e => { e.preventDefault(); setDragAtivo(false); if (e.dataTransfer.files[0]) processarFoto(e.dataTransfer.files[0]) }}
            style={{
              border: '2px dashed ' + (dragAtivo ? '#fff' : '#333'),
              borderRadius: 10,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragAtivo ? '#1a1a1a' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>📷</div>
            <div style={{ color: '#888', fontSize: 14 }}>Clique ou arraste uma imagem aqui</div>
            <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>JPG, PNG, GIF ou WebP — max 10MB</div>
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={fotoPreview}
              alt="Referência"
              style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 10, border: '1px solid #2a2a2a', display: 'block' }}
            />
            <button
              type="button"
              onClick={removerFoto}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.7)', border: '1px solid #555',
                color: '#fff', width: 28, height: 28, borderRadius: '50%',
                cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        )}
        {erros.foto && <div style={{ color: '#e55', fontSize: 12, marginTop: 4 }}>{erros.foto}</div>}
      </Campo>

      <Campo label="Referências extras (opcional)">
        <textarea
          value={form.referenciasExtras}
          onChange={e => atualizar('referenciasExtras', e.target.value)}
          placeholder="Dado real, contexto do projeto, observações para o conteúdo..."
          rows={2}
          style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#f0f0f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
        />
      </Campo>

      {mutation.isError && (
        <div style={{ background: '#2a0f0f', border: '1px solid #e55', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#f88', fontSize: 14 }}>
          {mutation.error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        style={{ padding: '12px 28px', background: mutation.isPending ? '#333' : '#fff', color: mutation.isPending ? '#888' : '#000', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: mutation.isPending ? 'not-allowed' : 'pointer' }}
      >
        {mutation.isPending ? 'Salvando...' : form.formato === 'estrategia' ? 'Pedir ideias →' : 'Salvar briefing →'}
      </button>
    </form>
  )
}
