import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProducoes, produzirConteudo } from '../../services/api'
import { useProducaoStore } from '../../stores/producaoStore'
import type { Producao } from '../../schemas'

export const Route = createFileRoute('/$clienteId/producao')({
  component: TelaProducao,
})

const STATUS_LABEL: Record<string, { texto: string; cor: string; bg: string }> = {
  pendente: { texto: 'Pendente', cor: '#f0c040', bg: '#2a2a0f' },
  produzindo: { texto: 'Produzindo...', cor: '#c090f0', bg: '#1a0f2a' },
  produzido: { texto: 'Produzido', cor: '#60b0f0', bg: '#0f1a2a' },
  revisado: { texto: 'Revisado', cor: '#6fda6f', bg: '#0f2a0f' },
  erro: { texto: 'Erro', cor: '#f06060', bg: '#2a0f0f' },
}

function formatarData(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function TelaProducao() {
  const { clienteId } = useParams({ from: '/$clienteId/producao' })
  const navigate = useNavigate()
  const setProducaoAtiva = useProducaoStore(s => s.setProducaoAtiva)
  const queryClient = useQueryClient()

  const { data: producoes, isLoading } = useQuery({
    queryKey: ['producoes', clienteId],
    queryFn: () => fetchProducoes(clienteId),
    refetchInterval: 5000,
  })

  const mutation = useMutation({
    mutationFn: produzirConteudo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producoes', clienteId] })
    },
  })

  function abrirProducao(p: Producao) {
    setProducaoAtiva(p)
    navigate({ to: '/$clienteId/revisao', params: { clienteId } })
  }

  function iniciarProducao(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    mutation.mutate(id)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Produções</h3>
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Briefings salvos e seus status. Atualiza automaticamente.</p>
        </div>
        <button
          onClick={() => navigate({ to: '/$clienteId/briefing', params: { clienteId } })}
          style={{ padding: '8px 18px', background: '#fff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          + Novo briefing
        </button>
      </div>

      {mutation.isError && (
        <div style={{ background: '#2a0f0f', border: '1px solid #e55', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#f88', fontSize: 14 }}>
          {mutation.error.message}
        </div>
      )}

      {isLoading && <p style={{ color: '#666' }}>Carregando...</p>}

      {producoes && producoes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
          <p>Nenhuma produção ainda.</p>
          <button
            onClick={() => navigate({ to: '/$clienteId/briefing', params: { clienteId } })}
            style={{ marginTop: 16, padding: '10px 20px', background: '#1a1a1a', border: '1px solid #333', color: '#888', borderRadius: 8, cursor: 'pointer' }}
          >
            Criar primeiro briefing
          </button>
        </div>
      )}

      {producoes && producoes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {producoes.map(p => {
            const st = STATUS_LABEL[p.status] || STATUS_LABEL.pendente
            return (
              <button
                key={p.id}
                onClick={() => abrirProducao(p)}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 10,
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#555')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.tema}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    {p.formato} · {p.canal} · {p.linhaEditorial} · {formatarData(p.criadoEm)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(p.status === 'pendente' || p.status === 'erro') && (
                    <span
                      onClick={e => iniciarProducao(e, p.id)}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '6px 14px',
                        borderRadius: 6,
                        background: '#fff',
                        color: '#000',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Produzir
                    </span>
                  )}
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: st.bg,
                    color: st.cor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}>
                    {st.texto}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
