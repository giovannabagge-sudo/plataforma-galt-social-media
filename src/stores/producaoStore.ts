import { create } from 'zustand'
import type { Cliente, Producao } from '../schemas'

interface ProducaoState {
  clienteAtivo: Cliente | null
  producaoAtiva: Producao | null

  setClienteAtivo: (cliente: Cliente) => void
  setProducaoAtiva: (producao: Producao | null) => void
}

export const useProducaoStore = create<ProducaoState>((set) => ({
  clienteAtivo: null,
  producaoAtiva: null,

  setClienteAtivo: (cliente) => set({ clienteAtivo: cliente }),
  setProducaoAtiva: (producao) => set({ producaoAtiva: producao }),
}))
