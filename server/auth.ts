import { randomUUID, scryptSync, timingSafeEqual } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { Request, Response, NextFunction } from 'express'

const __dirname = dirname(fileURLToPath(import.meta.url))
const USUARIOS_PATH = join(__dirname, 'data', 'usuarios.json')

export interface Usuario {
  id: string
  email: string
  nome: string
  senhaHash: string
  criadoEm: string
}

const sessions = new Map<string, { userId: string; email: string; nome: string }>()

function hashSenha(senha: string): string {
  const salt = randomUUID().replace(/-/g, '').slice(0, 16)
  const hash = scryptSync(senha, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

function verificarSenha(senha: string, senhaHash: string): boolean {
  const [salt, hash] = senhaHash.split(':')
  if (!salt || !hash) return false
  const hashTentativa = scryptSync(senha, salt, 32).toString('hex')
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashTentativa, 'hex'))
}

export function lerUsuarios(): Usuario[] {
  if (!existsSync(USUARIOS_PATH)) return []
  try {
    return JSON.parse(readFileSync(USUARIOS_PATH, 'utf-8'))
  } catch {
    return []
  }
}

function salvarUsuarios(usuarios: Usuario[]) {
  writeFileSync(USUARIOS_PATH, JSON.stringify(usuarios, null, 2))
}

export function criarUsuario(email: string, nome: string, senha: string): Omit<Usuario, 'senhaHash'> {
  const usuarios = lerUsuarios()
  if (usuarios.find(u => u.email === email)) {
    throw new Error('Email ja cadastrado')
  }
  const usuario: Usuario = {
    id: randomUUID(),
    email,
    nome,
    senhaHash: hashSenha(senha),
    criadoEm: new Date().toISOString(),
  }
  usuarios.push(usuario)
  salvarUsuarios(usuarios)
  const { senhaHash: _, ...safe } = usuario
  return safe
}

export function login(email: string, senha: string): { token: string; usuario: { id: string; email: string; nome: string } } | null {
  const usuarios = lerUsuarios()
  const usuario = usuarios.find(u => u.email === email)
  if (!usuario || !verificarSenha(senha, usuario.senhaHash)) return null

  const token = randomUUID()
  sessions.set(token, { userId: usuario.id, email: usuario.email, nome: usuario.nome })
  return { token, usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome } }
}

export function logout(token: string) {
  sessions.delete(token)
}

export function verificarToken(token: string) {
  return sessions.get(token) || null
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith('/api/auth')) return next()
  if (!req.path.startsWith('/api')) return next()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ erro: 'Nao autenticado' })

  const usuario = verificarToken(token)
  if (!usuario) return res.status(401).json({ erro: 'Sessao expirada' })

  next()
}

export function inicializarAdmin() {
  const usuarios = lerUsuarios()
  if (usuarios.length === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@agenciaasas.com'
    const senha = process.env.ADMIN_SENHA || 'asas2024'
    criarUsuario(email, 'Admin', senha)
    console.log('Usuario admin criado: ' + email + ' / ' + senha)
  }
}
