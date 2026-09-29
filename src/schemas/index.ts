import { z } from 'zod'

export const ClienteSchema = z.object({
  id: z.string(),
  nome: z.string(),
  segmento: z.string(),
})
export type Cliente = z.infer<typeof ClienteSchema>

export const FormatoSchema = z.enum(['carrossel', 'estatico', 'stories', 'estrategia'])
export type Formato = z.infer<typeof FormatoSchema>

export const CanalSchema = z.enum(['Instagram', 'LinkedIn'])
export type Canal = z.infer<typeof CanalSchema>

export const BriefingSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  formato: FormatoSchema,
  canal: CanalSchema,
  linhaEditorial: z.string().min(1, 'Selecione uma linha editorial'),
  tema: z.string().min(10, 'Descreva o tema com pelo menos 10 caracteres'),
  referenciasExtras: z.string().optional(),
  fotoBase64: z.string().optional(),
  fotoMediaType: z.string().optional(),
})
export type Briefing = z.infer<typeof BriefingSchema>

export interface Producao {
  id: string
  clienteId: string
  formato: string
  canal: string
  linhaEditorial: string
  tema: string
  referenciasExtras?: string
  fotoBase64?: string
  fotoMediaType?: string
  output?: string
  veredito?: string
  status: 'pendente' | 'produzindo' | 'produzido' | 'revisado' | 'erro'
  criadoEm: string
  atualizadoEm: string
}
