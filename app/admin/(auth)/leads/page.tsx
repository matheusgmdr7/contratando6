"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, Eye, Mail, Phone, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { buscarLeads, atualizarLead } from "@/services/leads-service"
import type { Lead } from "@/services/leads-service"
import * as XLSX from "xlsx"

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("Todos")
  const [filtroData, setFiltroData] = useState("Todos")
  const [filtroEstado, setFiltroEstado] = useState("Todos")
  const [filtroFaixaEtaria, setFiltroFaixaEtaria] = useState("Todos")
  const [filtroOperadora, setFiltroOperadora] = useState("Todos")
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [carregando, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(20)

  useEffect(() => {
    carregarLeads()
  }, [])

  async function carregarLeads() {
    try {
      const dados = await buscarLeads()
      setLeads(dados)
    } catch (error) {
      console.error("Erro ao carregar leads:", error)
      setErro("Falha ao carregar os leads. Por favor, tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleViewLead = (lead: Lead) => {
    setLeadSelecionado(lead)
    setIsDialogOpen(true)
  }

  const handleStatusChange = async (leadId: number, novoStatus: string) => {
    try {
      await atualizarLead(leadId.toString(), { status: novoStatus })
      await carregarLeads()
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      setErro("Falha ao atualizar o status. Por favor, tente novamente.")
    }
  }

  const leadsFiltrados = leads.filter((lead) => {
    const matchesSearch =
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.whatsapp.includes(searchTerm)
    const matchesStatus = filtroStatus === "Todos" || lead.status === filtroStatus
    const matchesEstado = filtroEstado === "Todos" || lead.estado === filtroEstado
    const matchesFaixaEtaria = filtroFaixaEtaria === "Todos" || lead.faixa_etaria === filtroFaixaEtaria
    const matchesOperadora = filtroOperadora === "Todos" || lead.plano_operadora === filtroOperadora

    // Filtro de data
    let matchesData = true
    if (filtroData !== "Todos") {
      const hoje = new Date()
      const dataLead = new Date(lead.data_registro)
      const diffTime = Math.abs(hoje.getTime() - dataLead.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      switch (filtroData) {
        case "Hoje":
          matchesData = diffDays === 0
          break
        case "Esta semana":
          matchesData = diffDays <= 7
          break
        case "Este mês":
          matchesData = diffDays <= 30
          break
        case "Este ano":
          matchesData = diffDays <= 365
          break
      }
    }

    return matchesSearch && matchesStatus && matchesEstado && matchesFaixaEtaria && matchesOperadora && matchesData
  })

  // Extrair valores únicos para os filtros
  const estados = Array.from(new Set(leads.map((lead) => lead.estado)))
  const faixasEtarias = Array.from(new Set(leads.map((lead) => lead.faixa_etaria)))
  const operadoras = Array.from(new Set(leads.map((lead) => lead.plano_operadora)))

  // Cálculos de paginação
  const totalItens = leadsFiltrados.length
  const totalPaginas = Math.ceil(totalItens / itensPorPagina)
  const indiceInicio = (paginaAtual - 1) * itensPorPagina
  const indiceFim = indiceInicio + itensPorPagina
  const leadsExibidos = leadsFiltrados.slice(indiceInicio, indiceFim)

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPaginaAtual(1)
  }, [searchTerm, filtroStatus, filtroData, filtroEstado, filtroFaixaEtaria, filtroOperadora])

  const exportarParaExcel = () => {
    // Preparar dados para exportação
    const dadosParaExportar = leads.map((lead) => ({
      Nome: lead.nome,
      Email: lead.email,
      WhatsApp: lead.whatsapp,
      Plano: lead.plano_nome,
      Operadora: lead.plano_operadora,
      "Faixa Etária": lead.faixa_etaria,
      Estado: lead.estado,
      "Data de Registro": new Date(lead.data_registro).toLocaleDateString(),
      Status: lead.status,
      Observações: lead.observacoes || "",
    }))

    // Criar planilha
    const ws = XLSX.utils.json_to_sheet(dadosParaExportar)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Leads")

    // Gerar arquivo
    XLSX.writeFile(wb, "leads.xlsx")
  }

  if (carregando) {
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
        <h1 className="text-2xl font-bold text-gray-800">Gerenciamento de Leads</h1>
        <Button onClick={exportarParaExcel} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-gray-900">{leads.length}</div>
          <div className="text-xs text-gray-600">Total de Leads</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-blue-700">{leads.filter((l) => l.status === "Novo").length}</div>
          <div className="text-xs text-gray-600">Novos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-yellow-700">
            {leads.filter((l) => l.status === "Em contato").length}
          </div>
          <div className="text-xs text-gray-600">Em Contato</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-green-700">
            {leads.filter((l) => l.status === "Convertido").length}
          </div>
          <div className="text-xs text-gray-600">Convertidos</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Nome, email ou telefone..."
                className="pl-9 text-sm h-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todos</option>
              <option value="Novo">Novo</option>
              <option value="Em contato">Em contato</option>
              <option value="Convertido">Convertido</option>
              <option value="Perdido">Perdido</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Período</label>
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todos</option>
              <option value="Hoje">Hoje</option>
              <option value="Esta semana">Esta semana</option>
              <option value="Este mês">Este mês</option>
              <option value="Este ano">Este ano</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todos</option>
              {estados.map((estado) => (
                <option key={estado} value={estado || "N/A"}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Faixa Etária</label>
            <select
              value={filtroFaixaEtaria}
              onChange={(e) => setFiltroFaixaEtaria(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todas</option>
              {faixasEtarias.map((faixa) => (
                <option key={faixa} value={faixa || "N/A"}>
                  {faixa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Operadora</label>
            <select
              value={filtroOperadora}
              onChange={(e) => setFiltroOperadora(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todas</option>
              {operadoras.map((operadora) => (
                <option key={operadora} value={operadora || "N/A"}>
                  {operadora}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Leads */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Leads</h2>
            <div className="text-sm text-gray-600">
              Mostrando {indiceInicio + 1}-{Math.min(indiceFim, totalItens)} de {totalItens} leads
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faixa Etária
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {erro ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-red-500">
                    {erro}
                  </td>
                </tr>
              ) : leadsExibidos.length > 0 ? (
                leadsExibidos.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={lead.nome}>
                        {lead.nome}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col text-xs space-y-1">
                        <span className="flex items-center truncate max-w-[120px]" title={lead.email}>
                          <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </span>
                        <span className="flex items-center">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" /> {lead.whatsapp}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col text-xs">
                        <span className="truncate max-w-[100px]" title={lead.plano_nome}>
                          {lead.plano_nome}
                        </span>
                        <span className="text-gray-500 truncate max-w-[100px]" title={lead.plano_operadora}>
                          {lead.plano_operadora}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">{lead.faixa_etaria}</td>
                    <td className="px-4 py-4 text-xs">{lead.estado}</td>
                    <td className="px-4 py-4 text-xs">{new Date(lead.data_registro).toLocaleDateString()}</td>
                    <td className="px-4 py-4">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-7"
                      >
                        <option value="Novo">Novo</option>
                        <option value="Em contato">Em contato</option>
                        <option value="Convertido">Convertido</option>
                        <option value="Perdido">Perdido</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-1" onClick={() => handleViewLead(lead)}>
                        <Eye className="h-3 w-3" />
                        <span className="sr-only">Ver detalhes</span>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <div className="text-gray-500 text-lg">Nenhum lead encontrado</div>
                    <div className="text-gray-400 text-sm mt-2">
                      {searchTerm ||
                      filtroStatus !== "Todos" ||
                      filtroData !== "Todos" ||
                      filtroEstado !== "Todos" ||
                      filtroFaixaEtaria !== "Todos" ||
                      filtroOperadora !== "Todos"
                        ? "Tente ajustar os filtros de busca"
                        : "Aguardando novos leads"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Página {paginaAtual} de {totalPaginas}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                  disabled={paginaAtual === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pageNum
                    if (totalPaginas <= 5) {
                      pageNum = i + 1
                    } else if (paginaAtual <= 3) {
                      pageNum = i + 1
                    } else if (paginaAtual >= totalPaginas - 2) {
                      pageNum = totalPaginas - 4 + i
                    } else {
                      pageNum = paginaAtual - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={paginaAtual === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaginaAtual(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="h-8"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
            <DialogDescription>Informações completas do lead selecionado.</DialogDescription>
          </DialogHeader>

          {leadSelecionado && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Nome completo</h3>
                  <p className="mt-1">{leadSelecionado.nome}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        leadSelecionado.status === "Novo"
                          ? "bg-blue-100 text-blue-800"
                          : leadSelecionado.status === "Em contato"
                            ? "bg-yellow-100 text-yellow-800"
                            : leadSelecionado.status === "Convertido"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {leadSelecionado.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">E-mail</h3>
                  <p className="mt-1">{leadSelecionado.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">WhatsApp</h3>
                  <p className="mt-1">{leadSelecionado.whatsapp}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Plano selecionado</h3>
                  <p className="mt-1">{leadSelecionado.plano_nome}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Operadora</h3>
                  <p className="mt-1">{leadSelecionado.plano_operadora}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Faixa Etária</h3>
                <p className="mt-1">{leadSelecionado.faixa_etaria}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                <p className="mt-1">{leadSelecionado.estado}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Data de registro</h3>
                <p className="mt-1">{new Date(leadSelecionado.data_registro).toLocaleDateString()}</p>
              </div>

              <div className="flex justify-between mt-4">
                <Button variant="outline" asChild>
                  <a href={`mailto:${leadSelecionado.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar e-mail
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={`https://wa.me/${leadSelecionado.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Contatar via WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
