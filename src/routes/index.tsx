import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchClientes, criarCliente } from '../services/api'
import { useProducaoStore } from '../stores/producaoStore'
import type { Cliente } from '../schemas'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: Home,
})

function ModalNovoCliente({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [nome, setNome] = useState('')
  const [segmento, setSegmento] = useState('')
  const [erro, setErro] = useState('')

  const mutation = useMutation({
    mutationFn: criarCliente,
    onSuccess: () => {
      onCriado()
      onFechar()
    },
    onError: (err) => setErro(err.message),
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={onFechar}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 32, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Novo cliente</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Nome do cliente</label>
          <input
            value={nome}
            onChange={e => { setNome(e.target.value); setErro('') }}
            placeholder="Ex: Retrofit Engenharia"
            autoFocus
            style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#f0f0f0', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Segmento</label>
          <input
            value={segmento}
            onChange={e => { setSegmento(e.target.value); setErro('') }}
            placeholder="Ex: Engenharia / Construção"
            style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#f0f0f0', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {erro && <div style={{ color: '#e55', fontSize: 13, marginBottom: 12 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onFechar} style={{ padding: '10px 20px', background: '#222', border: '1px solid #333', color: '#aaa', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!nome.trim()) { setErro('Nome é obrigatório'); return }
              if (!segmento.trim()) { setErro('Segmento é obrigatório'); return }
              mutation.mutate({ nome: nome.trim(), segmento: segmento.trim() })
            }}
            disabled={mutation.isPending}
            style={{
              padding: '10px 20px',
              background: mutation.isPending ? '#333' : '#fff',
              color: mutation.isPending ? '#888' : '#000',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {mutation.isPending ? 'Criando...' : 'Criar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Home() {
  const navigate = useNavigate()
  const setClienteAtivo = useProducaoStore(s => s.setClienteAtivo)
  const queryClient = useQueryClient()
  const { data: clientes, isLoading } = useQuery({ queryKey: ['clientes'], queryFn: fetchClientes })
  const [modalAberto, setModalAberto] = useState(false)

  function selecionarCliente(cliente: Cliente) {
    setClienteAtivo(cliente)
    navigate({ to: '/$clienteId/briefing', params: { clienteId: cliente.id } })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Clientes</h1>
          <p style={{ color: '#888' }}>Selecione o cliente para começar a produzir</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          style={{
            padding: '10px 20px',
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          + Adicionar cliente
        </button>
      </div>

      {isLoading && <p style={{ color: '#666' }}>Carregando...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {clientes?.map(cliente => (
          <button
            key={cliente.id}
            onClick={() => selecionarCliente(cliente)}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 12,
              padding: '24px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              color: '#f0f0f0',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#555')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
          >
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cliente.segmento}</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{cliente.nome}</div>
            <div style={{ marginTop: 16, fontSize: 13, color: '#555' }}>Produzir conteúdo →</div>
          </button>
        ))}
      </div>

      {modalAberto && (
        <ModalNovoCliente
          onFechar={() => setModalAberto(false)}
          onCriado={() => queryClient.invalidateQueries({ queryKey: ['clientes'] })}
        />
      )}
    </div>
  )
}
