"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { buscarPropostaCompleta, buscarDependentesProposta } from "@/services/propostas-service"

export default function TesteDadosPropostaPage() {
  const [propostaId, setPropostaId] = useState("")
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testandoPDF, setTestandoPDF] = useState(false)

  const testarDados = async () => {
    if (!propostaId) {
      alert("Digite um ID de proposta")
      return
    }

    setLoading(true)
    try {
      console.log("🔍 TESTANDO DADOS DA PROPOSTA")
      console.log("=".repeat(50))
      console.log("📋 Proposta ID:", propostaId)

      // 1. Buscar proposta completa
      const proposta = await buscarPropostaCompleta(propostaId)
      console.log("✅ Proposta encontrada:", proposta)

      // 2. Buscar dependentes
      const dependentes = await buscarDependentesProposta(propostaId)
      console.log("✅ Dependentes encontrados:", dependentes)

      // 3. Buscar questionário de saúde
      const { data: questionario } = await supabase
        .from("questionario_respostas")
        .select("*, respostas_questionario(*)")
        .eq("proposta_id", propostaId)
        .order("pergunta_id", { ascending: true })
      
      console.log("✅ Questionário encontrado:", questionario)

      // 4. Verificar campos específicos
      console.log("🔍 VERIFICAÇÃO DE CAMPOS ESPECÍFICOS:")
      console.log("   CNS:", proposta.cns || proposta.cns_cliente || "NÃO ENCONTRADO")
      console.log("   UF Nascimento:", proposta.uf_nascimento || "NÃO ENCONTRADO")
      console.log("   Estado Civil:", proposta.estado_civil || proposta.estado_civil_cliente || "NÃO ENCONTRADO")
      console.log("   Naturalidade:", proposta.naturalidade || "NÃO ENCONTRADO")
      console.log("   Nome da Mãe:", proposta.nome_mae || proposta.nome_mae_cliente || "NÃO ENCONTRADO")
      console.log("   Nome do Pai:", proposta.nome_pai || "NÃO ENCONTRADO")
      console.log("   Nacionalidade:", proposta.nacionalidade || "NÃO ENCONTRADO")
      console.log("   Profissão:", proposta.profissao || "NÃO ENCONTRADO")
      console.log("   Órgão Expedidor:", proposta.orgao_expedidor || proposta.orgao_emissor || proposta.orgao_emissor_cliente || "NÃO ENCONTRADO")
      console.log("   Acomodação:", proposta.acomodacao || proposta.tipo_acomodacao || "NÃO ENCONTRADO")
      console.log("   Assinatura:", proposta.assinatura || proposta.assinatura_imagem || "NÃO ENCONTRADO")

      // 5. Calcular idade
      const calcularIdade = (dataNascimento: any) => {
        if (!dataNascimento) return "NÃO ENCONTRADO"
        try {
          const hoje = new Date()
          const nascimento = new Date(dataNascimento)
          let idade = hoje.getFullYear() - nascimento.getFullYear()
          const mes = hoje.getMonth() - nascimento.getMonth()
          if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--
          }
          return idade
        } catch (e) {
          return "ERRO NO CÁLCULO"
        }
      }

      console.log("   Idade:", calcularIdade(proposta.data_nascimento))

      // 6. Verificar dependentes
      if (dependentes && dependentes.length > 0) {
        console.log("🔍 DADOS DOS DEPENDENTES:")
        dependentes.forEach((dep: any, idx: number) => {
          console.log(`   Dependente ${idx + 1} (${dep.nome}):`)
          console.log(`     CNS: ${dep.cns || "NÃO ENCONTRADO"}`)
          console.log(`     Idade: ${calcularIdade(dep.data_nascimento)}`)
          console.log(`     UF Nascimento: ${dep.uf_nascimento || "NÃO ENCONTRADO"}`)
          console.log(`     Estado Civil: ${dep.estado_civil || "NÃO ENCONTRADO"}`)
          console.log(`     Naturalidade: ${dep.naturalidade || "NÃO ENCONTRADO"}`)
          console.log(`     Nome da Mãe: ${dep.nome_mae || "NÃO ENCONTRADO"}`)
        })
      }

      // 7. Verificar questionário
      if (questionario && questionario.length > 0) {
        console.log("🔍 DADOS DO QUESTIONÁRIO:")
        questionario.forEach((q: any, idx: number) => {
          console.log(`   Questão ${idx + 1}:`)
          console.log(`     Pergunta: ${q.pergunta || q.respostas_questionario?.pergunta || "NÃO ENCONTRADO"}`)
          console.log(`     Resposta: ${q.resposta || q.resposta_texto || q.respostas_questionario?.resposta || "NÃO ENCONTRADO"}`)
          console.log(`     Observação: ${q.observacao || q.respostas_questionario?.observacao || "NÃO ENCONTRADO"}`)
        })
      }

      setResultado({
        proposta,
        dependentes,
        questionario,
        camposVerificados: {
          cns: proposta.cns || proposta.cns_cliente || "NÃO ENCONTRADO",
          uf_nascimento: proposta.uf_nascimento || "NÃO ENCONTRADO",
          estado_civil: proposta.estado_civil || proposta.estado_civil_cliente || "NÃO ENCONTRADO",
          naturalidade: proposta.naturalidade || "NÃO ENCONTRADO",
          nome_mae: proposta.nome_mae || proposta.nome_mae_cliente || "NÃO ENCONTRADO",
          nome_pai: proposta.nome_pai || "NÃO ENCONTRADO",
          nacionalidade: proposta.nacionalidade || "NÃO ENCONTRADO",
          profissao: proposta.profissao || "NÃO ENCONTRADO",
          orgao_expedidor: proposta.orgao_expedidor || proposta.orgao_emissor || proposta.orgao_emissor_cliente || "NÃO ENCONTRADO",
          acomodacao: proposta.acomodacao || proposta.tipo_acomodacao || "NÃO ENCONTRADO",
          assinatura: proposta.assinatura || proposta.assinatura_imagem || "NÃO ENCONTRADO",
          idade: calcularIdade(proposta.data_nascimento)
        }
      })

    } catch (error) {
      console.error("❌ Erro ao testar dados:", error)
      alert("Erro ao testar dados: " + error)
    } finally {
      setLoading(false)
    }
  }

  const testarGeracaoPDF = async () => {
    if (!propostaId) {
      alert("Digite um ID de proposta")
      return
    }

    setTestandoPDF(true)
    try {
      console.log("🔍 TESTANDO GERAÇÃO DE PDF")
      console.log("=".repeat(50))

      // Importar o serviço de PDF
      const { PDFService } = await import("@/services/pdf-service")

      // Buscar proposta e dependentes
      const proposta = await buscarPropostaCompleta(propostaId)
      const dependentes = await buscarDependentesProposta(propostaId)
      
      // Buscar questionário
      const { data: questionario } = await supabase
        .from("questionario_respostas")
        .select("*, respostas_questionario(*)")
        .eq("proposta_id", propostaId)
        .order("pergunta_id", { ascending: true })

      // Buscar modelos ativos
      const modelos = await PDFService.buscarModelos()
      if (modelos.length === 0) {
        throw new Error("Nenhum modelo de proposta encontrado")
      }

      const modelo = modelos[0] // Usar o primeiro modelo
      console.log("📋 Usando modelo:", modelo.titulo)

      // Preparar dados para o PDF (simular a função do admin)
      const dadosParaPreenchimento = {
        // Dados básicos
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
        uf_nascimento: proposta.uf_nascimento || "",
        endereco: proposta.endereco || proposta.endereco_cliente || "",
        bairro: proposta.bairro || "",
        cidade: proposta.cidade || proposta.cidade_cliente || "",
        estado: proposta.estado || proposta.estado_cliente || "",
        cep: proposta.cep || proposta.cep_cliente || "",
        plano: proposta.produto_nome || proposta.plano_nome || proposta.sigla_plano || proposta.codigo_plano || "",
        cobertura: proposta.cobertura || proposta.tipo_cobertura || "",
        acomodacao: proposta.acomodacao || proposta.tipo_acomodacao || "",
        valor: proposta.valor_mensal || proposta.valor || "",
        valor_total: proposta.valor_mensal || proposta.valor || "", // Será calculado
        peso: proposta.peso || "",
        altura: proposta.altura || "",
        corretor_nome: proposta.corretor_nome || "",
        corretor_codigo: proposta.corretor_codigo || "",
        data_criacao: proposta.created_at ? proposta.created_at.split("T")[0].split("-").reverse().join("/") : "",
        data_atualizacao: proposta.updated_at ? proposta.updated_at.split("T")[0].split("-").reverse().join("/") : "",
        status: proposta.status || "pendente",
        assinatura: proposta.assinatura || proposta.assinatura_imagem || "",
        idade_titular: calcularIdade(proposta.data_nascimento),
      }

      // Adicionar dependentes
      if (dependentes && dependentes.length > 0) {
        dependentes.slice(0, 4).forEach((dep: any, idx: number) => {
          const prefixo = `dependente${idx + 1}_`
          dadosParaPreenchimento[`${prefixo}nome`] = dep.nome || ""
          dadosParaPreenchimento[`${prefixo}cpf`] = dep.cpf || ""
          dadosParaPreenchimento[`${prefixo}rg`] = dep.rg || ""
          dadosParaPreenchimento[`${prefixo}data_nascimento`] = dep.data_nascimento ? dep.data_nascimento.split("T")[0].split("-").reverse().join("/") : ""
          dadosParaPreenchimento[`${prefixo}parentesco`] = dep.parentesco || ""
          dadosParaPreenchimento[`${prefixo}cns`] = dep.cns || ""
          dadosParaPreenchimento[`${prefixo}sexo`] = dep.sexo || ""
          dadosParaPreenchimento[`${prefixo}estado_civil`] = dep.estado_civil || ""
          dadosParaPreenchimento[`${prefixo}naturalidade`] = dep.naturalidade || ""
          dadosParaPreenchimento[`${prefixo}idade`] = calcularIdade(dep.data_nascimento)
          dadosParaPreenchimento[`${prefixo}valor_individual`] = dep.valor_individual || dep.valor || dep.valor_plano || ""
          dadosParaPreenchimento[`${prefixo}peso`] = dep.peso || ""
          dadosParaPreenchimento[`${prefixo}altura`] = dep.altura || ""
          dadosParaPreenchimento[`${prefixo}assinatura`] = dep.assinatura || ""
          dadosParaPreenchimento[`${prefixo}nome_mae`] = dep.nome_mae || ""
        })
      }

      // Adicionar questionário
      if (questionario && questionario.length > 0) {
        questionario.forEach((q: any, idx: number) => {
          const pergunta = q.pergunta || q.respostas_questionario?.pergunta || q.pergunta_texto || `Pergunta ${idx + 1}`
          const resposta = q.resposta || q.resposta_texto || q.respostas_questionario?.resposta || ""
          const observacao = q.observacao || q.respostas_questionario?.observacao || ""
          
          dadosParaPreenchimento[`pergunta${idx + 1}`] = pergunta
          dadosParaPreenchimento[`resposta${idx + 1}`] = resposta
          if (observacao) {
            dadosParaPreenchimento[`observacao${idx + 1}`] = observacao
          }
          
          // Variações de nomes
          dadosParaPreenchimento[`pergunta_${idx + 1}`] = pergunta
          dadosParaPreenchimento[`resposta_${idx + 1}`] = resposta
          dadosParaPreenchimento[`questao${idx + 1}`] = pergunta
          dadosParaPreenchimento[`resp${idx + 1}`] = resposta
        })
      }

      console.log("📋 Dados preparados para PDF:", dadosParaPreenchimento)

      // Gerar PDF
      const nomeCliente = proposta.nome || proposta.nome_cliente || propostaId
      const pdfUrl = await PDFService.gerarPDFComModelo(modelo.id, dadosParaPreenchimento, nomeCliente)

      console.log("✅ PDF gerado com sucesso:", pdfUrl)
      alert(`PDF gerado com sucesso!\nURL: ${pdfUrl}`)

      // Abrir PDF em nova aba
      window.open(pdfUrl, "_blank")

    } catch (error) {
      console.error("❌ Erro ao testar geração de PDF:", error)
      alert("Erro ao testar geração de PDF: " + error)
    } finally {
      setTestandoPDF(false)
    }
  }

  const calcularIdade = (dataNascimento: any) => {
    if (!dataNascimento) return "NÃO ENCONTRADO"
    try {
      const hoje = new Date()
      const nascimento = new Date(dataNascimento)
      let idade = hoje.getFullYear() - nascimento.getFullYear()
      const mes = hoje.getMonth() - nascimento.getMonth()
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--
      }
      return idade
    } catch (e) {
      return "ERRO NO CÁLCULO"
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Teste de Dados da Proposta</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">ID da Proposta:</label>
        <input
          type="text"
          value={propostaId}
          onChange={(e) => setPropostaId(e.target.value)}
          className="border rounded px-3 py-2 w-full max-w-md"
          placeholder="Digite o ID da proposta"
        />
      </div>

      <button
        onClick={testarDados}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
      >
        {loading ? "Testando..." : "Testar Dados"}
      </button>

      <button
        onClick={testarGeracaoPDF}
        disabled={testandoPDF || !propostaId}
        className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {testandoPDF ? "Gerando PDF..." : "Testar Geração PDF"}
      </button>

      {resultado && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Resultado do Teste</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-2">Dados da Proposta</h3>
              <div className="bg-gray-100 p-4 rounded">
                <p><strong>Nome:</strong> {resultado.proposta.nome || resultado.proposta.nome_cliente}</p>
                <p><strong>Email:</strong> {resultado.proposta.email}</p>
                <p><strong>CPF:</strong> {resultado.proposta.cpf}</p>
                <p><strong>Status:</strong> {resultado.proposta.status}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Campos Verificados</h3>
              <div className="bg-gray-100 p-4 rounded">
                {Object.entries(resultado.camposVerificados).map(([campo, valor]) => (
                  <p key={campo}>
                    <strong>{campo}:</strong> {String(valor)}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {resultado.dependentes && resultado.dependentes.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-2">Dependentes ({resultado.dependentes.length})</h3>
              <div className="bg-gray-100 p-4 rounded">
                {resultado.dependentes.map((dep: any, idx: number) => (
                  <div key={idx} className="mb-4 p-3 bg-white rounded">
                    <p><strong>Nome:</strong> {dep.nome}</p>
                    <p><strong>CPF:</strong> {dep.cpf}</p>
                    <p><strong>Parentesco:</strong> {dep.parentesco}</p>
                    <p><strong>CNS:</strong> {dep.cns || "NÃO ENCONTRADO"}</p>
                    <p><strong>UF Nascimento:</strong> {dep.uf_nascimento || "NÃO ENCONTRADO"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 