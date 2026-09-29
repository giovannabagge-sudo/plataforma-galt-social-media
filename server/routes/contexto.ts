import { Router } from 'express'
import { getCliente, lerArquivo, carregarContextoFormato, lerDocumentos } from '../vault'

export const contextoRouter = Router()

contextoRouter.get('/:clienteId', (req, res) => {
  const { clienteId } = req.params
  const formato = req.query.formato as string | undefined

  const cliente = getCliente(clienteId)
  if (!cliente) {
    return res.status(404).json({ erro: 'Cliente não encontrado' })
  }

  const documentos = lerDocumentos().filter(d => d.clienteId === clienteId)
  const docMaeUpload = documentos.find(d => d.tipo === 'doc-mae')
  const linguagemUpload = documentos.find(d => d.tipo === 'linguagem')
  const linhasUpload = documentos.find(d => d.tipo === 'linhas-editoriais')

  const docMae = docMaeUpload?.conteudo || (cliente.docMae ? lerArquivo(cliente.docMae) : '')
  const linhasEditoriais = linhasUpload?.conteudo || (cliente.linhasEditoriais ? lerArquivo(cliente.linhasEditoriais) : '')
  const frameworkEstrategico = lerArquivo('_Linhas Editoriais/00-framework-estrategico.md')
  const linguagemSemIA = linguagemUpload?.conteudo || lerArquivo('Linguagem sem IA.md')

  const resposta: Record<string, unknown> = {
    cliente: { id: cliente.id, nome: cliente.nome, segmento: cliente.segmento },
    docMae,
    linhasEditoriais,
    frameworkEstrategico,
    linguagemSemIA,
  }

  if (formato) {
    resposta.contextoFormato = carregarContextoFormato(formato)
  }

  res.json(resposta)
})
