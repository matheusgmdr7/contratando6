"use client"

import { useState, useEffect } from "react"
import { buscarPropostas, atualizarStatusProposta } from "@/services/propostas-service-unificado"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, CheckCircle, XCircle, Search, Filter, RefreshCw } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"

export default function EmAnalisePage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [origemFiltro, setOrigemFiltro] = useState("todas")
  const [propostaDetalhada, setPropostaDetalhada] = useState<any>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState("")
  const [showModalRejeicao, setShowModalRejeicao] = useState(false)
  const [showModalDetalhes, setShowModalDetalhes] = useState(false)
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(25)

  useEffect(() => {
    carregarPropostas()
  }, [])

  async function carregarPropostas() {
    try {
      setLoading(true)
      console.log("🔄 Carregando propostas em análise...")
      const data = await buscarPropostas()
      // Filtrar apenas propostas com status "pendente"
      const propostasEmAnalise = data.filter((p: any) => p.status === "pendente")
      console.log("📊 Propostas em análise:", propostasEmAnalise.length)
      setPropostas(propostasEmAnalise)
    } catch (error: any) {
      console.error("❌ Erro ao carregar propostas:", error)
      toast.error("Erro ao carregar propostas")
    } finally {
      setLoading(false)
    }
  }

  async function aprovarProposta(id: string) {
    try {
      await atualizarStatusProposta(id, "aprovada")
      toast.success("Proposta aprovada com sucesso!")
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao aprovar proposta:", error)
      toast.error("Erro ao aprovar proposta")
    }
  }

  async function rejeitarProposta() {
    if (!propostaDetalhada) return

    try {
      await atualizarStatusProposta(propostaDetalhada.id, "rejeitada", motivoRejeicao)
      toast.success("Proposta rejeitada com sucesso!")
      setShowModalRejeicao(false)
      setMotivoRejeicao("")
      setPropostaDetalhada(null)
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao rejeitar proposta:", error)
      toast.error("Erro ao rejeitar proposta")
    }
  }

  function abrirModalRejeicao(proposta: any) {
    setPropostaDetalhada(proposta)
    setShowModalRejeicao(true)
  }

  async function abrirModalDetalhes(proposta: any) {
    setPropostaDetalhada(proposta)
    setShowModalDetalhes(true)
    await carregarDetalhesCompletos(proposta)
  }

  async function carregarDetalhesCompletos(proposta: any) {
    try {
      setLoadingDetalhes(true)
      // Aqui você pode carregar detalhes adicionais se necessário
      // Por enquanto, vamos usar os dados básicos da proposta
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error)
      toast.error("Erro ao carregar detalhes da proposta")
    } finally {
      setLoadingDetalhes(false)
    }
  }

  function obterNomeCliente(proposta: any) {
    if (proposta.origem === "propostas") {
      return proposta.nome_cliente || proposta.nome || "Nome não informado"
    } else {
      return proposta.cliente || proposta.nome_cliente || "Nome não informado"
    }
  }

  function obterEmailCliente(proposta: any) {
    if (proposta.origem === "propostas") {
      return proposta.email || "Email não informado"
    } else {
      return proposta.email_cliente || proposta.email || "Email não informado"
    }
  }

  // Função para exibir badge de status (igual à /propostas)
  function getStatusBadge(status: any) {
    const statusConfig = {
      parcial: { label: "Aguardando Validação", color: "bg-blue-50 text-blue-700 border border-blue-200" },
      aguardando_cliente: {
        label: "Aguardando Cliente",
        color: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      },
      pendente: { label: "Aguardando Análise", color: "bg-amber-50 text-amber-700 border border-amber-200" },
      aprovada: { label: "Aprovada", color: "bg-green-50 text-green-700 border border-green-200" },
      rejeitada: { label: "Rejeitada", color: "bg-red-50 text-red-700 border border-red-200" },
    }

    return statusConfig[status as keyof typeof statusConfig] || { label: status, color: "bg-gray-50 text-gray-700 border border-gray-200" }
  }

  // Função para exibir badge de origem (igual à /propostas)
  function getOrigemBadge(origem: any) {
    const origemConfig = {
      propostas: { label: "Cliente Direto", color: "bg-slate-50 text-slate-700 border border-slate-200" },
      propostas_corretores: { label: "Via Corretor", color: "bg-gray-50 text-gray-700 border border-gray-200" },
    }

    return origemConfig[origem as keyof typeof origemConfig] || { label: origem, color: "bg-gray-50 text-gray-700 border border-gray-200" }
  }

  // Função para parsear dependentes igual à página de propostas
  function parseDependentes(proposta: any) {
    let dependentesArr: any[] = []
    if (proposta.dependentes_dados && Array.isArray(proposta.dependentes_dados) && proposta.dependentes_dados.length > 0) {
      dependentesArr = proposta.dependentes_dados
    } else if (typeof proposta.dependentes === "string" && proposta.dependentes && proposta.dependentes.length > 0) {
      try {
        dependentesArr = JSON.parse(proposta.dependentes)
      } catch {}
    } else if (Array.isArray(proposta.dependentes) && proposta.dependentes && proposta.dependentes.length > 0) {
      dependentesArr = proposta.dependentes
    }
    return dependentesArr
  }

  // Função para calcular valor total mensal (titular + dependentes)
  function calcularValorTotalMensal(proposta: any) {
    let total = 0
    let valorTitular = proposta.valor_mensal || proposta.valor || proposta.valor_total || 0
    if (typeof valorTitular !== "number") {
      valorTitular = String(valorTitular).replace(/[^\d,\.]/g, "").replace(",", ".")
      valorTitular = Number.parseFloat(valorTitular)
    }
    if (!isNaN(valorTitular) && valorTitular > 0) {
      total += valorTitular
    }
    const dependentesArr = parseDependentes(proposta)
    if (dependentesArr && dependentesArr.length > 0) {
      dependentesArr.forEach((dep: any) => {
        let valorDep = dep.valor_individual || dep.valor || dep.valor_plano || 0
        if (typeof valorDep !== "number") {
          valorDep = String(valorDep).replace(/[^\d,\.]/g, "").replace(",", ".")
          valorDep = Number.parseFloat(valorDep)
        }
        if (!isNaN(valorDep) && valorDep > 0) {
          total += valorDep
        }
      })
    }
    return total
  }

  function formatarDataSegura(dataString: any) {
    if (!dataString) return "N/A"
    try {
      const data = new Date(dataString)
      if (isNaN(data.getTime())) {
        return "Data inválida"
      }
      return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      return "Erro na data"
    }
  }

  function formatarHoraSegura(dataString: any) {
    if (!dataString) return "N/A"
    try {
      const data = new Date(dataString)
      if (isNaN(data.getTime())) {
        return "Hora inválida"
      }
      return data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "Erro na hora"
    }
  }

  const propostasFiltradas = propostas.filter((proposta) => {
    const nomeCliente = obterNomeCliente(proposta).toLowerCase()
    const emailCliente = obterEmailCliente(proposta).toLowerCase()
    const matchesFiltro = nomeCliente.includes(filtro.toLowerCase()) || emailCliente.includes(filtro.toLowerCase())
    const matchesOrigem = origemFiltro === "todas" || proposta.origem === origemFiltro

    return matchesFiltro && matchesOrigem
  })

  // Cálculos de paginação
  const totalItens = propostasFiltradas.length
  const totalPaginas = Math.ceil(totalItens / itensPorPagina)
  const indiceInicio = (paginaAtual - 1) * itensPorPagina
  const indiceFim = indiceInicio + itensPorPagina
  const propostasExibidas = propostasFiltradas.slice(indiceInicio, indiceFim)

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPaginaAtual(1)
  }, [filtro, origemFiltro])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Propostas Em Análise</h1>
        <button
          onClick={carregarPropostas}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar Lista
        </button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-gray-900">{propostas.length}</div>
          <div className="text-xs text-gray-600">Total em Análise</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-gray-700">
            {propostas.filter((p) => p.origem === "propostas").length}
          </div>
          <div className="text-xs text-gray-600">Clientes Diretos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-gray-700">
            {propostas.filter((p) => p.origem === "propostas_corretores").length}
          </div>
          <div className="text-xs text-gray-600">Via Corretores</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
            <Input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Nome ou email..."
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Origem</label>
            <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="propostas">Clientes Diretos</SelectItem>
                <SelectItem value="propostas_corretores">Via Corretores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista de Propostas */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Propostas em Análise</h2>
            <div className="text-sm text-gray-600">
              Mostrando {indiceInicio + 1}-{Math.min(indiceFim, totalItens)} de {totalItens} propostas
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origem/Status
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor/Data
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {propostasExibidas.map((proposta) => {
                // Configurações de status e origem (igual à /propostas)
                const statusConfig = getStatusBadge(proposta.status)
                const origemConfig = getOrigemBadge(proposta.origem)
                return (
                  <tr key={proposta.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900" title={obterNomeCliente(proposta)}>
                        {obterNomeCliente(proposta)}
                      </div>
                      <div className="text-xs text-gray-500">ID: {proposta.id}</div>
                      {(proposta.produto_nome || proposta.produto) && (
                        <div className="text-xs text-gray-600 mt-1">Produto: {proposta.produto_nome || proposta.produto}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-900" title={obterEmailCliente(proposta)}>
                        {obterEmailCliente(proposta)}
                      </div>
                      <div className="text-xs text-gray-500" title={proposta.telefone || proposta.celular}>
                        {proposta.telefone || proposta.celular || "Telefone não informado"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${origemConfig.color}`}
                        >
                          {origemConfig.label}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500" title={proposta.corretor_nome ? `Corretor: ${proposta.corretor_nome}` : "Envio Direto"}>
                        {proposta.corretor_nome ? (
                          <span className="text-gray-900 font-normal">{proposta.corretor_nome}</span>
                        ) : (
                          <span className="text-gray-400">Envio Direto</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {typeof calcularValorTotalMensal === 'function'
                          ? `R$ ${calcularValorTotalMensal(proposta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : (proposta.valor ? formatarMoeda(proposta.valor) : "Valor não informado")}
                      </div>
                      <div className="text-xs text-gray-500">{typeof formatarDataSegura === 'function' ? formatarDataSegura(proposta.created_at) : new Date(proposta.created_at).toLocaleDateString("pt-BR")}</div>
                      <div className="text-xs text-gray-500">{typeof formatarHoraSegura === 'function' ? formatarHoraSegura(proposta.created_at) : new Date(proposta.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => abrirModalDetalhes(proposta)}
                          className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs transition-colors"
                        >
                          Ver
                        </button>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => aprovarProposta(proposta.id)}
                            className="text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition-colors text-xs flex-1"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => abrirModalRejeicao(proposta)}
                            className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors text-xs flex-1"
                          >
                            Reprovar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {propostasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Nenhuma proposta em análise encontrada</div>
            <div className="text-gray-400 text-sm mt-2">
              {filtro || origemFiltro !== "todas"
                ? "Tente ajustar os filtros de busca"
                : "Todas as propostas foram analisadas"}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Rejeição */}
      {showModalRejeicao && propostaDetalhada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Rejeitar Proposta</h3>
            <p className="text-gray-600 mb-4">
              Tem certeza que deseja rejeitar a proposta de <strong>{obterNomeCliente(propostaDetalhada)}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da Rejeição</label>
              <textarea
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                placeholder="Informe o motivo da rejeição..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModalRejeicao(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={rejeitarProposta}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showModalDetalhes && propostaDetalhada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-900">Detalhes da Proposta</h2>
                <button
                  onClick={() => setShowModalDetalhes(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {loadingDetalhes ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Dados do Cliente */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Dados do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Nome</label>
                          <p className="text-gray-900">{obterNomeCliente(propostaDetalhada)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Email</label>
                          <p className="text-gray-900">{obterEmailCliente(propostaDetalhada)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Telefone</label>
                          <p className="text-gray-900">
                            {propostaDetalhada.telefone || propostaDetalhada.celular || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Valor</label>
                          <p className="text-gray-900">
                            {propostaDetalhada.valor ? formatarMoeda(propostaDetalhada.valor) : "Não informado"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ações */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => aprovarProposta(propostaDetalhada.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => {
                        setShowModalDetalhes(false)
                        abrirModalRejeicao(propostaDetalhada)
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reprovar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
