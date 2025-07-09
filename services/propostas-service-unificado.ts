import { supabase } from "@/lib/supabase"
import { validarCPF, removerFormatacaoCPF } from "@/utils/validacoes"

// Interfaces para tipagem
interface PropostaUnificada {
  id: string
  origem: "propostas" | "propostas_corretores"
  tabela_origem?: string
  nome_cliente?: string
  email_cliente?: string
  telefone_cliente?: string
  status: string
  created_at: string
  updated_at?: string
  valor_total?: number
  corretor_nome?: string
  corretor_email?: string
  comissao?: number
  email_validacao_enviado?: boolean
  email_enviado_em?: string
  [key: string]: any
}

interface DependenteData {
  id: string
  nome: string
  cpf?: string
  parentesco: string
  data_nascimento?: string
  sexo?: string
  valor_individual?: number
  [key: string]: any
}

interface QuestionarioSaudeData {
  id: string
  pergunta_id: number
  pergunta_texto?: string
  resposta: "sim" | "nao"
  detalhes?: string
  [key: string]: any
}

/**
 * Busca todas as propostas da tabela unificada 'propostas'
 * Agora todas as propostas (diretas e de corretores) estão na mesma tabela
 */
export async function buscarPropostas(): Promise<PropostaUnificada[]> {
  try {
    console.log("🔍 BUSCANDO PROPOSTAS DA TABELA UNIFICADA...")
    console.log("=".repeat(50))

    // Buscar todas as propostas da tabela unificada (sem JOIN)
    const { data: propostas, error } = await supabase
      .from("propostas")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Erro ao buscar propostas:", error)
      throw error
    }

    console.log(`✅ Encontradas ${propostas?.length || 0} propostas na tabela unificada`)

    // Buscar dados dos corretores separadamente se necessário
    const corretoresIds = propostas
      ?.filter((p) => p.corretor_id)
      .map((p) => p.corretor_id)
      .filter((id, index, arr) => arr.indexOf(id) === index) // IDs únicos

    let corretoresData = []
    if (corretoresIds && corretoresIds.length > 0) {
      console.log(`🔍 Buscando dados de ${corretoresIds.length} corretores...`)

      const { data: corretores, error: corretoresError } = await supabase
        .from("corretores")
        .select("id, nome, email")
        .in("id", corretoresIds)

      if (corretoresError) {
        console.warn("⚠️ Erro ao buscar corretores:", corretoresError)
        // Não falhar por causa dos corretores
      } else {
        corretoresData = corretores || []
        console.log(`✅ Encontrados ${corretoresData.length} corretores`)
      }
    }

    // Processar e padronizar os dados
    const propostasProcessadas: PropostaUnificada[] = (propostas || []).map((proposta) => {
      // Determinar origem baseado na presença do corretor_id
      const origem = proposta.corretor_id ? "propostas_corretores" : "propostas"

      // Buscar dados do corretor
      const corretor = corretoresData.find((c) => c.id === proposta.corretor_id)

      console.log(`📋 Processando proposta ${proposta.id}:`)
      console.log(`   - Corretor ID: ${proposta.corretor_id}`)
      console.log(`   - Corretor dados: ${corretor ? corretor.nome : "null"}`)
      console.log(`   - Status: ${proposta.status}`)
      console.log(`   - Email enviado: ${proposta.email_validacao_enviado}`)
      console.log(`   - Origem determinada: ${origem}`)

      return {
        ...proposta,
        origem,
        tabela_origem: "propostas", // Sempre propostas agora
        nome_cliente: obterNomeCliente(proposta),
        email_cliente: obterEmailCliente(proposta),
        telefone_cliente: obterTelefoneCliente(proposta),
        valor_total: obterValorProposta(proposta),
        corretor_nome: corretor?.nome || proposta.corretor_nome || null,
        corretor_email: corretor?.email || proposta.corretor_email || null,
        comissao: proposta.comissao || 0,
        email_validacao_enviado: proposta.email_validacao_enviado || false,
        email_enviado_em: proposta.email_enviado_em || null,
      }
    })

    console.log(`🎉 TOTAL DE PROPOSTAS PROCESSADAS: ${propostasProcessadas.length}`)
    console.log(`📊 Propostas diretas: ${propostasProcessadas.filter((p) => p.origem === "propostas").length}`)
    console.log(
      `📊 Propostas de corretores: ${propostasProcessadas.filter((p) => p.origem === "propostas_corretores").length}`,
    )

    // Log detalhado dos status e emails
    const statusCount = propostasProcessadas.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    console.log("📊 Status das propostas:", statusCount)

    const emailCount = {
      enviados: propostasProcessadas.filter((p) => p.email_validacao_enviado).length,
      nao_enviados: propostasProcessadas.filter((p) => !p.email_validacao_enviado).length,
    }
    console.log("📧 Status dos emails:", emailCount)

    console.log("=".repeat(50))

    return propostasProcessadas
  } catch (error) {
    console.error("❌ ERRO GERAL ao buscar propostas:", error)
    throw error
  }
}

