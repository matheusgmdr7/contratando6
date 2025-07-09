"use client"

import { useState, useEffect } from "react"
import { buscarPropostas, atualizarStatusProposta } from "@/services/propostas-service-unificado"
import { criarProposta } from "@/services/propostas-service-unificado"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, CheckCircle, Calendar, Building, Search, Filter, RefreshCw, Save } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { UploadService } from "@/services/upload-service"
import { buscarCorretores } from "@/services/corretores-service"
import { Textarea } from "@/components/ui/textarea"

export default function CadastradoPage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [origemFiltro, setOrigemFiltro] = useState("todas")
  const [propostaDetalhada, setPropostaDetalhada] = useState<any>(null)
  const [showModalDetalhes, setShowModalDetalhes] = useState(false)
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)
  const [showModalCadastro, setShowModalCadastro] = useState(false)
  const [propostaCadastro, setPropostaCadastro] = useState<any>(null)

  // Campos para cadastro
  const [administradora, setAdministradora] = useState("")
  const [dataVencimento, setDataVencimento] = useState("")
  const [dataVigencia, setDataVigencia] = useState("")
  const [saving, setSaving] = useState(false)

  // Estado para modal de cadastro manual
  const [showModalCadastroManual, setShowModalCadastroManual] = useState(false)
  const [corretoresDisponiveis, setCorretoresDisponiveis] = useState<any[]>([])
  const [formManual, setFormManual] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    data_nascimento: "",
    cns: "",
    rg: "",
    orgao_emissor: "",
    nome_mae: "",
    sexo: "Masculino",
    uf_nascimento: "SP",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    produto_id: "",
    tabela_id: "",
    cobertura: "Nacional",
    acomodacao: "Enfermaria",
    sigla_plano: "",
    valor: "",
    tem_dependentes: false,
    dependentes: [] as any[],
    anexos: {
      rg_frente: null as File | null,
      rg_verso: null as File | null,
      cpf: null as File | null,
      comprovante_residencia: null as File | null,
      cns: null as File | null,
    },
    anexosDependentes: [] as any[],
    observacoes: "",
    corretor_id: "",
    administradora: "",
    produto: "",
    data_vigencia: "",
    data_vencimento: "",
    data_cadastro: "",
    status: "cadastrado",
    documentos: {},
  })
  const [uploading, setUploading] = useState(false)

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(25)

  useEffect(() => {
    carregarPropostas()
  }, [])

  useEffect(() => {
    if (showModalCadastroManual) {
      buscarCorretores().then(setCorretoresDisponiveis)
    }
  }, [showModalCadastroManual])

  async function carregarPropostas() {
    try {
      setLoading(true)
      console.log("🔄 Carregando propostas aprovadas...")
      const data = await buscarPropostas()
      // Filtrar apenas propostas com status "aprovada"
      const propostasAprovadas = data.filter((p: any) => p.status === "aprovada")
      console.log("📊 Propostas aprovadas:", propostasAprovadas.length)
      setPropostas(propostasAprovadas)
    } catch (error: any) {
      console.error("❌ Erro ao carregar propostas:", error)
      toast.error("Erro ao carregar propostas")
    } finally {
      setLoading(false)
    }
  }

  async function finalizarCadastro() {
    if (!propostaCadastro || !administradora || !dataVencimento || !dataVigencia) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    try {
      setSaving(true)
      
      // Atualizar a proposta com os dados de cadastro
      const { error } = await supabase
        .from("propostas")
        .update({
          administradora,
          data_vencimento: dataVencimento,
          data_vigencia: dataVigencia,
          data_cadastro: new Date().toISOString(),
          status: "cadastrado"
        })
        .eq("id", propostaCadastro.id)

      if (error) {
        throw error
      }

      toast.success("Cadastro finalizado com sucesso!")
      setShowModalCadastro(false)
      setPropostaCadastro(null)
      setAdministradora("")
      setDataVencimento("")
      setDataVigencia("")
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao finalizar cadastro:", error)
      toast.error("Erro ao finalizar cadastro")
    } finally {
      setSaving(false)
    }
  }

  async function handleCadastroManual(e: any) {
    e.preventDefault()
    setUploading(true)
    try {
      // Upload dos anexos do titular
      let anexosUrls = {}
      if (formManual.anexos && (
        formManual.anexos.rg_frente || 
        formManual.anexos.rg_verso || 
        formManual.anexos.cpf || 
        formManual.anexos.comprovante_residencia || 
        formManual.anexos.cns
      )) {
        const uploadTitular = await UploadService.uploadDocumentos(
          "manual_titular", // id temporário
          formManual.anexos,
          [],
        )
        anexosUrls = uploadTitular.documentosUrls
      }

      // Upload dos anexos dos dependentes
      let anexosDependentesUrls = []
      if (formManual.anexosDependentes && formManual.anexosDependentes.length > 0) {
        for (let i = 0; i < formManual.anexosDependentes.length; i++) {
          const anexosDependente = formManual.anexosDependentes[i]
          if (anexosDependente && Object.keys(anexosDependente).some(key => anexosDependente[key])) {
            const uploadDependente = await UploadService.uploadDocumentos(
              `manual_dependente_${i}`,
              anexosDependente,
              [],
            )
            anexosDependentesUrls.push(uploadDependente.documentosUrls)
          } else {
            anexosDependentesUrls.push({})
          }
        }
      }

      // Criar proposta manualmente com todos os dados
      const propostaId = await criarProposta({
        // Dados do titular
        nome: formManual.nome,
        cpf: formManual.cpf,
        data_nascimento: formManual.data_nascimento,
        email: formManual.email,
        telefone: formManual.telefone,
        cns: formManual.cns,
        rg: formManual.rg,
        orgao_emissor: formManual.orgao_emissor,
        nome_mae: formManual.nome_mae,
        sexo: formManual.sexo,
        uf_nascimento: formManual.uf_nascimento,
        
        // Endereço
        cep: formManual.cep,
        endereco: formManual.endereco,
        numero: formManual.numero,
        complemento: formManual.complemento,
        bairro: formManual.bairro,
        cidade: formManual.cidade,
        estado: formManual.estado,
        
        // Dados do plano
        produto_id: formManual.produto_id,
        tabela_id: formManual.tabela_id,
        cobertura: formManual.cobertura,
        acomodacao: formManual.acomodacao,
        sigla_plano: formManual.sigla_plano,
        valor: formManual.valor,
        
        // Dados de cadastro
        corretor_id: formManual.corretor_id,
        administradora: formManual.administradora,
        data_vigencia: formManual.data_vigencia,
        data_vencimento: formManual.data_vencimento,
        data_cadastro: formManual.data_cadastro,
        status: formManual.status,
        
        // Dependentes
        dependentes: formManual.dependentes,
        
        // Anexos
        anexos: anexosUrls,
        anexosDependentes: anexosDependentesUrls,
        
        // Outros
        observacoes: formManual.observacoes,
        origem: "manual",
      })

      if (propostaId) {
        toast.success("Cliente cadastrado manualmente com sucesso!")
        setShowModalCadastroManual(false)
        setFormManual({
          nome: "",
          email: "",
          telefone: "",
          cpf: "",
          data_nascimento: "",
          cns: "",
          rg: "",
          orgao_emissor: "",
          nome_mae: "",
          sexo: "Masculino",
          uf_nascimento: "SP",
          cep: "",
          endereco: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: "",
          produto_id: "",
          tabela_id: "",
          cobertura: "Nacional",
          acomodacao: "Enfermaria",
          sigla_plano: "",
          valor: "",
          tem_dependentes: false,
          dependentes: [],
          anexos: {
            rg_frente: null,
            rg_verso: null,
            cpf: null,
            comprovante_residencia: null,
            cns: null,
          },
          anexosDependentes: [],
          observacoes: "",
          corretor_id: "",
          administradora: "",
          produto: "",
          data_vigencia: "",
          data_vencimento: "",
          data_cadastro: "",
          status: "cadastrado",
          documentos: {},
        })
        carregarPropostas()
      } else {
        toast.error("Erro ao cadastrar cliente manualmente")
      }
    } catch (error) {
      console.error("Erro ao cadastrar cliente manualmente:", error)
      toast.error("Erro ao cadastrar cliente manualmente")
    } finally {
      setUploading(false)
    }
  }

  function abrirModalCadastro(proposta: any) {
    setPropostaCadastro(proposta)
    setShowModalCadastro(true)
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

  function verificarCadastroCompleto(proposta: any) {
    return proposta.administradora && proposta.data_vencimento && proposta.data_vigencia
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
        <h1 className="text-2xl font-bold text-gray-900">Clientes Cadastrados</h1>
        <div className="flex gap-2">
          <button
            onClick={carregarPropostas}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar Lista
          </button>
          <button
            onClick={() => setShowModalCadastroManual(true)}
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            + Adicionar Cliente Manualmente
          </button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-gray-900">{propostas.length}</div>
          <div className="text-xs text-gray-600">Total Aprovados</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-green-600">
            {propostas.filter((p) => verificarCadastroCompleto(p)).length}
          </div>
          <div className="text-xs text-gray-600">Cadastros Completos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-orange-600">
            {propostas.filter((p) => !verificarCadastroCompleto(p)).length}
          </div>
          <div className="text-xs text-gray-600">Pendentes de Cadastro</div>
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
            <h2 className="text-lg font-semibold text-gray-900">Lista de Clientes Aprovados</h2>
            <div className="text-sm text-gray-600">
              Mostrando {indiceInicio + 1}-{Math.min(indiceFim, totalItens)} de {totalItens} clientes
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
                  Origem
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor/Data
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Administradora
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vigência
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Cadastro
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {propostasExibidas.map((proposta) => (
                <tr key={proposta.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {obterNomeCliente(proposta)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {proposta.origem === "propostas" ? "Cliente Direto" : "Via Corretor"}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{obterEmailCliente(proposta)}</div>
                    <div className="text-sm text-gray-500">
                      {proposta.telefone || proposta.celular || "Telefone não informado"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {proposta.origem === "propostas" ? "Direto" : "Corretor"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {proposta.valor ? formatarMoeda(proposta.valor) : "Valor não informado"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(proposta.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {proposta.administradora || <span className="text-gray-400">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {proposta.data_vigencia ? new Date(proposta.data_vigencia).toLocaleDateString("pt-BR") : <span className="text-gray-400">-</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {proposta.data_vencimento ? `Venc.: ${new Date(proposta.data_vencimento).toLocaleDateString("pt-BR")}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {verificarCadastroCompleto(proposta) ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <Calendar className="h-3 w-3 mr-1" />
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => abrirModalDetalhes(proposta)}
                        className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs transition-colors"
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        Ver
                      </button>

                      {!verificarCadastroCompleto(proposta) && (
                        <button
                          onClick={() => abrirModalCadastro(proposta)}
                          className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors text-xs"
                        >
                          <Save className="h-3 w-3 inline mr-1" />
                          Completar Cadastro
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {propostasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Nenhum cliente aprovado encontrado</div>
            <div className="text-gray-400 text-sm mt-2">
              {filtro || origemFiltro !== "todas"
                ? "Tente ajustar os filtros de busca"
                : "Nenhuma proposta foi aprovada ainda"}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Cadastro */}
      {showModalCadastro && propostaCadastro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Completar Cadastro</h3>
            <p className="text-gray-600 mb-4">
              Informe os dados para finalizar o cadastro de <strong>{obterNomeCliente(propostaCadastro)}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Administradora <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={administradora}
                  onChange={(e) => setAdministradora(e.target.value)}
                  placeholder="Nome da administradora"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Vencimento <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Vigência <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={dataVigencia}
                  onChange={(e) => setDataVigencia(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowModalCadastro(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={finalizarCadastro}
                disabled={saving || !administradora || !dataVencimento || !dataVigencia}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Finalizar Cadastro
                  </>
                )}
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
                <h2 className="text-2xl font-bold text-gray-900">Detalhes do Cliente</h2>
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

                  {/* Dados de Cadastro */}
                  {verificarCadastroCompleto(propostaDetalhada) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Dados de Cadastro</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Administradora</label>
                            <p className="text-gray-900">{propostaDetalhada.administradora}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Data de Vencimento</label>
                            <p className="text-gray-900">
                              {new Date(propostaDetalhada.data_vencimento).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Data de Vigência</label>
                            <p className="text-gray-900">
                              {new Date(propostaDetalhada.data_vigencia).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Ações */}
                  <div className="flex justify-end space-x-3">
                    {!verificarCadastroCompleto(propostaDetalhada) && (
                      <button
                        onClick={() => {
                          setShowModalDetalhes(false)
                          abrirModalCadastro(propostaDetalhada)
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Completar Cadastro
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de cadastro manual */}
      {showModalCadastroManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 w-full max-w-4xl mx-2 relative max-h-[95vh] overflow-y-auto">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setShowModalCadastroManual(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 text-center">Cadastro Manual de Cliente</h2>
            <form onSubmit={handleCadastroManual} className="space-y-6">
              {/* Dados do Titular */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Dados do Titular</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome *</label>
                    <Input value={formManual.nome} onChange={e => setFormManual({ ...formManual, nome: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CPF *</label>
                    <Input value={formManual.cpf} onChange={e => setFormManual({ ...formManual, cpf: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Nascimento *</label>
                    <Input type="date" value={formManual.data_nascimento} onChange={e => setFormManual({ ...formManual, data_nascimento: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">E-mail *</label>
                    <Input type="email" value={formManual.email} onChange={e => setFormManual({ ...formManual, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone *</label>
                    <Input value={formManual.telefone} onChange={e => setFormManual({ ...formManual, telefone: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CNS *</label>
                    <Input value={formManual.cns} onChange={e => setFormManual({ ...formManual, cns: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">RG *</label>
                    <Input value={formManual.rg} onChange={e => setFormManual({ ...formManual, rg: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Órgão Emissor *</label>
                    <Input value={formManual.orgao_emissor} onChange={e => setFormManual({ ...formManual, orgao_emissor: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome da Mãe *</label>
                    <Input value={formManual.nome_mae} onChange={e => setFormManual({ ...formManual, nome_mae: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sexo *</label>
                    <Select value={formManual.sexo} onValueChange={v => setFormManual({ ...formManual, sexo: v })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">UF de Nascimento *</label>
                    <Input value={formManual.uf_nascimento} onChange={e => setFormManual({ ...formManual, uf_nascimento: e.target.value })} required />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CEP *</label>
                    <Input value={formManual.cep} onChange={e => setFormManual({ ...formManual, cep: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Endereço *</label>
                    <Input value={formManual.endereco} onChange={e => setFormManual({ ...formManual, endereco: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número *</label>
                    <Input value={formManual.numero} onChange={e => setFormManual({ ...formManual, numero: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Complemento</label>
                    <Input value={formManual.complemento} onChange={e => setFormManual({ ...formManual, complemento: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bairro *</label>
                    <Input value={formManual.bairro} onChange={e => setFormManual({ ...formManual, bairro: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cidade *</label>
                    <Input value={formManual.cidade} onChange={e => setFormManual({ ...formManual, cidade: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado *</label>
                    <Input value={formManual.estado} onChange={e => setFormManual({ ...formManual, estado: e.target.value })} required />
                  </div>
                </div>
              </div>

              {/* Dados do Plano */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Dados do Plano</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Produto *</label>
                    <Input value={formManual.produto_id} onChange={e => setFormManual({ ...formManual, produto_id: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tabela de Preços</label>
                    <Input value={formManual.tabela_id} onChange={e => setFormManual({ ...formManual, tabela_id: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cobertura *</label>
                    <Select value={formManual.cobertura} onValueChange={v => setFormManual({ ...formManual, cobertura: v })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nacional">Nacional</SelectItem>
                        <SelectItem value="Estadual">Estadual</SelectItem>
                        <SelectItem value="Regional">Regional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Acomodação *</label>
                    <Select value={formManual.acomodacao} onValueChange={v => setFormManual({ ...formManual, acomodacao: v })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                        <SelectItem value="Apartamento">Apartamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Código do Plano *</label>
                    <Input value={formManual.sigla_plano} onChange={e => setFormManual({ ...formManual, sigla_plano: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valor *</label>
                    <Input value={formManual.valor} onChange={e => setFormManual({ ...formManual, valor: e.target.value })} required />
                  </div>
                </div>
              </div>

              {/* Anexos do Titular */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Anexos do Titular</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">RG - Frente</label>
                    <Input type="file" accept="image/*,.pdf" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setFormManual({
                          ...formManual,
                          anexos: { ...formManual.anexos, rg_frente: e.target.files[0] }
                        })
                      }
                    }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">RG - Verso</label>
                    <Input type="file" accept="image/*,.pdf" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setFormManual({
                          ...formManual,
                          anexos: { ...formManual.anexos, rg_verso: e.target.files[0] }
                        })
                      }
                    }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CPF</label>
                    <Input type="file" accept="image/*,.pdf" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setFormManual({
                          ...formManual,
                          anexos: { ...formManual.anexos, cpf: e.target.files[0] }
                        })
                      }
                    }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Comprovante de Residência</label>
                    <Input type="file" accept="image/*,.pdf" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setFormManual({
                          ...formManual,
                          anexos: { ...formManual.anexos, comprovante_residencia: e.target.files[0] }
                        })
                      }
                    }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CNS</label>
                    <Input type="file" accept="image/*,.pdf" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setFormManual({
                          ...formManual,
                          anexos: { ...formManual.anexos, cns: e.target.files[0] }
                        })
                      }
                    }} />
                  </div>
                </div>
              </div>

              {/* Dependentes */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Dependentes</h3>
                  <Button
                    type="button"
                    onClick={() => {
                      const novoDependente = {
                        nome: "",
                        cpf: "",
                        rg: "",
                        data_nascimento: "",
                        cns: "",
                        parentesco: "",
                        nome_mae: "",
                        sexo: "Masculino",
                        uf_nascimento: "SP",
                        orgao_emissor: "",
                        anexos: {
                          rg_frente: null,
                          rg_verso: null,
                          comprovante_residencia: null,
                        }
                      }
                      setFormManual({
                        ...formManual,
                        dependentes: [...formManual.dependentes, novoDependente],
                        anexosDependentes: [...formManual.anexosDependentes, {}]
                      })
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    + Adicionar Dependente
                  </Button>
                </div>
                {formManual.dependentes.map((dependente, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-700">Dependente {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => {
                          const novosDependentes = formManual.dependentes.filter((_, i) => i !== index)
                          const novosAnexos = formManual.anexosDependentes.filter((_, i) => i !== index)
                          setFormManual({
                            ...formManual,
                            dependentes: novosDependentes,
                            anexosDependentes: novosAnexos
                          })
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Remover
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nome *</label>
                        <Input value={dependente.nome} onChange={e => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].nome = e.target.value
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">CPF *</label>
                        <Input value={dependente.cpf} onChange={e => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].cpf = e.target.value
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">RG *</label>
                        <Input value={dependente.rg} onChange={e => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].rg = e.target.value
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Data de Nascimento *</label>
                        <Input type="date" value={dependente.data_nascimento} onChange={e => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].data_nascimento = e.target.value
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">CNS *</label>
                        <Input value={dependente.cns} onChange={e => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].cns = e.target.value
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Parentesco *</label>
                        <Input value={dependente.parentesco} onChange={e => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].parentesco = e.target.value
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nome da Mãe *</label>
                        <Input value={dependente.nome_mae} onChange={e => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].nome_mae = e.target.value
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sexo *</label>
                        <Select value={dependente.sexo} onValueChange={v => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].sexo = v
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Masculino">Masculino</SelectItem>
                            <SelectItem value="Feminino">Feminino</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">UF de Nascimento *</label>
                        <Input value={dependente.uf_nascimento} onChange={e => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].uf_nascimento = e.target.value
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Órgão Emissor *</label>
                        <Input value={dependente.orgao_emissor} onChange={e => {
                          const novosDependentes = [...formManual.dependentes]
                          novosDependentes[index].orgao_emissor = e.target.value
                          setFormManual({ ...formManual, dependentes: novosDependentes })
                        }} required />
                      </div>
                    </div>
                    {/* Anexos do Dependente */}
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-2">Anexos do Dependente</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">RG - Frente</label>
                          <Input type="file" accept="image/*,.pdf" onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              const novosAnexos = [...formManual.anexosDependentes]
                              if (!novosAnexos[index]) novosAnexos[index] = {}
                              novosAnexos[index].rg_frente = e.target.files[0]
                              setFormManual({ ...formManual, anexosDependentes: novosAnexos })
                            }
                          }} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">RG - Verso</label>
                          <Input type="file" accept="image/*,.pdf" onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              const novosAnexos = [...formManual.anexosDependentes]
                              if (!novosAnexos[index]) novosAnexos[index] = {}
                              novosAnexos[index].rg_verso = e.target.files[0]
                              setFormManual({ ...formManual, anexosDependentes: novosAnexos })
                            }
                          }} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Comprovante de Residência</label>
                          <Input type="file" accept="image/*,.pdf" onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              const novosAnexos = [...formManual.anexosDependentes]
                              if (!novosAnexos[index]) novosAnexos[index] = {}
                              novosAnexos[index].comprovante_residencia = e.target.files[0]
                              setFormManual({ ...formManual, anexosDependentes: novosAnexos })
                            }
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dados de Cadastro */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Dados de Cadastro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Corretor Responsável *</label>
                    <Select value={formManual.corretor_id} onValueChange={v => setFormManual({ ...formManual, corretor_id: v })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o corretor" />
                      </SelectTrigger>
                      <SelectContent>
                        {corretoresDisponiveis.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome} ({c.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Administradora *</label>
                    <Input value={formManual.administradora} onChange={e => setFormManual({ ...formManual, administradora: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Vigência *</label>
                    <Input type="date" value={formManual.data_vigencia} onChange={e => setFormManual({ ...formManual, data_vigencia: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Vencimento *</label>
                    <Input type="date" value={formManual.data_vencimento} onChange={e => setFormManual({ ...formManual, data_vencimento: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Cadastro *</label>
                    <Input type="date" value={formManual.data_cadastro} onChange={e => setFormManual({ ...formManual, data_cadastro: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status *</label>
                    <Select value={formManual.status} onValueChange={v => setFormManual({ ...formManual, status: v })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cadastrado">Cadastrado</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Observações</h3>
                <Textarea
                  value={formManual.observacoes}
                  onChange={e => setFormManual({ ...formManual, observacoes: e.target.value })}
                  placeholder="Digite observações adicionais..."
                  rows={4}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModalCadastroManual(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-700 hover:bg-green-800 text-white" disabled={uploading}>
                  {uploading ? "Salvando..." : "Salvar Cadastro"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 