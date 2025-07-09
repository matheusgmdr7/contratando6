"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Importar os steps
import Step1SelectTemplate from "./steps/step1-select-template"
import Step2PlanInfo from "./steps/step2-plan-info"
import Step3Dependents from "./steps/step3-dependents"
import Step4Documents from "./steps/step4-documents"
import Step5HealthQuestionnaire from "./steps/step5-health-questionnaire"
import Step6PdfPreview from "./steps/step6-pdf-preview"
import Step7Signature from "./steps/step7-signature"
import Step8Confirmation from "./steps/step8-confirmation"

// Importar serviços
import { criarProposta } from "@/services/propostas-service-unificado"
import { UploadService } from "@/services/upload-service-corrigido"

interface PropostaWizardProps {
  corretor?: {
    id: number
    nome: string
    email: string
    whatsapp?: string
  }
}

export default function PropostaWizard({ corretor }: PropostaWizardProps) {
  // Estados principais
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [propostaId, setPropostaId] = useState<string | null>(null)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [statusVerificado, setStatusVerificado] = useState(false)

  // Estados dos dados do formulário
  const [formData, setFormData] = useState({
    // Step 1 - Template
    template_id: "",
    template_titulo: "",

    // Step 2 - Informações do plano
    produto_id: "",
    produto_nome: "",
    produto_descricao: "",
    produto_operadora: "",
    produto_tipo: "",
    tabela_id: "",
    segmentacao: "",
    valor_mensal: 0,
    valor_total: 0,

    // Dados pessoais
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    data_nascimento: "",
    rg: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    cns: "",
    nome_mae: "",
    sexo: "",
    orgao_emissor: "",

    // Step 3 - Dependentes
    dependentes: [] as any[],

    // Step 4 - Documentos
    documentos: {} as any,

    // Step 5 - Questionário de saúde
    questionario_saude: {} as any,

    // Step 7 - Assinatura
    assinatura: "",
  })

  const totalSteps = 8
  const progress = (currentStep / totalSteps) * 100

  // Logs detalhados para debug
  useEffect(() => {
    console.log(`🔄 WIZARD - Mudança de estado detectada:`)
    console.log(`   Step atual: ${currentStep}`)
    console.log(`   Email enviado: ${emailEnviado}`)
    console.log(`   Status verificado: ${statusVerificado}`)
    console.log(`   Proposta ID: ${propostaId}`)
    console.log(`   Timestamp: ${new Date().toISOString()}`)
  }, [currentStep, emailEnviado, statusVerificado, propostaId])

  // Função para atualizar dados do formulário
  const updateFormData = useCallback((newData: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...newData }))
  }, [])

  // Função para avançar step
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep, totalSteps])

  // Função para voltar step
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  // Função para finalizar proposta - CORRIGIDA
  const finalizarProposta = useCallback(async () => {
    try {
      console.log("🚀 INICIANDO FINALIZAÇÃO DA PROPOSTA")
      console.log("=".repeat(50))
      setIsSubmitting(true)

      // 1. Upload dos documentos antes de criar a proposta
      const documentosTitular = formData.documentos || {}
      const documentosDependentes = (formData.dependentes || []).map((dep: any) => dep.documentos || {})
      let documentosUrls = {}
      let documentosDependentesUrls = {}
      let bucketUsado = ""
      let uploadErros: string[] = []
      if (Object.keys(documentosTitular).length > 0 || documentosDependentes.length > 0) {
        const uploadResult = await UploadService.uploadDocumentos(
          "temp", // ID temporário, será atualizado após criar proposta
          documentosTitular,
          documentosDependentes,
        )
        documentosUrls = uploadResult.documentosUrls
        documentosDependentesUrls = uploadResult.documentosDependentesUrls
        bucketUsado = uploadResult.bucketUsado
        uploadErros = uploadResult.erros
      }

      // 2. Calcular valor total mensal igual ao ValorTotalDisplay
      let total = 0
      const valorPlano = formData.valor_plano || formData.valor || "0,00"
      if (valorPlano) {
        const valorNumerico = Number.parseFloat(String(valorPlano).replace(/[^\d,]/g, "").replace(",", "."))
        if (!isNaN(valorNumerico)) {
          total += valorNumerico
        }
      }
      if (formData.dependentes && formData.dependentes.length > 0) {
        formData.dependentes.forEach((dep: any) => {
          if (dep.valor_individual) {
            const valorDep = Number.parseFloat(String(dep.valor_individual).replace(/[^\d,]/g, "").replace(",", "."))
            if (!isNaN(valorDep)) {
              total += valorDep
            }
          }
        })
      }
      const valorTotalMensal = total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

      // 3. Preparar dados para criação da proposta
      const dadosProposta = {
        ...formData,
        valor_total: valorTotalMensal, // Salva o valor total mensal já formatado
        ...(corretor?.id ? { corretor_id: corretor.id, corretor_nome: corretor.nome } : {}),
        status: "parcial",
        data: new Date().toISOString(),
        documentos_urls: documentosUrls,
        documentos_dependentes_urls: documentosDependentesUrls,
        bucket_usado: bucketUsado,
      }

      console.log("📋 Dados da proposta preparados:")
      console.log(JSON.stringify(dadosProposta, null, 2))

      // 4. Criar/atualizar proposta
      console.log("💾 Criando proposta no banco...")
      const propostaIdCriada = await criarProposta(dadosProposta)
      if (!propostaIdCriada) {
        throw new Error("Erro ao criar proposta")
      }
      console.log(`✅ Proposta criada com ID: ${propostaIdCriada}`)
      setPropostaId(propostaIdCriada)

      // 5. (Opcional) Atualizar os documentos com o ID real da proposta, se necessário
      // (Se o serviço de upload precisar do ID real, pode ser implementado aqui)

      // 6. Enviar email via API route
      console.log("📧 Enviando email via API...")
      const emailResponse = await fetch("/api/enviar-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          nome: formData.nome,
          propostaId: propostaIdCriada,
          corretor: corretor?.nome || "Sistema",
        }),
      })
      const emailResult = await emailResponse.json()
      if (!emailResult.sucesso) {
        toast.error("Proposta criada, mas houve problema no envio do email")
      } else {
        toast.success("Proposta enviada com sucesso!")
      }

      setTimeout(() => {
        setEmailEnviado(emailResult.sucesso || false)
        setStatusVerificado(true)
        setCurrentStep(8)
      }, 300)
    } catch (error: any) {
      console.error("❌ Erro na finalização:", error)
      toast.error("Erro ao finalizar proposta: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, corretor])

  // Renderizar step atual
  const renderCurrentStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      nextStep,
      prevStep,
      corretor,
    }

    switch (currentStep) {
      case 1:
        return <Step1SelectTemplate {...stepProps} onNext={() => {}} />
      case 2:
        return <Step2PlanInfo {...stepProps} onNext={() => {}} onBack={() => {}} />
      case 3:
        return <Step3Dependents />
      case 4:
        return <Step4Documents />
      case 5:
        return <Step5HealthQuestionnaire onNext={() => {}} onBack={() => {}} />
      case 6:
        return <Step6PdfPreview {...stepProps} propostaId={propostaId} onNext={() => {}} onBack={() => {}} />
      case 7:
        return <Step7Signature {...stepProps} onNext={() => {}} onPrev={() => {}} onFinalizar={finalizarProposta} formData={formData} updateFormData={updateFormData} proposta={undefined} />
      case 8:
        return (
          <Step8Confirmation
            emailEnviado={emailEnviado}
            statusVerificado={statusVerificado}
            propostaId={propostaId}
            nomeCliente={formData.nome}
            emailCliente={formData.email}
          />
        )
      default:
        return <div>Step não encontrado</div>
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header com progresso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Proposta Digital - Step {currentStep} de {totalSteps}
            </span>
            {corretor && <span className="text-sm font-normal text-muted-foreground">Corretor: {corretor.nome}</span>}
          </CardTitle>
          <CardDescription>Complete todos os passos para finalizar sua proposta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo do step atual */}
      <div className="min-h-[600px]">{renderCurrentStep()}</div>

      {/* Navegação (apenas para steps 1-6) */}
      {currentStep <= 6 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2 bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>

              <Button onClick={nextStep} disabled={currentStep === totalSteps} className="flex items-center gap-2">
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug info (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === "development" && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div>
              Step: {currentStep}/{totalSteps}
            </div>
            <div>Email Enviado: {emailEnviado ? "✅" : "❌"}</div>
            <div>Status Verificado: {statusVerificado ? "✅" : "❌"}</div>
            <div>Proposta ID: {propostaId || "Não definido"}</div>
            <div>Submitting: {isSubmitting ? "✅" : "❌"}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