/**
 * Busca uma proposta completa por ID
 * Agora sempre busca na tabela 'propostas'
 */
export async function buscarPropostaCompleta(id: string): Promise<PropostaUnificada | null> {
  try {
    console.log(`🔍 Buscando proposta completa - ID: ${id}`)

    const { data: proposta, error } = await supabase.from("propostas").select("*").eq("id", id).single()

    if (error) {
      console.error("❌ Erro ao buscar proposta:", error)
      return null
    }

    if (!proposta) {
      console.log("❌ Proposta não encontrada")
      return null
    }

    console.log("✅ Proposta encontrada na tabela unificada")

    // Buscar dados do corretor se existir
    let corretor = null
    if (proposta.corretor_id) {
      const { data: corretorData, error: corretorError } = await supabase
        .from("corretores")
        .select("id, nome, email")
        .eq("id", proposta.corretor_id)
        .single()

      if (corretorError) {
        console.warn("⚠️ Erro ao buscar corretor:", corretorError)
      } else {
        corretor = corretorData
      }
    }

    // Determinar origem baseado na presença do corretor_id
    const origem = proposta.corretor_id ? "propostas_corretores" : "propostas"

    return {
      ...proposta,
      origem,
      tabela_origem: "propostas",
      nome_cliente: obterNomeCliente(proposta),
      email_cliente: obterEmailCliente(proposta),
      telefone_cliente: obterTelefoneCliente(proposta),
      valor_total: obterValorProposta(proposta),
      corretor_nome: corretor?.nome || proposta.corretor_nome || null,
      corretor_email: corretor?.email || proposta.corretor_email || null,
      comissao: proposta.comissao || 0,
      email_validacao_enviado: proposta.email_validacao_enviado || false,
      email_enviado_em: proposta.email_enviado_em || null,
    }
  } catch (error) {
    console.error("❌ Erro ao buscar proposta completa:", error)
    return null
  }
}

/**
 * Busca dependentes de uma proposta
 * Agora sempre busca na tabela 'dependentes' (unificada)
 */
export async function buscarDependentesProposta(propostaId: string): Promise<DependenteData[]> {
  try {
    console.log(`🔍 Buscando dependentes da proposta: ${propostaId}`)

    const { data: dependentes, error } = await supabase
      .from("dependentes")
      .select("*")
      .eq("proposta_id", propostaId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("❌ Erro ao buscar dependentes:", error)
      return []
    }

    if (dependentes && dependentes.length > 0) {
      console.log(`✅ Encontrados ${dependentes.length} dependentes`)
      return dependentes
    }

    console.log("ℹ️ Nenhum dependente encontrado para esta proposta")
    return []
  } catch (error) {
    console.error("❌ Erro ao buscar dependentes:", error)
    return []
  }
}

/**
 * Busca questionário de saúde de uma proposta
 */
export async function buscarQuestionarioSaude(
  propostaId: string,
  dependenteId?: string,
): Promise<QuestionarioSaudeData[]> {
  try {
    console.log(
      `🔍 Buscando questionário de saúde - Proposta: ${propostaId}${dependenteId ? `, Dependente: ${dependenteId}` : " (titular)"}`,
    )

    let query = supabase.from("questionario_saude").select("*").eq("proposta_id", propostaId)

    if (dependenteId) {
      query = query.eq("dependente_id", dependenteId)
    } else {
      query = query.is("dependente_id", null)
    }

    const { data, error } = await query.order("pergunta_id", { ascending: true })

    if (error) {
      console.error("❌ Erro ao buscar questionário de saúde:", error)
      return []
    }

    if (data && data.length > 0) {
      console.log(`✅ Encontradas ${data.length} respostas do questionário`)
      return data
    }

    console.log("ℹ️ Nenhum questionário de saúde encontrado")
    return []
  } catch (error) {
    console.error("❌ Erro ao buscar questionário de saúde:", error)
    return []
  }
}

