"use client"

import { useState, useEffect } from "react"
import {
  buscarPropostas,
  atualizarStatusProposta,
  enviarValidacaoEmail,
  buscarDependentesProposta,
  buscarQuestionarioSaude,
  buscarPropostaCompleta,
  obterDocumentosInteligente,
  obterNomeCliente,
  obterEmailCliente,
  obterTelefoneCliente,
  obterValorProposta,
} from "@/services/propostas-service-unificado"
import { downloadPropostaComDocumentos } from "@/services/download-service"
import { gerarPDFCompleto, gerarPDFSimples } from "@/services/pdf-completo-service"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Download, Eye, FileText, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [origemFiltro, setOrigemFiltro] = useState("todas")
  const [propostaDetalhada, setPropostaDetalhada] = useState<any>(null)
  const [dependentes, setDependentes] = useState<any[]>([])
  const [questionariosSaude, setQuestionariosSaude] = useState<any[]>([])
  const [motivoRejeicao, setMotivoRejeicao] = useState("")
  const [showModalRejeicao, setShowModalRejeicao] = useState(false)
  const [showModalDetalhes, setShowModalDetalhes] = useState(false)
  const [enviandoEmail, setEnviandoEmail] = useState(null)
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [downloadingDoc, setDownloadingDoc] = useState(null)
  const [showModalPDF, setShowModalPDF] = useState(false)
  const [modelosProposta, setModelosProposta] = useState<any[]>([])
  const [modeloSelecionado, setModeloSelecionado] = useState("")
  const [pdfUrlGerado, setPdfUrlGerado] = useState<string | null>(null)

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(25)

  useEffect(() => {
    carregarPropostas()
    carregarModelosProposta()
  }, [])

  async function carregarPropostas() {
    try {
      setLoading(true)
      console.log("🔄 Carregando propostas UNIFICADAS...")
      const data = await buscarPropostas()
      console.log("📊 Propostas carregadas:", data.length)
      setPropostas(data)
    } catch (error: any) {
      console.error("❌ Erro ao carregar propostas:", error)
      toast.error("Erro ao carregar propostas")
    } finally {
      setLoading(false)
    }
  }

  async function carregarModelosProposta() {
    try {
      const { PDFService } = await import("@/services/pdf-service")
      const modelos = await PDFService.buscarModelos()
      
      setModelosProposta(modelos)
      if (modelos && modelos.length > 0) {
        setModeloSelecionado(modelos[0].id)
      }
    } catch (error) {
      console.error("Erro ao carregar modelos:", error)
      toast.error("Erro ao carregar modelos de proposta")
    }
  }

  // NOVO: Função para parsear dependentes igual à página de sucesso
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

  // NOVO: Função para calcular valor total mensal (titular + dependentes)
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
    
    console.log(`🔍 DEBUG calcularValorTotalMensal - Proposta ${proposta.id}:`, {
      valorTitular: proposta.valor_mensal || proposta.valor || proposta.valor_total,
      dependentes: dependentesArr?.length || 0,
      totalCalculado: total
    })
    
    return total
  }

  async function carregarDetalhesCompletos(proposta: any) {
    try {
      setLoadingDetalhes(true)
      console.log("🔍 CARREGANDO DETALHES COMPLETOS - UNIFICADO")
      console.log("=".repeat(60))
      console.log("📋 Proposta ID:", proposta.id)
      console.log("📋 Origem:", proposta.origem)

      // 1. Buscar dados completos da proposta
      const propostaCompleta = await buscarPropostaCompleta(proposta.id)
      setPropostaDetalhada(propostaCompleta as any)

      // 2. Carregar dependentes
      let dependentesData = await buscarDependentesProposta(proposta.id)
      if (!dependentesData || dependentesData.length === 0) {
        // Tentar parsear do campo dependentes
        dependentesData = parseDependentes(proposta)
      }
      setDependentes(dependentesData)

      // 3. Buscar questionários de saúde (centralizado)
      let questionariosData = []
      
      // Primeiro tentar buscar na tabela questionario_respostas
      const { data: questionariosRespostas, error: errorQuestionariosRespostas } = await supabase
        .from("questionario_respostas")
        .select("*, respostas_questionario(*)")
        .eq("proposta_id", proposta.id)
      
      if (!errorQuestionariosRespostas && questionariosRespostas && questionariosRespostas.length > 0) {
        console.log("✅ Questionário encontrado em questionario_respostas:", questionariosRespostas.length)
        questionariosData = questionariosRespostas
        
        // Extrair peso e altura do questionário do titular
        const questionarioTitular = questionariosRespostas.find(q => q.pessoa_tipo === "titular")
        if (questionarioTitular && propostaCompleta) {
          console.log("📏 Dados físicos do titular encontrados:", {
            peso: questionarioTitular.peso,
            altura: questionarioTitular.altura
          })
          // Adicionar peso e altura à proposta
          propostaCompleta.peso = questionarioTitular.peso || propostaCompleta.peso
          propostaCompleta.altura = questionarioTitular.altura || propostaCompleta.altura
          setPropostaDetalhada(propostaCompleta)
        }
        
        // Extrair peso e altura dos questionários dos dependentes
        if (dependentesData && dependentesData.length > 0) {
          dependentesData.forEach((dependente, index) => {
            const questionarioDependente = questionariosRespostas.find(q => 
              q.pessoa_tipo === "dependente" && q.pessoa_nome === dependente.nome
            )
            if (questionarioDependente) {
              console.log(`📏 Dados físicos do dependente ${dependente.nome}:`, {
                peso: questionarioDependente.peso,
                altura: questionarioDependente.altura
              })
              dependente.peso = questionarioDependente.peso || dependente.peso
              dependente.altura = questionarioDependente.altura || dependente.altura
            }
          })
          setDependentes([...dependentesData])
        }
      } else {
        console.log("ℹ️ Nenhum questionário em questionario_respostas, tentando questionario_saude...")
        
        // Fallback para a tabela questionario_saude
        const { data: questionariosSaude, error: errorQuestionariosSaude } = await supabase
          .from("questionario_saude")
          .select("*")
          .eq("proposta_id", proposta.id)
          .order("pergunta_id", { ascending: true })
        
        if (!errorQuestionariosSaude && questionariosSaude && questionariosSaude.length > 0) {
          console.log("✅ Questionário encontrado em questionario_saude:", questionariosSaude.length)
          questionariosData = questionariosSaude
        } else {
          console.log("ℹ️ Nenhum questionário encontrado em nenhuma tabela")
        }
      }
      
      // Buscar questionários dos dependentes também
      if (dependentesData && dependentesData.length > 0) {
        console.log("🔍 Buscando questionários dos dependentes...")
        
        for (const dependente of dependentesData) {
          try {
            console.log(`🔍 Buscando questionário para dependente: ${dependente.nome} (ID: ${dependente.id})`)
            
            // Buscar na tabela questionario_saude com dependente_id
            const { data: questionarioDependente, error: errorQuestionarioDependente } = await supabase
              .from("questionario_saude")
              .select("*")
              .eq("proposta_id", proposta.id)
              .eq("dependente_id", dependente.id)
              .order("pergunta_id", { ascending: true })
            
            if (!errorQuestionarioDependente && questionarioDependente && questionarioDependente.length > 0) {
              console.log(`✅ Questionário do dependente ${dependente.nome} encontrado em questionario_saude:`, questionarioDependente.length, "respostas")
              console.log("📋 Detalhes do questionário:", questionarioDependente)
              questionariosData.push(...questionarioDependente)
            } else {
              console.log(`ℹ️ Nenhum questionário encontrado em questionario_saude para dependente ${dependente.nome}`)
            }
            
            // Buscar também na tabela questionario_respostas para dependentes
            const { data: questionarioRespostasDependente, error: errorQuestionarioRespostasDependente } = await supabase
              .from("questionario_respostas")
              .select("*, respostas_questionario(*)")
              .eq("proposta_id", proposta.id)
              .eq("pessoa_tipo", "dependente")
              .eq("pessoa_nome", dependente.nome)
            
            if (!errorQuestionarioRespostasDependente && questionarioRespostasDependente && questionarioRespostasDependente.length > 0) {
              console.log(`✅ Questionário do dependente ${dependente.nome} encontrado em questionario_respostas:`, questionarioRespostasDependente.length, "registros")
              console.log("📋 Detalhes do questionário:", questionarioRespostasDependente)
              questionariosData.push(...questionarioRespostasDependente)
            } else {
              console.log(`ℹ️ Nenhum questionário encontrado em questionario_respostas para dependente ${dependente.nome}`)
            }
          } catch (err) {
            console.log(`⚠️ Erro ao buscar questionário do dependente ${dependente.nome}:`, err)
          }
        }
      }
      
      setQuestionariosSaude(questionariosData)

      console.log("🎉 CARREGAMENTO COMPLETO FINALIZADO!")
    } catch (error: any) {
      console.error("❌ ERRO GERAL AO CARREGAR DETALHES:", error)
      toast.error("Erro ao carregar detalhes da proposta: " + error.message)
    } finally {
      setLoadingDetalhes(false)
    }
  }

  async function baixarDocumentoIndividual(url: any, nomeArquivo: any) {
    try {
      setDownloadingDoc(nomeArquivo)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Erro ao baixar arquivo: ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)

      toast.success(`${nomeArquivo} baixado com sucesso!`)
    } catch (error: any) {
      console.error("❌ Erro ao baixar documento:", error)
      toast.error(`Erro ao baixar ${nomeArquivo}`)
    } finally {
      setDownloadingDoc(null)
    }
  }

  async function baixarTudoZip() {
    if (!propostaDetalhada) return

    try {
      setDownloadingZip(true)
      const nomeCliente = obterNomeCliente(propostaDetalhada)
      const documentosUrls = obterDocumentosInteligente(propostaDetalhada, "titular")
      const pdfUrl = propostaDetalhada.pdf_url

      const documentosDependentes: Record<string, any> = {}
      dependentes.forEach((dep: any, index: number) => {
        const docsDependendente = obterDocumentosInteligente(dep, "dependente")
        Object.entries(docsDependendente).forEach(([tipo, url]) => {
          documentosDependentes[`dependente_${index + 1}_${tipo}`] = url
        })
      })

      const todosDocumentos = { ...documentosUrls, ...documentosDependentes }

      if (!pdfUrl && Object.keys(todosDocumentos).length === 0) {
        toast.error("Nenhum documento disponível para download")
        return
      }

      await downloadPropostaComDocumentos(propostaDetalhada.id, nomeCliente, todosDocumentos, pdfUrl)
      toast.success("Download ZIP iniciado com sucesso!")
    } catch (error: any) {
      console.error("❌ Erro ao baixar ZIP:", error)
      toast.error("Erro ao gerar arquivo ZIP: " + error.message)
    } finally {
      setDownloadingZip(false)
    }
  }

  async function gerarPDFCompletoAction() {
    if (!propostaDetalhada) return

    try {
      setGeneratingPdf(true)
      const nomeCliente = obterNomeCliente(propostaDetalhada)
      const documentosUrls = obterDocumentosInteligente(propostaDetalhada, "titular")
      const pdfUrl = propostaDetalhada.pdf_url

      if (!pdfUrl) {
        toast.error("PDF da proposta não disponível")
        return
      }

      let pdfBlob
      try {
        pdfBlob = await gerarPDFCompleto(propostaDetalhada.id, nomeCliente, documentosUrls, pdfUrl)
      } catch (error) {
        console.warn("⚠️ Falha na geração completa, tentando PDF simples...")
        pdfBlob = await gerarPDFSimples(propostaDetalhada.id, nomeCliente, documentosUrls, pdfUrl)
      }

      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Proposta_Completa_${nomeCliente.replace(/[^a-zA-Z0-9]/g, "_")}_${obterIdSeguro(propostaDetalhada).substring(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("PDF completo gerado com sucesso!")
    } catch (error: any) {
      console.error("❌ Erro ao gerar PDF completo:", error)
      toast.error("Erro ao gerar PDF completo: " + error.message)
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function gerarPDFComModelo() {
    if (!propostaDetalhada || !modeloSelecionado) {
      toast.error("Selecione um modelo de proposta")
      return
    }

    try {
      setGeneratingPdf(true)
      setShowModalPDF(false)

      // Importar o serviço de PDF
      const { PDFService } = await import("@/services/pdf-service")

      // Preparar dados da proposta para o PDF
      const dadosParaPreenchimento = prepararDadosParaPreenchimento(propostaDetalhada, dependentes, questionariosSaude)

      // Gerar o nome do arquivo
      const nomeCliente = obterNomeCliente(propostaDetalhada)

      // Gerar PDF usando o modelo selecionado
      const pdfUrl = await PDFService.gerarPDFComModelo(
        modeloSelecionado,
        dadosParaPreenchimento,
        nomeCliente
      )

      if (!pdfUrl) {
        throw new Error("Falha ao gerar URL do PDF")
      }

      // Atualizar a URL do PDF na proposta
      await supabase.from("propostas").update({ pdf_url: pdfUrl }).eq("id", propostaDetalhada.id)

      setPdfUrlGerado(pdfUrl)

      toast.success("PDF gerado com sucesso!")
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error)
      toast.error("Erro ao gerar PDF: " + error.message)
    } finally {
      setGeneratingPdf(false)
    }
  }

  function prepararDadosParaPreenchimento(proposta: any, dependentes: any[] = [], questionario: any[] = []) {
    // Função auxiliar para calcular idade
    function calcularIdade(dataNascimento: any) {
      if (!dataNascimento) return ""
      const hoje = new Date()
      const nascimento = new Date(dataNascimento)
      let idade = hoje.getFullYear() - nascimento.getFullYear()
      const mes = hoje.getMonth() - nascimento.getMonth()
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--
      }
      return idade
    }

    // Função auxiliar para formatar moeda
    function formatarMoeda(valor: any) {
      if (!valor) return ""
      try {
        return typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : valor
      } catch (e) {
        return valor
      }
    }

    // Função auxiliar para pegar valor total mensal
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
      
      console.log("💰 Admin - Valor total mensal calculado:", total, "para proposta:", proposta.id)
      return total
    }

    // Montar objeto base
    const dadosPDF: any = {
      // Titular
      nome: proposta.nome || proposta.nome_cliente || "",
      cpf: proposta.cpf || "",
      rg: proposta.rg || "",
      data_nascimento: proposta.data_nascimento ? proposta.data_nascimento.split("T")[0].split("-").reverse().join("/") : "",
      email: proposta.email || proposta.email_cliente || "",
      telefone: proposta.telefone || proposta.telefone_cliente || proposta.celular || "",
      cns: proposta.cns || proposta.cns_cliente || "",
      nome_mae: proposta.nome_mae || proposta.nome_mae_cliente || "",
      sexo: proposta.sexo || proposta.sexo_cliente || "",
      estado_civil: proposta.estado_civil || proposta.estado_civil_cliente || "",
      naturalidade: proposta.naturalidade || "",
      nome_pai: proposta.nome_pai || "",
      nacionalidade: proposta.nacionalidade || "",
      profissao: proposta.profissao || "",
      orgao_expedidor: proposta.orgao_expedidor || proposta.orgao_emissor || proposta.orgao_emissor_cliente || "",
      uf_nascimento: proposta.uf_nascimento || proposta.uf || proposta.estado_nascimento || proposta.estado || proposta.uf_cliente || "",
      endereco: proposta.endereco || proposta.endereco_cliente || "",
      numero: proposta.numero || "",
      complemento: proposta.complemento || "",
      bairro: proposta.bairro || "",
      cidade: proposta.cidade || proposta.cidade_cliente || "",
      estado: proposta.estado || proposta.estado_cliente || "",
      cep: proposta.cep || proposta.cep_cliente || "",
      plano: proposta.produto_nome || proposta.plano_nome || proposta.sigla_plano || proposta.codigo_plano || "",
      cobertura: proposta.cobertura || proposta.tipo_cobertura || "",
      acomodacao: proposta.acomodacao || proposta.tipo_acomodacao || "",
      valor: (() => {
        let valorTitular = proposta.valor_plano || proposta.valor_mensal || proposta.valor || 0;
        if (typeof valorTitular !== "number") {
          valorTitular = String(valorTitular).replace(/[^\d,\.]/g, "").replace(",", ".");
          valorTitular = Number.parseFloat(valorTitular);
        }
        return `R$ ${(!isNaN(valorTitular) && valorTitular > 0 ? valorTitular : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
      })(),
      valor_total: formatarMoeda(calcularValorTotalMensal(proposta)), // Total mensal (titular + dependentes)
      peso: proposta.peso || "",
      altura: proposta.altura || "",
      corretor_nome: proposta.corretor_nome || "",
      corretor_codigo: proposta.corretor_codigo || "",
      data_criacao: proposta.created_at ? proposta.created_at.split("T")[0].split("-").reverse().join("/") : "",
      data_atualizacao: proposta.updated_at ? proposta.updated_at.split("T")[0].split("-").reverse().join("/") : "",
      status: proposta.status || "pendente",
      assinatura: `Assinado digitalmente por: ${proposta.nome || proposta.nome_cliente || ""}\nCPF: ${proposta.cpf || ""}\nE-mail: ${proposta.email || proposta.email_cliente || ""}\nIP: ${proposta.ip || ""}\nData/Hora: ${proposta.data_assinatura || proposta.data_assinatura_digital || ""}\nEste documento foi assinado digitalmente conforme a legislação vigente.`,
      idade_titular: calcularIdade(proposta.data_nascimento),
    }

    // Adicionar até 4 dependentes
    let dependentesArr = dependentes && dependentes.length > 0 ? dependentes : (proposta.dependentes_dados || proposta.dependentes || [])
    if (typeof dependentesArr === "string") {
      try { dependentesArr = JSON.parse(dependentesArr) } catch { dependentesArr = [] }
    }
    dependentesArr.slice(0, 4).forEach((dep: any, idx: number) => {
      const prefixo = `dependente${idx + 1}_`
      dadosPDF[`${prefixo}nome`] = dep.nome || ""
      dadosPDF[`${prefixo}cpf`] = dep.cpf || ""
      dadosPDF[`${prefixo}rg`] = dep.rg || ""
      dadosPDF[`${prefixo}data_nascimento`] = dep.data_nascimento ? dep.data_nascimento.split("T")[0].split("-").reverse().join("/") : ""
      dadosPDF[`${prefixo}parentesco`] = dep.parentesco || ""
      dadosPDF[`${prefixo}cns`] = dep.cns || ""
      dadosPDF[`${prefixo}sexo`] = dep.sexo || ""
      dadosPDF[`${prefixo}estado_civil`] = dep.estado_civil || ""
      dadosPDF[`${prefixo}naturalidade`] = dep.naturalidade || ""
      dadosPDF[`${prefixo}idade`] = calcularIdade(dep.data_nascimento)
      dadosPDF[`${prefixo}valor_individual`] = dep.valor_individual || dep.valor || dep.valor_plano || ""
      dadosPDF[`${prefixo}peso`] = dep.peso || ""
      dadosPDF[`${prefixo}altura`] = dep.altura || ""
      dadosPDF[`${prefixo}assinatura`] = dep.assinatura || ""
      dadosPDF[`${prefixo}nome_mae`] = dep.nome_mae || ""
    })

    // Adicionar respostas do questionário de saúde (se houver)
    if (questionario && questionario.length > 0) {
      console.log("🔍 DEBUG - Processando questionário:", questionario.length, "registros")
      
      // Separar questionários por tipo de pessoa
      const questionariosTitular = questionario.filter(q => q.pessoa_tipo === "titular" || !q.pessoa_tipo)
      const questionariosDependentes = questionario.filter(q => q.pessoa_tipo === "dependente")
      
      console.log(`📊 Questionários encontrados: ${questionariosTitular.length} titular, ${questionariosDependentes.length} dependentes`)
      
      // Processar questionário do titular primeiro
      questionariosTitular.forEach((q: any, idx: number) => {
        // Verificar se é da estrutura questionario_respostas + respostas_questionario
        if (q.respostas_questionario && Array.isArray(q.respostas_questionario)) {
          console.log(`📝 Processando questionário titular ${idx + 1} (estrutura respostas_questionario):`, q.respostas_questionario.length, "respostas")
          
          q.respostas_questionario.forEach((resposta: any, respIdx: number) => {
            const pergunta = resposta.pergunta_texto || resposta.pergunta || `Pergunta ${resposta.pergunta_id || respIdx + 1}`
            const respostaValor = resposta.resposta || ""
            const observacao = resposta.observacao || ""
            
            dadosPDF[`pergunta${respIdx + 1}`] = pergunta
            dadosPDF[`resposta${respIdx + 1}`] = respostaValor
            if (observacao) {
              dadosPDF[`observacao${respIdx + 1}`] = observacao
            }
            
            // Adicionar também variações de nomes de campos para compatibilidade
            dadosPDF[`pergunta_${respIdx + 1}`] = pergunta
            dadosPDF[`resposta_${respIdx + 1}`] = respostaValor
            dadosPDF[`questao${respIdx + 1}`] = pergunta
            dadosPDF[`resp${respIdx + 1}`] = respostaValor
          })
        } else {
          // Estrutura direta (questionario_saude)
          console.log(`📝 Processando questionário titular ${idx + 1} (estrutura direta):`, q)
          
          const pergunta = q.pergunta || q.pergunta_texto || `Pergunta ${q.pergunta_id || idx + 1}`
          const resposta = q.resposta || q.resposta_texto || ""
          const observacao = q.observacao || q.detalhes || ""
          
          dadosPDF[`pergunta${idx + 1}`] = pergunta
          dadosPDF[`resposta${idx + 1}`] = resposta
          if (observacao) {
            dadosPDF[`observacao${idx + 1}`] = observacao
          }
          
          // Adicionar também variações de nomes de campos para compatibilidade
          dadosPDF[`pergunta_${idx + 1}`] = pergunta
          dadosPDF[`resposta_${idx + 1}`] = resposta
          dadosPDF[`questao${idx + 1}`] = pergunta
          dadosPDF[`resp${idx + 1}`] = resposta
        }
      })
      
      // Processar questionários dos dependentes
      questionariosDependentes.forEach((q: any, idx: number) => {
        const dependenteNome = q.pessoa_nome || `Dependente ${idx + 1}`
        console.log(`📝 Processando questionário do dependente: ${dependenteNome}`)
        
        // Verificar se é da estrutura questionario_respostas + respostas_questionario
        if (q.respostas_questionario && Array.isArray(q.respostas_questionario)) {
          console.log(`📝 Processando questionário dependente ${dependenteNome} (estrutura respostas_questionario):`, q.respostas_questionario.length, "respostas")
          
          q.respostas_questionario.forEach((resposta: any, respIdx: number) => {
            const pergunta = resposta.pergunta_texto || resposta.pergunta || `Pergunta ${resposta.pergunta_id || respIdx + 1}`
            const respostaValor = resposta.resposta || ""
            const observacao = resposta.observacao || ""
            
            // Adicionar campos no formato que o modelo PDF espera
            dadosPDF[`resposta${respIdx + 1}_dependente${idx + 1}`] = respostaValor
            if (observacao) {
              dadosPDF[`observacao${respIdx + 1}_dependente${idx + 1}`] = observacao
            }
            
            // Adicionar também variações de nomes de campos para compatibilidade
            dadosPDF[`dependente_${idx + 1}_pergunta${respIdx + 1}`] = pergunta
            dadosPDF[`dependente_${idx + 1}_resposta${respIdx + 1}`] = respostaValor
            dadosPDF[`dep${idx + 1}_pergunta${respIdx + 1}`] = pergunta
            dadosPDF[`dep${idx + 1}_resposta${respIdx + 1}`] = respostaValor
            dadosPDF[`dep${idx + 1}_questao${respIdx + 1}`] = pergunta
            dadosPDF[`dep${idx + 1}_resp${respIdx + 1}`] = respostaValor
          })
        } else {
          // Estrutura direta (questionario_saude)
          console.log(`📝 Processando questionário dependente ${dependenteNome} (estrutura direta):`, q)
          
          const pergunta = q.pergunta || q.pergunta_texto || `Pergunta ${q.pergunta_id || idx + 1}`
          const resposta = q.resposta || q.resposta_texto || ""
          const observacao = q.observacao || q.detalhes || ""
          
          // Adicionar campos no formato que o modelo PDF espera
          dadosPDF[`resposta${idx + 1}_dependente${idx + 1}`] = resposta
          if (observacao) {
            dadosPDF[`observacao${idx + 1}_dependente${idx + 1}`] = observacao
          }
          
          // Adicionar também variações de nomes de campos para compatibilidade
          dadosPDF[`dependente_${idx + 1}_pergunta${idx + 1}`] = pergunta
          dadosPDF[`dependente_${idx + 1}_resposta${idx + 1}`] = resposta
          dadosPDF[`dep${idx + 1}_pergunta${idx + 1}`] = pergunta
          dadosPDF[`dep${idx + 1}_resposta${idx + 1}`] = resposta
          dadosPDF[`dep${idx + 1}_questao${idx + 1}`] = pergunta
          dadosPDF[`dep${idx + 1}_resp${idx + 1}`] = resposta
        }
      })
    }

    console.log("Dados preparados para preenchimento do PDF:", dadosPDF)
    
    // DEBUG: Log detalhado dos campos que podem estar faltando
    console.log("🔍 DEBUG - Campos específicos que podem estar faltando:")
    console.log("   CNS:", dadosPDF.cns)
    console.log("   UF Nascimento:", dadosPDF.uf_nascimento)
    console.log("   Idade Titular:", dadosPDF.idade_titular)
    console.log("   Estado Civil:", dadosPDF.estado_civil)
    console.log("   Naturalidade:", dadosPDF.naturalidade)
    console.log("   Nome da Mãe:", dadosPDF.nome_mae)
    console.log("   Nome do Pai:", dadosPDF.nome_pai)
    console.log("   Nacionalidade:", dadosPDF.nacionalidade)
    console.log("   Profissão:", dadosPDF.profissao)
    console.log("   Órgão Expedidor:", dadosPDF.orgao_expedidor)
    console.log("   Acomodação:", dadosPDF.acomodacao)
    console.log("   Assinatura:", dadosPDF.assinatura ? "Presente" : "Ausente")
    console.log("   Peso Titular:", dadosPDF.peso, "(origem: proposta.peso =", proposta.peso, ")")
    console.log("   Altura Titular:", dadosPDF.altura, "(origem: proposta.altura =", proposta.altura, ")")
    console.log("   Valor Total:", dadosPDF.valor_total)
    
    // DEBUG: Verificar dados dos dependentes
    if (dependentesArr && dependentesArr.length > 0) {
      console.log("🔍 DEBUG - Dados dos dependentes:")
      dependentesArr.forEach((dep: any, idx: number) => {
        console.log(`   Dependente ${idx + 1} (${dep.nome}):`)
        console.log(`     CNS: ${dadosPDF[`dependente${idx + 1}_cns`]}`)
        console.log(`     Idade: ${dadosPDF[`dependente${idx + 1}_idade`]}`)
        console.log(`     UF Nascimento: ${dadosPDF[`dependente${idx + 1}_uf_nascimento`]}`)
        console.log(`     Peso: ${dadosPDF[`dependente${idx + 1}_peso`]} (origem: dep.peso = ${dep.peso})`)
        console.log(`     Altura: ${dadosPDF[`dependente${idx + 1}_altura`]} (origem: dep.altura = ${dep.altura})`)
      })
    }
    
    // DEBUG: Verificar questionário
    if (questionario && questionario.length > 0) {
      console.log("🔍 DEBUG - Questionário de saúde:")
      console.log(`   Total de respostas: ${questionario.length}`)
      questionario.forEach((q: any, idx: number) => {
        console.log(`   Pergunta ${idx + 1}: ${dadosPDF[`pergunta${idx + 1}`]} = ${dadosPDF[`resposta${idx + 1}`]}`)
      })
    }
    
    // DEBUG: Verificar campos dos dependentes
    console.log("🔍 DEBUG - Campos dos dependentes gerados:")
    if (dependentesArr && dependentesArr.length > 0) {
      dependentesArr.forEach((dep: any, idx: number) => {
        console.log(`   Dependente ${idx + 1} (${dep.nome}):`)
        // Verificar campos básicos
        console.log(`     Nome: ${dadosPDF[`dependente${idx + 1}_nome`]}`)
        console.log(`     CPF: ${dadosPDF[`dependente${idx + 1}_cpf`]}`)
        console.log(`     Peso: ${dadosPDF[`dependente${idx + 1}_peso`]}`)
        console.log(`     Altura: ${dadosPDF[`dependente${idx + 1}_altura`]}`)
        
        // Verificar campos de questionário
        for (let i = 1; i <= 21; i++) {
          const campoResposta = `resposta${i}_dependente${idx + 1}`
          if (dadosPDF[campoResposta]) {
            console.log(`     ${campoResposta}: ${dadosPDF[campoResposta]}`)
          }
        }
      })
    }
    
    return dadosPDF
  }

  function formatarData(dataString: any) {
    if (!dataString) return ""
    try {
      const data = new Date(dataString)
      return data.toLocaleDateString("pt-BR")
    } catch (e) {
      return dataString
    }
  }

  function formatarMoeda(valor: any) {
    if (!valor) return ""
    try {
      return typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : valor
    } catch (e) {
      return valor
    }
  }

  async function aprovarProposta(id: any) {
    try {
      await atualizarStatusProposta(id, "aprovada")

      // Buscar dados da proposta para enviar email ao corretor
      const proposta = propostas.find((p) => p.id === id)
      if (proposta && proposta.origem === "propostas_corretores" && proposta.corretor_email) {
        const { enviarEmailPropostaAprovada } = await import("@/services/email-service")

        try {
          await enviarEmailPropostaAprovada(
            proposta.corretor_email,
            proposta.corretor_nome || "Corretor",
            obterNomeCliente(proposta),
            String(proposta.id),
            obterValorProposta(proposta),
            proposta.comissao || 0,
          )
          console.log("✅ Email de aprovação enviado ao corretor")
        } catch (emailError) {
          console.warn("⚠️ Erro ao enviar email ao corretor:", emailError)
          // Não falhar a aprovação por causa do email
        }
      }

      toast.success("Proposta aprovada com sucesso")
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

      // Enviar email ao corretor se for proposta de corretor
      if (propostaDetalhada.origem === "propostas_corretores" && propostaDetalhada.corretor_email) {
        const { enviarEmailPropostaRejeitada } = await import("@/services/email-service")

        try {
          await enviarEmailPropostaRejeitada(
            propostaDetalhada.corretor_email,
            propostaDetalhada.corretor_nome || "Corretor",
            obterNomeCliente(propostaDetalhada),
            String(propostaDetalhada.id),
            motivoRejeicao,
          )
          console.log("✅ Email de rejeição enviado ao corretor")
        } catch (emailError) {
          console.warn("⚠️ Erro ao enviar email ao corretor:", emailError)
          // Não falhar a rejeição por causa do email
        }
      }

      toast.success("Proposta rejeitada com sucesso")
      setShowModalRejeicao(false)
      setMotivoRejeicao("")
      setPropostaDetalhada(null)
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao rejeitar proposta:", error)
      toast.error("Erro ao rejeitar proposta")
    }
  }

  async function enviarEmailValidacao(proposta: any) {
    try {
      if (!proposta.id) {
        throw new Error("Proposta sem ID")
      }

      const emailCliente = obterEmailCliente(proposta)
      const nomeCliente = obterNomeCliente(proposta)

      if (!emailCliente || emailCliente === "Email não informado") {
        throw new Error("Proposta sem email válido")
      }

      setEnviandoEmail(proposta.id)

      const sucesso = await enviarValidacaoEmail(proposta.id, emailCliente, nomeCliente)

      if (sucesso) {
        toast.success("Email de validação enviado com sucesso!")
        carregarPropostas()
      } else {
        throw new Error("Falha no envio do email")
      }
    } catch (error: any) {
      console.error("❌ Erro completo:", error)
      toast.error(error.message || "Erro ao enviar email de validação")
    } finally {
      setEnviandoEmail(null)
    }
  }

  async function enviarParaAnalise(id: any) {
    try {
      await atualizarStatusProposta(id, "pendente")
      toast.success("Proposta enviada para análise com sucesso!")
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao enviar proposta para análise:", error)
      toast.error("Erro ao enviar proposta para análise")
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

  function getOrigemBadge(origem: any) {
    const origemConfig = {
      propostas: { label: "Cliente Direto", color: "bg-slate-50 text-slate-700 border border-slate-200" },
      propostas_corretores: { label: "Via Corretor", color: "bg-gray-50 text-gray-700 border border-gray-200" },
    }

    return origemConfig[origem as keyof typeof origemConfig] || { label: origem, color: "bg-gray-50 text-gray-700 border border-gray-200" }
  }

  function obterIdSeguro(proposta: any) {
    if (!proposta || !proposta.id) return "N/A"
    return String(proposta.id)
  }

  function getTipoArquivo(url: any) {
    const extensao = url.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extensao)) {
      return "imagem"
    } else if (extensao === "pdf") {
      return "pdf"
    }
    return "documento"
  }

  function getNomeDocumento(key: any) {
    const nomes = {
      rg_frente: "RG (Frente)",
      rg_verso: "RG (Verso)",
      cpf: "CPF",
      comprovante_residencia: "Comprovante de Residência",
      cns: "Cartão Nacional de Saúde",
      foto_3x4: "Foto 3x4",
      certidao_nascimento: "Certidão de Nascimento",
      comprovante_renda: "Comprovante de Renda",
    }
    return nomes[key as keyof typeof nomes] || (key.replace(/_/g, " ").replace(/\b\w/g, (l: any) => l.toUpperCase()))
  }

  function getParentescoAmigavel(parentesco: any) {
    const parentescos = {
      conjuge: "Cônjuge",
      filho: "Filho(a)",
      pai: "Pai",
      mae: "Mãe",
      irmao: "Irmão(ã)",
      sogro: "Sogro(a)",
      genro: "Genro/Nora",
      neto: "Neto(a)",
      outro: "Outro",
    }
    return parentescos[parentesco as keyof typeof parentescos] || parentesco
  }

  function calcularIdade(dataNascimento: any) {
    if (!dataNascimento) return "N/A"
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return `${idade} anos`
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

  function formatarDataHoraSegura(dataString: any) {
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

  function renderDeclaracaoSaudeUnificada() {
    if (!questionariosSaude || questionariosSaude.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Declaração de Saúde
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Nenhuma resposta encontrada</p>
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="space-y-6">
        {questionariosSaude.map((q, idx) => (
          <Card key={q.id || idx}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
                {q.pessoa_tipo === "titular"
                  ? "Declaração de Saúde - Titular"
                  : `Declaração de Saúde - ${q.pessoa_nome}`}
          </CardTitle>
        </CardHeader>
            <CardContent>
              <div className="mb-2 text-sm text-gray-700">
                <span className="mr-4">Peso: <b>{q.peso || "-"} kg</b></span>
                <span>Altura: <b>{q.altura || "-"} cm</b></span>
              </div>
              {q.respostas_questionario && q.respostas_questionario.length > 0 ? (
                q.respostas_questionario.map((resposta: any, i: any) => (
                  <div key={i} className="border-l-4 border-blue-200 pl-4 py-2 mb-2">
                    <div className="font-medium text-gray-900 mb-1">Pergunta {resposta.pergunta_id}</div>
                    <div className="text-sm text-gray-600 mb-2">{resposta.pergunta_texto || resposta.pergunta || "Pergunta não disponível"}</div>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${resposta.resposta === "sim" || resposta.resposta === true ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                {resposta.resposta === "sim" || resposta.resposta === true ? "SIM" : "NÃO"}
              </div>
                    {resposta.observacao && (
                <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        <strong>Observações:</strong> {resposta.observacao}
                </div>
              )}
            </div>
                ))
              ) : (
                <div className="text-gray-500">Nenhuma resposta encontrada</div>
              )}
        </CardContent>
      </Card>
        ))}
      </div>
    )
  }

  function renderDocumentos(documentos: any, titulo: any = "Documentos", pessoa: any = "titular") {
    if (!documentos || Object.keys(documentos).length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {titulo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Nenhum documento encontrado</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            {titulo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(documentos as any).map(([tipo, url]: [any, any]) => {
              const nomeDoc = getNomeDocumento(tipo)
              const tipoArquivo = getTipoArquivo(url)
              const nomeArquivo = `${nomeDoc.replace(/[^a-zA-Z0-9]/g, "_")}.${url.split(".").pop()?.toLowerCase() || "pdf"}`

              return (
                <div key={tipo} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{nomeDoc}</div>
                      <div className="text-xs text-gray-500 capitalize">{tipoArquivo}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(url, "_blank")}
                        className="h-8 w-8 p-0"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => baixarDocumentoIndividual(url, nomeArquivo)}
                        disabled={downloadingDoc === nomeArquivo}
                        className="h-8 w-8 p-0"
                        title="Baixar"
                      >
                        {downloadingDoc === nomeArquivo ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  const propostasFiltradas = propostas.filter((proposta) => {
    const nomeCliente = obterNomeCliente(proposta).toLowerCase()
    const emailCliente = obterEmailCliente(proposta).toLowerCase()
    const matchesFiltro = nomeCliente.includes(filtro.toLowerCase()) || emailCliente.includes(filtro.toLowerCase())
    const matchesStatus = statusFiltro === "todos" || proposta.status === statusFiltro
    const matchesOrigem = origemFiltro === "todas" || proposta.origem === origemFiltro

    return matchesFiltro && matchesStatus && matchesOrigem
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
  }, [filtro, statusFiltro, origemFiltro])

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
        <h1 className="text-2xl font-bold text-gray-900">Propostas Recebidas</h1>
        <button
          onClick={carregarPropostas}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          Atualizar Lista
        </button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-gray-900">{propostas.length}</div>
          <div className="text-xs text-gray-600">Total de Propostas</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-blue-700">
            {propostas.filter((p) => p.status === "parcial").length}
          </div>
          <div className="text-xs text-gray-600">Aguardando Validação</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-xl font-bold text-amber-700">
            {propostas.filter((p) => p.status === "pendente").length}
          </div>
          <div className="text-xs text-gray-600">Aguardando Análise</div>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Nome ou email..."
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
            >
              <option value="todos">Todos</option>
              <option value="parcial">Aguardando Validação</option>
              <option value="aguardando_cliente">Aguardando Cliente</option>
              <option value="pendente">Aguardando Análise</option>
              <option value="aprovada">Aprovada</option>
              <option value="rejeitada">Rejeitada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Origem</label>
            <select
              value={origemFiltro}
              onChange={(e) => setOrigemFiltro(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
            >
              <option value="todas">Todas</option>
              <option value="propostas">Clientes Diretos</option>
              <option value="propostas_corretores">Via Corretores</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Propostas */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Propostas</h2>
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
                const statusConfig = getStatusBadge(proposta.status)
                const origemConfig = getOrigemBadge(proposta.origem)
                return (
                  <tr key={`${proposta.origem}-${proposta.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900" title={obterNomeCliente(proposta)}>
                        {obterNomeCliente(proposta)}
                      </div>
                      <div className="text-xs text-gray-500">ID: {obterIdSeguro(proposta)}</div>
                      {(proposta.produto_nome || proposta.produto) && (
                        <div className="text-xs text-gray-600 mt-1">Produto: {proposta.produto_nome || proposta.produto}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-900" title={obterEmailCliente(proposta)}>
                        {obterEmailCliente(proposta)}
                      </div>
                      <div className="text-xs text-gray-500" title={obterTelefoneCliente(proposta)}>
                        {obterTelefoneCliente(proposta)}
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
                        R$ {calcularValorTotalMensal(proposta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500">{formatarDataSegura(proposta.created_at)}</div>
                      <div className="text-xs text-gray-500">{formatarHoraSegura(proposta.created_at)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => abrirModalDetalhes(proposta)}
                          className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs transition-colors"
                        >
                          Ver
                        </button>

                        {proposta.status === "parcial" && (
                          <button
                            onClick={() => enviarEmailValidacao(proposta)}
                            disabled={enviandoEmail === proposta.id}
                            className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded disabled:opacity-50 transition-colors text-xs"
                          >
                            {enviandoEmail === proposta.id ? "..." : "Email"}
                          </button>
                        )}

                        {proposta.status === "pendente" && (
                            <button
                            onClick={() => enviarParaAnalise(proposta.id)}
                            className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors text-xs"
                            >
                            Enviar para Análise
                            </button>
                        )}
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
            <div className="text-gray-500 text-lg">Nenhuma proposta encontrada</div>
            <div className="text-gray-400 text-sm mt-2">
              {filtro || statusFiltro !== "todos" || origemFiltro !== "todas"
                ? "Tente ajustar os filtros de busca"
                : "Aguardando novas propostas"}
            </div>
          </div>
        )}

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

      {/* Modal de Detalhes */}
      {showModalDetalhes && propostaDetalhada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto border border-gray-300">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-900">Detalhes da Proposta</h2>
                <div className="flex gap-3">
                    <Button
                    onClick={() => setShowModalPDF(true)}
                      disabled={generatingPdf}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                    {generatingPdf ? "Gerando PDF..." : "Gerar PDF"}
                  </Button>
                  <Button onClick={() => setShowModalDetalhes(false)} variant="outline">
                    Fechar
                  </Button>
                </div>
              </div>

              {loadingDetalhes ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-600"></div>
                  <span className="ml-4 text-lg text-gray-700">Carregando detalhes...</span>
                </div>
              ) : (
                <Tabs defaultValue="dados" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
                    <TabsTrigger value="documentos">Documentos</TabsTrigger>
                    <TabsTrigger value="saude">Declaração de Saúde</TabsTrigger>
                    <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dados" className="space-y-6 mt-6">
                    {/* Dados do Titular */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Dados do Titular</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Nome Completo</label>
                            <p className="text-gray-900 font-medium">{obterNomeCliente(propostaDetalhada)}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Email</label>
                            <p className="text-gray-900">{obterEmailCliente(propostaDetalhada)}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Telefone</label>
                            <p className="text-gray-900">{obterTelefoneCliente(propostaDetalhada)}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">CPF</label>
                            <p className="text-gray-900">{propostaDetalhada.cpf || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">RG</label>
                            <p className="text-gray-900">{propostaDetalhada.rg || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Órgão Emissor</label>
                            <p className="text-gray-900">{propostaDetalhada.orgao_emissor || propostaDetalhada.orgao_expedidor || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">CNS</label>
                            <p className="text-gray-900">{propostaDetalhada.cns || propostaDetalhada.cns_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Data de Nascimento</label>
                            <p className="text-gray-900">
                              {propostaDetalhada.data_nascimento
                                ? formatarDataSegura(propostaDetalhada.data_nascimento)
                                : "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Idade</label>
                            <p className="text-gray-900">{calcularIdade(propostaDetalhada.data_nascimento)}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Sexo</label>
                            <p className="text-gray-900">{propostaDetalhada.sexo || propostaDetalhada.sexo_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Estado Civil</label>
                            <p className="text-gray-900">{propostaDetalhada.estado_civil || propostaDetalhada.estado_civil_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Naturalidade</label>
                            <p className="text-gray-900">{propostaDetalhada.naturalidade || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">UF de Nascimento</label>
                            <p className="text-gray-900">{propostaDetalhada.uf_nascimento || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Nome da Mãe</label>
                            <p className="text-gray-900">{propostaDetalhada.nome_mae || propostaDetalhada.nome_mae_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Nome do Pai</label>
                            <p className="text-gray-900">{propostaDetalhada.nome_pai || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Nacionalidade</label>
                            <p className="text-gray-900">{propostaDetalhada.nacionalidade || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Profissão</label>
                            <p className="text-gray-900">{propostaDetalhada.profissao || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Assinatura</label>
                            {propostaDetalhada.assinatura || propostaDetalhada.assinatura_imagem ? (
                              <img
                                src={propostaDetalhada.assinatura || propostaDetalhada.assinatura_imagem}
                                alt="Assinatura"
                                style={{ maxWidth: 200, border: "1px solid #ccc", background: "#fff" }}
                              />
                            ) : (
                              <p className="text-gray-900">Não informado</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Endereço */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Endereço</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-600">Logradouro</label>
                            <p className="text-gray-900">
                              {propostaDetalhada.endereco || "Não informado"}
                              {propostaDetalhada.numero && `, ${propostaDetalhada.numero}`}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Complemento</label>
                            <p className="text-gray-900">{propostaDetalhada.complemento || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Bairro</label>
                            <p className="text-gray-900">{propostaDetalhada.bairro || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Cidade</label>
                            <p className="text-gray-900">{propostaDetalhada.cidade || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Estado</label>
                            <p className="text-gray-900">
                              {propostaDetalhada.estado || propostaDetalhada.uf || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">CEP</label>
                            <p className="text-gray-900">{propostaDetalhada.cep || "Não informado"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Informações do Plano */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Informações do Plano</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Produto</label>
                            <p className="text-gray-900 font-medium">
                              {propostaDetalhada.produto_nome || propostaDetalhada.produto || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Plano</label>
                            <p className="text-gray-900">
                              {propostaDetalhada.plano_nome || propostaDetalhada.sigla_plano || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Cobertura</label>
                            <p className="text-gray-900">{propostaDetalhada.cobertura || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Acomodação</label>
                            <p className="text-gray-900">{propostaDetalhada.acomodacao || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Valor Mensal</label>
                            <p className="text-2xl font-bold text-green-600">
                              R$ {calcularValorTotalMensal(propostaDetalhada).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            {/* Detalhamento dos valores se houver dependentes */}
                            {(() => {
                              const dependentesArr = parseDependentes(propostaDetalhada)
                              if (dependentesArr && dependentesArr.length > 0) {
                                return (
                                  <div className="mt-2 text-xs text-gray-600">
                                    <div><b>{propostaDetalhada.nome}</b>: R$ {((typeof propostaDetalhada.valor_mensal !== "number" ? String(propostaDetalhada.valor_mensal).replace(/[^\d,\.]/g, "").replace(",", ".") : propostaDetalhada.valor_mensal) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                                    {dependentesArr.map((dep: any, idx: number) => {
                                      let valorDep = dep.valor_individual || dep.valor || dep.valor_plano || 0
                                      if (typeof valorDep !== "number") {
                                        valorDep = String(valorDep).replace(/[^\d,\.]/g, "").replace(",", ".")
                                        valorDep = Number.parseFloat(valorDep)
                                      }
                                      return (
                                        <div key={idx}><b>{dep.nome}</b>: R$ {(!isNaN(valorDep) && valorDep > 0 ? valorDep : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                                      )
                                    })}
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600">Status</label>
                            <Badge className={getStatusBadge(propostaDetalhada.status).color}>
                              {getStatusBadge(propostaDetalhada.status).label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="documentos" className="space-y-6 mt-6">
                    {/* Documentos do Titular */}
                    {renderDocumentos(
                      obterDocumentosInteligente(propostaDetalhada, "titular"),
                      "Documentos do Titular",
                      "titular",
                    )}

                    {/* Documentos dos Dependentes */}
                    {dependentes.map((dependente: any, index: any) => {
                      const documentosDep = obterDocumentosInteligente(dependente, "dependente")
                      if (Object.keys(documentosDep).length > 0) {
                        return renderDocumentos(
                          documentosDep,
                          `Documentos - ${dependente.nome} (${getParentescoAmigavel(dependente.parentesco)})`,
                          "dependente",
                        )
                      }
                      return null
                    })}
                  </TabsContent>

                  <TabsContent value="saude" className="space-y-6 mt-6">
                    {renderDeclaracaoSaudeUnificada()}
                  </TabsContent>

                  <TabsContent value="dependentes" className="space-y-6 mt-6">
                    {dependentes.length === 0 ? (
                      <Card>
                        <CardContent className="text-center py-8">
                          <p className="text-gray-500">Nenhum dependente cadastrado</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {dependentes.map((dependente: any, index: any) => (
                          <Card key={dependente.id || index}>
                            <CardHeader>
                              <CardTitle className="text-lg">
                                {dependente.nome} - {getParentescoAmigavel(dependente.parentesco)}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-600">Nome Completo</label>
                                  <p className="text-gray-900">{dependente.nome || "Não informado"}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-600">CPF</label>
                                  <p className="text-gray-900">{dependente.cpf || "Não informado"}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-600">Data de Nascimento</label>
                                  <p className="text-gray-900">
                                    {dependente.data_nascimento
                                      ? formatarDataSegura(dependente.data_nascimento)
                                      : "Não informado"}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-600">Idade</label>
                                  <p className="text-gray-900">{calcularIdade(dependente.data_nascimento)}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-600">Sexo</label>
                                  <p className="text-gray-900">{dependente.sexo || "Não informado"}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-600">Parentesco</label>
                                  <p className="text-gray-900">{getParentescoAmigavel(dependente.parentesco)}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rejeição */}
      {showModalRejeicao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 border border-gray-300">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Rejeitar Proposta</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da rejeição:</label>
              <textarea
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                rows={4}
                placeholder="Descreva o motivo da rejeição..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModalRejeicao(false)
                  setMotivoRejeicao("")
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={rejeitarProposta}
                disabled={!motivoRejeicao.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Modelo PDF */}
      {showModalPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Selecionar Modelo de Proposta</h3>
            <p className="text-gray-600 mb-4">
              Escolha o modelo que será usado para gerar o PDF da proposta
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo <span className="text-red-500">*</span>
              </label>
              <Select value={modeloSelecionado} onValueChange={setModeloSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelosProposta.map((modelo) => (
                    <SelectItem key={modelo.id} value={modelo.id}>
                      {modelo.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModalPDF(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={gerarPDFComModelo}
                disabled={generatingPdf || !modeloSelecionado}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {generatingPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    Gerar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {pdfUrlGerado && (
        <div className="mt-4 text-center">
          <a
            href={pdfUrlGerado}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Baixar PDF Gerado
          </a>
          <button
            className="block mt-2 text-xs text-gray-500 underline"
            onClick={() => setPdfUrlGerado(null)}
          >
            Fechar link
          </button>
        </div>
      )}
    </div>
  )
}
