import { supabase } from "@/lib/supabase"

interface DadosProposta {
  nome: string
  cpf: string
  rg: string
  data_nascimento: string
  email: string
  telefone: string
  nome_mae: string
  sexo: string
  estado_civil: string
  naturalidade: string
  nome_pai: string
  nacionalidade: string
  profissao: string
  orgao_expedidor: string
  uf_nascimento: string
  endereco: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  plano: string
  cobertura: string
  acomodacao: string
  valor: string
  peso: string
  altura: string
  corretor_nome: string
  corretor_codigo: string
  data_criacao: string
  data_atualizacao: string
  status?: string
  [key: string]: any
}

interface ModeloProposta {
  id: string
  titulo: string
  arquivo_url: string
  ativo: boolean
}

export class PDFService {
  /**
   * Busca todos os modelos de propostas ativos
   */
  static async buscarModelos(): Promise<ModeloProposta[]> {
    try {
      const { data, error } = await supabase
        .from("modelos_propostas")
        .select("*")
        .eq("ativo", true)
        .order("titulo")

      if (error) {
        console.error("Erro ao buscar modelos:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("Erro ao buscar modelos de proposta:", error)
      throw error
    }
  }

  /**
   * Preenche um modelo PDF com os dados da proposta
   */
  static async preencherModeloPDF(
    modeloUrl: string,
    dados: DadosProposta,
    nomeArquivo: string
  ): Promise<string> {
    try {
      console.log("🔄 Iniciando preenchimento do modelo PDF...")
      console.log("📋 Dados para preenchimento:", dados)

      // 1. Baixar o modelo PDF
      const modeloResponse = await fetch(modeloUrl)
      if (!modeloResponse.ok) {
        throw new Error(`Erro ao baixar modelo: ${modeloResponse.status}`)
      }

      const modeloBlob = await modeloResponse.blob()
      const modeloArrayBuffer = await modeloBlob.arrayBuffer()

      // 2. Importar a biblioteca PDF-lib dinamicamente
      const { PDFDocument, PDFForm, PDFTextField } = await import("pdf-lib")

      // 3. Carregar o documento PDF
      const pdfDoc = await PDFDocument.load(modeloArrayBuffer)
      const form = pdfDoc.getForm()

      // 4. Preencher os campos do formulário
      await this.preencherCamposFormulario(form, dados)

      // 5. Adicionar marca d'água baseada no status
      await this.adicionarMarcaDagua(pdfDoc, dados.status || "pendente")

      // 6. Salvar o PDF preenchido
      const pdfBytes = await pdfDoc.save()

      // 7. Fazer upload do PDF gerado
      const url = await this.fazerUploadPDF(pdfBytes, nomeArquivo)

      console.log("✅ PDF gerado com sucesso:", url)
      return url
    } catch (error) {
      console.error("❌ Erro ao preencher modelo PDF:", error)
      throw error
    }
  }

  /**
   * Preenche os campos do formulário PDF
   */
  private static async preencherCamposFormulario(form: any, dados: DadosProposta) {
    try {
      const campos = form.getFields()
      console.log(`📝 Preenchendo ${campos.length} campos...`)
      
      // DEBUG: Listar todos os campos do PDF
      console.log("🔍 DEBUG - Todos os campos do PDF:")
      campos.forEach((campo: any, index: number) => {
        if (campo && typeof campo.getName === 'function') {
          console.log(`   ${index + 1}. ${campo.getName()}`)
        }
      })

      campos.forEach((campo: any) => {
        if (campo && typeof campo.setText === 'function') {
          const nomeCampo = campo.getName()
          let valorEncontrado = null

          // 1. Tentar correspondência exata no objeto de dados
          if (dados.hasOwnProperty(nomeCampo)) {
            valorEncontrado = dados[nomeCampo]
          } else if (dados.hasOwnProperty(nomeCampo.toLowerCase())) {
            valorEncontrado = dados[nomeCampo.toLowerCase()]
          } else if (dados.hasOwnProperty(nomeCampo.toUpperCase())) {
            valorEncontrado = dados[nomeCampo.toUpperCase()]
          }

          // 2. Se não encontrou, tentar no mapeamento padrão (mantém compatibilidade)
          if (!valorEncontrado) {
            const mapeamentoCampos: Record<string, any> = {
              // Dados pessoais do TITULAR (mais específicos)
              "nome_titular": dados.nome,
              "cpf_titular": dados.cpf,
              "rg_titular": dados.rg,
              "data_nascimento_titular": dados.data_nascimento,
              "email_titular": dados.email,
              "telefone_titular": dados.telefone,
              "nome_mae_titular": dados.nome_mae,
              "sexo_titular": dados.sexo,
              "estado_civil_titular": dados.estado_civil,
              "naturalidade_titular": dados.naturalidade,
              "nome_pai_titular": dados.nome_pai,
              "nacionalidade_titular": dados.nacionalidade,
              "profissao_titular": dados.profissao,
              "orgao_expedidor_titular": dados.orgao_expedidor,
              "uf_nascimento_titular": dados.uf_nascimento,

              // Dados pessoais (campos genéricos - apenas se não houver específicos)
              nome: dados.nome,
              cpf: dados.cpf,
              rg: dados.rg,
              "data_nascimento": dados.data_nascimento,
              email: dados.email,
              telefone: dados.telefone,
              "nome_mae": dados.nome_mae,
              sexo: dados.sexo,
              "estado_civil": dados.estado_civil,
              naturalidade: dados.naturalidade,
              "nome_pai": dados.nome_pai,
              nacionalidade: dados.nacionalidade,
              profissao: dados.profissao,
              "orgao_expedidor": dados.orgao_expedidor,
              "uf_nascimento": dados.uf_nascimento,
              "uf": dados.uf_nascimento,
              "estado_nascimento": dados.uf_nascimento,

              // Endereço
              endereco: dados.endereco,
              bairro: dados.bairro,
              cidade: dados.cidade,
              estado: dados.estado,
              cep: dados.cep,

              // Plano
              plano: dados.plano,
              cobertura: dados.cobertura,
              acomodacao: dados.acomodacao,
              valor: dados.valor,
              valor_total: dados.valor_total,

              // Dados físicos
              peso: dados.peso,
              altura: dados.altura,

              // Corretor
              "corretor_nome": dados.corretor_nome,
              "corretor_codigo": dados.corretor_codigo,

              // Datas
              "data_criacao": dados.data_criacao,
              "data_atualizacao": dados.data_atualizacao,

              // Variações de nomes de campos (apenas para campos do titular)
              "nome_cliente": dados.nome,
              "cpf_cliente": dados.cpf,
              "email_cliente": dados.email,
              "telefone_cliente": dados.telefone,
              "valor_plano": dados.valor,
              "tipo_cobertura": dados.cobertura,
              "tipo_acomodacao": dados.acomodacao,
            }
            if (mapeamentoCampos[nomeCampo]) {
              valorEncontrado = mapeamentoCampos[nomeCampo]
            }
          }

          // 3. Preencher o campo se encontrou valor
          if (valorEncontrado !== null && valorEncontrado !== undefined) {
            try {
              // Tratamento especial para assinatura (base64)
              if (nomeCampo.toLowerCase().includes('assinatura') && typeof valorEncontrado === 'string') {
                if (valorEncontrado.startsWith('data:image/')) {
                  console.log(`✅ Campo de assinatura "${nomeCampo}" encontrado (base64)`)
                  // Para campos de texto, podemos colocar um placeholder ou deixar vazio
                  // A assinatura base64 seria tratada em um campo de imagem separado
                  campo.setText("Assinatura Digital")
                } else if (valorEncontrado.trim() !== "") {
                  console.log(`✅ Campo de assinatura "${nomeCampo}" encontrado (texto)`)
                  campo.setText(valorEncontrado)
                } else {
                  console.log(`ℹ️ Campo de assinatura "${nomeCampo}" vazio`)
                  campo.setText("")
                }
              } else {
                campo.setText(String(valorEncontrado))
                console.log(`✅ Campo "${nomeCampo}" preenchido com: ${valorEncontrado}`)
              }
            } catch (error) {
              console.warn(`⚠️ Erro ao preencher campo "${nomeCampo}":`, error)
            }
          } else {
            console.log(`ℹ️ Campo "${nomeCampo}" não encontrou correspondência`)
          }
        }
      })

      console.log("✅ Campos do formulário preenchidos com sucesso")
    } catch (error) {
      console.error("❌ Erro ao preencher campos do formulário:", error)
      throw error
    }
  }

  /**
   * Adiciona marca d'água baseada no status da proposta
   */
  private static async adicionarMarcaDagua(pdfDoc: any, status: string) {
    try {
      const { rgb } = await import("pdf-lib")
      
      const pages = pdfDoc.getPages()
      const marcaDagua = this.obterMarcaDagua(status)

      // Tamanho maior para "EM ANÁLISE"
      const fontSize = status === 'pendente' ? 48 : 24

      pages.forEach((page: any) => {
        const { width, height } = page.getSize()
        
        // Adicionar marca d'água no centro da página
        page.drawText(marcaDagua.texto, {
          x: width / 2 - (fontSize * 3),
          y: height / 2,
          size: fontSize,
          color: rgb(0.8, 0.1, 0.1), // Vermelho
          opacity: 0.4,
          rotate: { angle: -45, type: "degrees" }
        })
      })

      console.log(`✅ Marca d'água "${marcaDagua.texto}" adicionada`)
    } catch (error) {
      console.warn("⚠️ Erro ao adicionar marca d'água:", error)
      // Não falhar a geração por causa da marca d'água
    }
  }

  /**
   * Obtém o texto da marca d'água baseado no status
   */
  private static obterMarcaDagua(status: string): { texto: string } {
    const marcasDagua = {
      parcial: { texto: "AGUARDANDO VALIDAÇÃO" },
      aguardando_cliente: { texto: "AGUARDANDO CLIENTE" },
      pendente: { texto: "EM ANÁLISE" },
      aprovada: { texto: "APROVADA" },
      rejeitada: { texto: "REJEITADA" },
      cadastrado: { texto: "CADASTRADO" }
    }

    return marcasDagua[status as keyof typeof marcasDagua] || { texto: "PROPOSTA" }
  }

  /**
   * Faz upload do PDF gerado para o Supabase Storage
   */
  private static async fazerUploadPDF(pdfBytes: Uint8Array, nomeArquivo: string): Promise<string> {
    try {
      const timestamp = new Date().getTime()
      // Garantir nome do arquivo limpo e com nome do cliente
      const nomeFinal = `propostas_geradas/${nomeArquivo}_${timestamp}.pdf`

      const { data, error } = await supabase.storage
        .from("arquivos")
        .upload(nomeFinal, pdfBytes, {
          contentType: "application/pdf",
          cacheControl: "3600"
        })

      if (error) {
        console.error("Erro no upload:", error)
        throw error
      }

      // Gerar URL pública
      const { data: urlData } = supabase.storage
        .from("arquivos")
        .getPublicUrl(nomeFinal)

      console.log("✅ PDF enviado para:", urlData.publicUrl)
      return urlData.publicUrl
    } catch (error) {
      console.error("❌ Erro ao fazer upload do PDF:", error)
      throw error
    }
  }

  /**
   * Gera PDF completo com modelo selecionado
   */
  static async gerarPDFComModelo(
    modeloId: string,
    dadosProposta: DadosProposta,
    nomeCliente: string
  ): Promise<string> {
    try {
      console.log("🚀 Iniciando geração de PDF com modelo...")

      // 1. Buscar o modelo
      const { data: modelo, error } = await supabase
        .from("modelos_propostas")
        .select("*")
        .eq("id", modeloId)
        .eq("ativo", true)
        .single()

      if (error || !modelo) {
        throw new Error("Modelo de proposta não encontrado")
      }

      console.log("📋 Modelo encontrado:", modelo.titulo)

      // 2. Preparar nome do arquivo (com nome do cliente)
      const nomeArquivo = `proposta_${nomeCliente.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}`

      // 3. Preencher o modelo
      const url = await this.preencherModeloPDF(modelo.arquivo_url, dadosProposta, nomeArquivo)

      console.log("🎉 PDF gerado com sucesso!")
      return url
    } catch (error) {
      console.error("❌ Erro ao gerar PDF com modelo:", error)
      throw error
    }
  }
}