/**
 * Atualiza o status de uma proposta - CORRIGIDO
 * Agora sempre atualiza na tabela 'propostas'
 */
export async function atualizarStatusProposta(id: string, status: string, motivo?: string): Promise<boolean> {
  try {
    console.log(`🔄 Atualizando status da proposta ${id} para: ${status}`)

    // Preparar dados de atualização
    const dadosAtualizacao: any = {
      status,
      motivo_rejeicao: motivo || null,
    }

    // Tentar adicionar updated_at se a coluna existir
    try {
      dadosAtualizacao.updated_at = new Date().toISOString()
    } catch (error) {
      console.warn("⚠️ Campo updated_at pode não existir, continuando sem ele")
    }

    const { error } = await supabase.from("propostas").update(dadosAtualizacao).eq("id", id)

    if (error) {
      console.error("❌ Erro ao atualizar status:", error)

      // Se falhar com updated_at, tentar sem ele
      if (error.message?.includes("updated_at") || error.message?.includes("atualizado_em")) {
        console.log("🔄 Tentando atualizar sem campo de timestamp...")

        const { error: error2 } = await supabase
          .from("propostas")
          .update({
            status,
            motivo_rejeicao: motivo || null,
          })
          .eq("id", id)

        if (error2) {
          console.error("❌ Erro na segunda tentativa:", error2)
          return false
        }

        console.log("✅ Status atualizado com sucesso (sem timestamp)")
        return true
      }

      return false
    }

    console.log("✅ Status atualizado com sucesso")
    return true
  } catch (error) {
    console.error("❌ Erro ao atualizar status da proposta:", error)
    return false
  }
}

/**
 * Envia email de validação para o cliente - CORRIGIDO
 */
export async function enviarValidacaoEmail(
  propostaId: string,
  emailCliente: string,
  nomeCliente: string,
): Promise<boolean> {
  try {
    console.log(`📧 Enviando email de validação para: ${emailCliente}`)
    console.log(`📧 Proposta ID: ${propostaId}`)
    console.log(`📧 Cliente: ${nomeCliente}`)

    // Importar o serviço de email dinamicamente para evitar problemas de dependência circular
    const { enviarEmailValidacaoProposta } = await import("@/services/email-service")

    const sucesso = await enviarEmailValidacaoProposta(emailCliente, nomeCliente, propostaId)

    if (sucesso) {
      console.log("✅ Email de validação enviado com sucesso")
      console.log("📧 Flag de email será atualizada pelo serviço de email")
      return true
    }

    console.error("❌ Falha no envio do email de validação")
    return false
  } catch (error) {
    console.error("❌ Erro ao enviar email de validação:", error)
    return false
  }
}

/**
 * Cria uma nova proposta na tabela unificada com validação de CPF
 */
