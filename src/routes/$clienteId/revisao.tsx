import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProducaoStore } from '../../stores/producaoStore'
import { fetchProducao, produzirConteudo, corrigirConteudo } from '../../services/api'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/$clienteId/revisao')({
  component: TelaRevisao,
})

function copiarTexto(texto: string) {
  navigator.clipboard.writeText(texto)
    .then(() => alert('Copiado!'))
    .catch(() => alert('Copie manualmente.'))
}

export default function TelaRevisao() {
  const { clienteId } = useParams({ from: '/$clienteId/revisao' })
  const navigate = useNavigate()
  const producaoStore = useProducaoStore(s => s.producaoAtiva)
  const setProducaoAtiva = useProducaoStore(s => s.setProducaoAtiva)
  const queryClient = useQueryClient()

  const { data: producaoAtualizada } = useQuery({
    queryKey: ['producao', producaoStore?.id],
    queryFn: () => fetchProducao(producaoStore!.id),
    enabled: !!producaoStore?.id,
    refetchInterval: producaoStore?.status === 'produzindo' ? 3000 : false,
  })

  const producao = producaoAtualizada || producaoStore

  useEffect(() => {
    if (producaoAtualizada && producaoAtualizada.status !== producaoStore?.status) {
      setProducaoAtiva(producaoAtualizada)
    }
  }, [producaoAtualizada, producaoStore?.status, setProducaoAtiva])

  const [correcao, setCorrecao] = useState('')

  const mutation = useMutation({
    mutationFn: produzirConteudo,
    onSuccess: () => {
      if (producao) setProducaoAtiva({ ...producao, status: 'produzindo' })
      queryClient.invalidateQueries({ queryKey: ['producao', producao?.id] })
      queryClient.invalidateQueries({ queryKey: ['producoes', clienteId] })
    },
  })

  const correcaoMutation = useMutation({
    mutationFn: ({ id, instrucao }: { id: string; instrucao: string }) => corrigirConteudo(id, instrucao),
    onSuccess: () => {
      setCorrecao('')
      if (producao) setProducaoAtiva({ ...producao, status: 'produzindo' })
      queryClient.invalidateQueries({ queryKey: ['producao', producao?.id] })
      queryClient.invalidateQueries({ queryKey: ['producoes', clienteId] })
    },
  })

  if (!producao) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#666' }}>
        <p>Nenhuma produção selecionada.</p>
        <button
          onClick={() => navigate({ to: '/$clienteId/producao', params: { clienteId } })}
          style={{ marginTop: 16, padding: '10px 20px', background: '#1a1a1a', border: '1px solid #333', color: '#888', borderRadius: 8, cursor: 'pointer' }}
        >
          ← Voltar às produções
        </button>
      </div>
    )
  }

  const aprovado = producao.veredito?.includes('APROVADO')

  return (
    <div>
      <button
        onClick={() => navigate({ to: '/$clienteId/producao', params: { clienteId } })}
        style={{ background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20 }}
      >
        ← Voltar às produções
      </button>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '20px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Briefing</div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>{producao.tema}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#888' }}>
          <span style={{ background: '#222', padding: '3px 10px', borderRadius: 6 }}>{producao.formato}</span>
          <span style={{ background: '#222', padding: '3px 10px', borderRadius: 6 }}>{producao.canal}</span>
          <span style={{ background: '#222', padding: '3px 10px', borderRadius: 6 }}>{producao.linhaEditorial}</span>
          <span style={{ background: '#222', padding: '3px 10px', borderRadius: 6 }}>{producao.status}</span>
        </div>
        {producao.referenciasExtras && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#999' }}>
            <strong style={{ color: '#888' }}>Refs:</strong> {producao.referenciasExtras}
          </div>
        )}
      </div>

      {mutation.isError && (
        <div style={{ background: '#2a0f0f', border: '1px solid #e55', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#f88', fontSize: 14 }}>
          {mutation.error.message}
        </div>
      )}

      {producao.status === 'erro' ? (
        <div style={{
          background: '#2a0f0f',
          border: '1px solid #6a2a2a',
          borderRadius: 10,
          padding: '32px 20px',
          textAlign: 'center',
          color: '#f06060',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Erro ao produzir conteúdo</div>
          <div style={{ fontSize: 12, color: '#aa6060', marginTop: 4, maxWidth: 400, margin: '4px auto 0' }}>
            {producao.output?.replace('ERRO: ', '') || 'Erro desconhecido'}
          </div>
          <button
            onClick={() => mutation.mutate(producao.id)}
            disabled={mutation.isPending}
            style={{
              marginTop: 16,
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
            {mutation.isPending ? 'Iniciando...' : 'Tentar novamente'}
          </button>
        </div>
      ) : producao.output && producao.status !== 'pendente' ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output gerado</div>
            <button
              onClick={() => copiarTexto(producao.output!)}
              style={{ padding: '4px 12px', background: '#1a1a1a', border: '1px solid #333', color: '#aaa', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            >
              Copiar
            </button>
          </div>
          <div style={{
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: '16px',
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.7,
            color: '#e8e8e8',
            fontFamily: 'monospace',
          }}>
            {producao.output}
          </div>

          <div style={{ marginTop: 16, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Correção</div>
            <textarea
              value={correcao}
              onChange={e => setCorrecao(e.target.value)}
              placeholder="Descreva o que precisa corrigir. Ex: o gancho está fraco, troque por algo mais direto. O slide 3 está genérico, fale do caso X."
              rows={3}
              style={{
                width: '100%',
                background: '#111',
                border: '1px solid #333',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#ddd',
                fontSize: 14,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            {correcaoMutation.isError && (
              <div style={{ color: '#f88', fontSize: 13, marginTop: 6 }}>{correcaoMutation.error.message}</div>
            )}
            <button
              onClick={() => producao && correcaoMutation.mutate({ id: producao.id, instrucao: correcao })}
              disabled={!correcao.trim() || correcaoMutation.isPending}
              style={{
                marginTop: 10,
                padding: '10px 24px',
                background: !correcao.trim() || correcaoMutation.isPending ? '#333' : '#fff',
                color: !correcao.trim() || correcaoMutation.isPending ? '#888' : '#000',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: !correcao.trim() || correcaoMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {correcaoMutation.isPending ? 'Corrigindo...' : 'Corrigir'}
            </button>
          </div>
        </div>
      ) : producao.status === 'produzindo' ? (
        <div style={{
          background: '#1a0f2a',
          border: '1px solid #4a3a6a',
          borderRadius: 10,
          padding: '32px 20px',
          textAlign: 'center',
          color: '#c090f0',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Claude está produzindo o conteúdo...</div>
          <div style={{ fontSize: 12, color: '#8a6aaa', marginTop: 4 }}>Isso pode levar alguns segundos. A página atualiza automaticamente.</div>
        </div>
      ) : (
        <div style={{
          background: '#1a1a0f',
          border: '1px solid #333',
          borderRadius: 10,
          padding: '32px 20px',
          textAlign: 'center',
          color: '#888',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>⏳</div>
          <div style={{ fontSize: 14 }}>Aguardando produção</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>Clique abaixo para gerar o conteúdo com Claude</div>
          <button
            onClick={() => mutation.mutate(producao.id)}
            disabled={mutation.isPending}
            style={{
              marginTop: 16,
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
            {mutation.isPending ? 'Iniciando...' : 'Produzir conteúdo'}
          </button>
        </div>
      )}

      {producao.veredito && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: 8,
            background: aprovado ? '#0f2a0f' : '#2a0f0f',
            border: '1px solid ' + (aprovado ? '#2a6a2a' : '#6a2a2a'),
            color: aprovado ? '#6fda6f' : '#da6f6f',
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 12,
          }}>
            {aprovado ? 'APROVADO' : 'REPROVADO'}
          </div>
          <div style={{
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: '16px',
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.7,
            color: '#ccc',
          }}>
            {producao.veredito}
          </div>
        </div>
      )}
    </div>
  )
}
