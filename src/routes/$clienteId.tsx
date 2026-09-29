import { createFileRoute, Outlet, Link, useParams } from '@tanstack/react-router'
import { useProducaoStore } from '../stores/producaoStore'

export const Route = createFileRoute('/$clienteId')({
  component: ClienteLayout,
})

function ClienteLayout() {
  const { clienteId } = useParams({ from: '/$clienteId' })
  const cliente = useProducaoStore(s => s.clienteAtivo)

  const navItems = [
    { to: '/$clienteId/briefing', label: 'Estratégia' },
    { to: '/$clienteId/producao', label: 'Produções' },
    { to: '/$clienteId/revisao', label: 'Detalhes' },
    { to: '/$clienteId/referencias', label: 'Referências' },
    { to: '/$clienteId/estrategia', label: 'Contexto' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Link to="/" style={{ color: '#555', fontSize: 13, textDecoration: 'none' }}>← Todos os clientes</Link>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{cliente?.nome || clienteId}</h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #222', marginBottom: 32 }}>
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            params={{ clienteId }}
            style={{ padding: '10px 16px', fontSize: 13, textDecoration: 'none', color: '#666', borderBottom: '2px solid transparent' }}
            activeProps={{ style: { color: '#fff', borderBottom: '2px solid #fff' } }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