export async function criarProposta(dadosProposta: any): Promise<string | null> {
  try {
    console.log("🚀 Criando nova proposta na tabela unificada...")
    console.log("📋 Dados recebidos:", dadosProposta)

    // GARANTIR QUE O NOME DO CORRETOR SERÁ SALVO
    if (dadosProposta.corretor_id && !dadosProposta.corretor_nome) {
      const { data: corretor, error } = await supabase
        .from("corretores")
        .select("nome")
        .eq("id", dadosProposta.corretor_id)
        .single()
      if (corretor && corretor.nome) {
        dadosProposta.corretor_nome = corretor.nome
        console.log("✅ Nome do corretor preenchido automaticamente:", corretor.nome)
      } else {
        console.warn("⚠️ Não foi possível preencher o nome do corretor automaticamente.")
      }
    }

    // VALIDAR E FORMATAR CPF DO TITULAR
    if (dadosProposta.cpf) {
      const cpfLimpo = removerFormatacaoCPF(dadosProposta.cpf)
      console.log("🔍 Validando CPF do titular:", cpfLimpo)

      if (!validarCPF(cpfLimpo)) {
        throw new Error(`CPF do titular inválido: ${dadosProposta.cpf}`)
      }

      // Usar CPF sem formatação para salvar no banco
      dadosProposta.cpf = cpfLimpo
      dadosProposta.cpf_cliente = cpfLimpo
      console.log("✅ CPF do titular validado e formatado:", cpfLimpo)
    }

    // VALIDAR CPF DOS DEPENDENTES SE HOUVER
    if (dadosProposta.dependentes && Array.isArray(dadosProposta.dependentes)) {
      for (let i = 0; i < dadosProposta.dependentes.length; i++) {
        const dependente = dadosProposta.dependentes[i]
        if (dependente.cpf) {
          const cpfDependenteLimpo = removerFormatacaoCPF(dependente.cpf)
          console.log(`🔍 Validando CPF do dependente ${i + 1}:`, cpfDependenteLimpo)

          if (!validarCPF(cpfDependenteLimpo)) {
            throw new Error(`CPF do dependente ${i + 1} inválido: ${dependente.cpf}`)
          }

          // Usar CPF sem formatação
          dadosProposta.dependentes[i].cpf = cpfDependenteLimpo
          console.log(`✅ CPF do dependente ${i + 1} validado:`, cpfDependenteLimpo)
        }
      }
    }

    // Preparar dados para inserção
    const dadosParaInserir = {
      ...dadosProposta,
      email_validacao_enviado: false, // CORRIGIDO: Inicializar como false
      created_at: new Date().toISOString(),
    }

    // Tentar adicionar updated_at se possível
    try {
      dadosParaInserir.updated_at = new Date().toISOString()
    } catch (error) {
      console.warn("⚠️ Campo updated_at pode não existir, continuando sem ele")
    }

    console.log("💾 Inserindo proposta na tabela...")
    console.log("📋 Status da proposta:", dadosParaInserir.status)
    console.log("📧 Email enviado inicializado como:", dadosParaInserir.email_validacao_enviado)

    const { data: novaProposta, error } = await supabase
      .from("propostas")
      .insert([dadosParaInserir])
      .select("id")
      .single()

    if (error) {
      console.error("❌ Erro detalhado ao inserir proposta:", error)
      console.error("❌ Código do erro:", error.code)
      console.error("❌ Mensagem do erro:", error.message)
      console.error("❌ Detalhes do erro:", error.details)

      // Se falhar com updated_at, tentar sem ele
      if (error.message?.includes("updated_at") || error.message?.includes("atualizado_em")) {
        console.log("🔄 Tentando inserir sem campo updated_at...")

        const dadosSemTimestamp = { ...dadosParaInserir }
        delete dadosSemTimestamp.updated_at

        const { data: novaProposta2, error: error2 } = await supabase
          .from("propostas")
          .insert([dadosSemTimestamp])
          .select("id")
          .single()

        if (error2) {
          console.error("❌ Erro na segunda tentativa:", error2)
          throw error2
        }

        if (!novaProposta2 || !novaProposta2.id) {
          throw new Error("Proposta não foi criada corretamente - ID não retornado")
        }

        console.log("✅ Proposta criada com sucesso (sem updated_at)!")
        console.log("🆔 ID da proposta:", novaProposta2.id)
        return novaProposta2.id.toString()
      }

      throw error
    }

    if (!novaProposta || !novaProposta.id) {
      console.error("❌ Proposta inserida mas ID não retornado")
      console.error("❌ Dados retornados:", novaProposta)
      throw new Error("Proposta não foi criada corretamente - ID não retornado")
    }

    console.log("✅ Proposta criada com sucesso!")
    console.log("🆔 ID da proposta:", novaProposta.id)

    return novaProposta.id.toString()
  } catch (error) {
    console.error("❌ Erro ao criar proposta:", error)

    // Log adicional para debug
    if (error instanceof Error) {
      console.error("❌ Mensagem do erro:", error.message)
      console.error("❌ Stack do erro:", error.stack)
    }

    return null
  }
}

/**
 * Busca propostas por corretor (para a página do corretor)
 */
