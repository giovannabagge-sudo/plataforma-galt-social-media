import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { loginApi, verificarSessao } from '../services/api'

function TelaLogin({ onLogin }: { onLogin: (nome: string) => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const res = await loginApi(email, senha)
      localStorage.setItem('asas_token', res.token)
      localStorage.setItem('asas_usuario', JSON.stringify(res.usuario))
      onLogin(res.usuario.nome)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#f0f0f0', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Plataforma Asas</div>
          <div style={{ color: '#666', fontSize: 14 }}>Faça login para continuar</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErro('') }}
            placeholder="seu@email.com"
            autoFocus
            style={{ width: '100%', padding: '12px 14px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#f0f0f0', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={e => { setSenha(e.target.value); setErro('') }}
            placeholder="Digite sua senha"
            style={{ width: '100%', padding: '12px 14px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#f0f0f0', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {erro && <div style={{ color: '#e55', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{erro}</div>}

        <button
          type="submit"
          disabled={carregando}
          style={{
            width: '100%',
            padding: '12px',
            background: carregando ? '#333' : '#fff',
            color: carregando ? '#888' : '#000',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 15,
            cursor: carregando ? 'not-allowed' : 'pointer',
          }}
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

function RootLayout() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null)
  const [nomeUsuario, setNomeUsuario] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('asas_token')
    if (!token) {
      setAutenticado(false)
      return
    }
    verificarSessao()
      .then(u => { setNomeUsuario(u.nome); setAutenticado(true) })
      .catch(() => {
        localStorage.removeItem('asas_token')
        localStorage.removeItem('asas_usuario')
        setAutenticado(false)
      })
  }, [])

  function handleLogout() {
    localStorage.removeItem('asas_token')
    localStorage.removeItem('asas_usuario')
    setAutenticado(false)
  }

  if (autenticado === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        Carregando...
      </div>
    )
  }

  if (!autenticado) {
    return <TelaLogin onLogin={(nome) => { setNomeUsuario(nome); setAutenticado(true) }} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#f0f0f0', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{
        padding: '16px 24px',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#111'
      }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: 16, color: '#fff', textDecoration: 'none', letterSpacing: '-0.3px' }}>
          Plataforma Asas
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#666' }}>{nomeUsuario}</span>
          <button
            onClick={handleLogout}
            style={{ padding: '6px 14px', background: 'none', border: '1px solid #333', color: '#888', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Sair
          </button>
        </div>
      </nav>
      <main style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
