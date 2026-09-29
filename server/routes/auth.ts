import { Router } from 'express'
import { login, logout, verificarToken, criarUsuario } from '../auth'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const { email, senha } = req.body
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha sao obrigatorios' })
  }

  const resultado = login(email, senha)
  if (!resultado) {
    return res.status(401).json({ erro: 'Email ou senha incorretos' })
  }

  res.json(resultado)
})

authRouter.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) logout(token)
  res.json({ ok: true })
})

authRouter.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ erro: 'Nao autenticado' })

  const usuario = verificarToken(token)
  if (!usuario) return res.status(401).json({ erro: 'Sessao expirada' })

  res.json(usuario)
})

authRouter.post('/criar-usuario', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ erro: 'Nao autenticado' })
  const admin = verificarToken(token)
  if (!admin) return res.status(401).json({ erro: 'Sessao expirada' })

  const { email, nome, senha } = req.body
  if (!email || !nome || !senha) {
    return res.status(400).json({ erro: 'Email, nome e senha sao obrigatorios' })
  }

  try {
    const usuario = criarUsuario(email, nome, senha)
    res.json(usuario)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar usuario'
    res.status(400).json({ erro: msg })
  }
})