export async function buscarPropostasPorCorretor(corretorId: string): Promise<PropostaUnificada[]> {
  try {
    console.log(`🔍 Buscando propostas do corretor: ${corretorId}`)

    const { data: propostas, error } = await supabase
      .from("propostas")
      .select("*")
      .eq("corretor_id", corretorId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Erro ao buscar propostas do corretor:", error)
      throw error
    }

    console.log(`✅ Encontradas ${propostas?.length || 0} propostas do corretor`)

    // Buscar dados do corretor
    let corretor = null
    if (corretorId) {
      const { data: corretorData, error: corretorError } = await supabase
        .from("corretores")
        .select("id, nome, email")
        .eq("id", corretorId)
        .single()

      if (corretorError) {
        console.warn("⚠️ Erro ao buscar corretor:", corretorError)
      } else {
        corretor = corretorData
      }
    }

    // Processar e padronizar os dados
    const propostasProcessadas: PropostaUnificada[] = (propostas || []).map((proposta) => {
      console.log(`🔍 DEBUG - Dados brutos da proposta ${proposta.id}:`, {
        valor_total: proposta.valor_total,
        valor_mensal: proposta.valor_mensal,
        valor_proposta: proposta.valor_proposta,
        valor: proposta.valor,
        tipos: {
          valor_total: typeof proposta.valor_total,
          valor_mensal: typeof proposta.valor_mensal,
          valor_proposta: typeof proposta.valor_proposta,
          valor: typeof proposta.valor
        }
      })

      const valorProcessado = obterValorProposta(proposta)
      console.log(`🎯 Valor processado para proposta ${proposta.id}:`, valorProcessado)

      return {
      ...proposta,
      origem: "propostas_corretores",
      tabela_origem: "propostas",
      nome_cliente: obterNomeCliente(proposta),
      email_cliente: obterEmailCliente(proposta),
      telefone_cliente: obterTelefoneCliente(proposta),
        valor_total: valorProcessado,
      corretor_nome: corretor?.nome || proposta.corretor_nome || null,
      corretor_email: corretor?.email || proposta.corretor_email || null,
      comissao: proposta.comissao || 0,
      email_validacao_enviado: proposta.email_validacao_enviado || false,
      email_enviado_em: proposta.email_enviado_em || null,
      }
    })

    return propostasProcessadas
  } catch (error) {
    console.error("❌ Erro ao buscar propostas do corretor:", error)
    throw error
  }
}

/**
 * Funções auxiliares para obter dados de forma inteligente
 */
export function obterNomeCliente(proposta: any): string {
  return proposta?.nome_cliente || proposta?.nome || proposta?.cliente || "Nome não informado"
}

export function obterEmailCliente(proposta: any): string {
  return proposta?.email_cliente || proposta?.email || "Email não informado"
}

export function obterTelefoneCliente(proposta: any): string {
  return proposta?.telefone_cliente || proposta?.telefone || proposta?.whatsapp_cliente || "Telefone não informado"
}

export function obterValorProposta(proposta: any): number {
  // Tentar diferentes campos de valor
  const valorTotal = proposta?.valor_total
  const valorMensal = proposta?.valor_mensal
  const valorProposta = proposta?.valor_proposta
  const valor = proposta?.valor

  console.log(`🔍 DEBUG obterValorProposta - Proposta ${proposta?.id}:`, {
    valorTotal,
    valorMensal,
    valorProposta,
    valor,
    tipos: {
      valorTotal: typeof valorTotal,
      valorMensal: typeof valorMensal,
      valorProposta: typeof valorProposta,
      valor: typeof valor
    },
    valorTotalString: String(valorTotal),
    valorMensalString: String(valorMensal)
  })

  // Função para converter valor corretamente
  const converterValor = (valor: any): number => {
    if (valor === null || valor === undefined) return 0
    
    console.log(`🔍 converterValor - Entrada:`, { valor, tipo: typeof valor })
    
    // Se for string, tratar separadores
    if (typeof valor === 'string') {
      // Verificar se é um valor com separador de milhar incorreto
      // Ex: "1.127" (deveria ser "1127") vs "748.75" (que está correto)
      
      if (valor.includes('.')) {
        const partes = valor.split('.')
        console.log(`🔍 Analisando string com ponto:`, { valor, partes })
        
        // Se a parte após o ponto tem 3 dígitos e não contém zeros, é separador de milhar
        if (partes[1] && partes[1].length === 3 && !partes[1].includes('0')) {
          console.log(`🔧 Detectado separador de milhar incorreto: "${valor}"`)
          const valorCorrigido = valor.replace('.', '')
          console.log(`📝 String corrigida: "${valor}" → "${valorCorrigido}"`)
          return parseFloat(valorCorrigido) || 0
        } else {
          console.log(`✅ Valor decimal válido, mantendo: "${valor}"`)
          // Trocar vírgula por ponto se houver
          const valorLimpo = valor.replace(',', '.')
          return parseFloat(valorLimpo) || 0
        }
      } else {
        // Sem ponto, só trocar vírgula por ponto se houver
        const valorLimpo = valor.replace(',', '.')
        console.log(`📝 String sem ponto processada: "${valor}" → "${valorLimpo}"`)
        return parseFloat(valorLimpo) || 0
      }
    }
    
    // Se for número, retornar diretamente
    if (typeof valor === 'number') {
      console.log(`✅ Número direto: ${valor}`)
      return valor
    }
    
    console.log(`⚠️ Tipo não reconhecido, retornando 0`)
    return 0
  }

  // Converter para número de forma segura
  let valorNumerico = 0

  if (valorTotal !== null && valorTotal !== undefined) {
    console.log(`📝 Processando valorTotal: "${valorTotal}" (tipo: ${typeof valorTotal})`)
    valorNumerico = converterValor(valorTotal)
    console.log(`✅ Usando valor_total: ${valorTotal} → ${valorNumerico}`)
  } else if (valorMensal !== null && valorMensal !== undefined) {
    console.log(`📝 Processando valorMensal: "${valorMensal}" (tipo: ${typeof valorMensal})`)
    valorNumerico = converterValor(valorMensal)
    console.log(`✅ Usando valor_mensal: ${valorMensal} → ${valorNumerico}`)
  } else if (valorProposta !== null && valorProposta !== undefined) {
    console.log(`📝 Processando valorProposta: "${valorProposta}" (tipo: ${typeof valorProposta})`)
    valorNumerico = converterValor(valorProposta)
    console.log(`✅ Usando valor_proposta: ${valorProposta} → ${valorNumerico}`)
  } else if (valor !== null && valor !== undefined) {
    console.log(`📝 Processando valor: "${valor}" (tipo: ${typeof valor})`)
    valorNumerico = converterValor(valor)
    console.log(`✅ Usando valor: ${valor} → ${valorNumerico}`)
  } else {
    console.log(`⚠️ Nenhum valor encontrado, usando 0`)
  }

  // Garantir que o valor seja um número válido
  if (isNaN(valorNumerico)) {
    console.warn("⚠️ Valor inválido encontrado na proposta:", { valorTotal, valorMensal, valorProposta, valor })
    return 0
  }

  console.log(`🎯 Valor final retornado: ${valorNumerico}`)
  return valorNumerico
}

/**
 * Função inteligente para obter documentos de uma proposta ou dependente
 */
export function obterDocumentosInteligente(
  item: any,
  tipo: "titular" | "dependente" = "titular",
): Record<string, string> {
  const documentos: Record<string, string> = {}

  if (!item) return documentos

  // Lista de possíveis campos de documentos
  const camposDocumentos = [
    "rg_frente_url",
    "rg_verso_url",
    "cpf_url",
    "comprovante_residencia_url",
    "cns_url",
    "foto_3x4_url",
    "certidao_nascimento_url",
    "comprovante_renda_url",
    "documento_rg_frente",
    "documento_rg_verso",
    "documento_cpf",
    "documento_comprovante_residencia",
    "documento_cns",
    "documento_foto_3x4",
    "documento_certidao_nascimento",
    "documento_comprovante_renda",
  ]

  // Verificar cada campo possível
  camposDocumentos.forEach((campo) => {
    if (item[campo] && typeof item[campo] === "string" && item[campo].trim() !== "") {
      // Extrair o nome do documento do campo
      const nomeDoc = campo.replace("_url", "").replace("documento_", "")

      documentos[nomeDoc] = item[campo]
    }
  })

  console.log(`📄 Documentos encontrados para ${tipo}:`, Object.keys(documentos))
  return documentos
}
