"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, PenTool, RotateCcw, AlertCircle, Smartphone, Mouse, Lock } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Step7SignatureProps {
  onNext: () => void
  onPrev: () => void
  onFinalizar: () => void
  formData: any
  updateFormData: (data: any) => void
  proposta?: any // Adicionar dados da proposta
}

export default function Step7Signature({ onNext, onPrev, onFinalizar, formData, updateFormData, proposta }: Step7SignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [declaracaoAceita, setDeclaracaoAceita] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)

  useEffect(() => {
    // Detectar se é dispositivo móvel
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prevenir scroll quando modal estiver aberto no mobile
  useEffect(() => {
    if (showSignatureModal && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [showSignatureModal, isMobile])

  // Bloquear scroll/zoom do body enquanto o modal está aberto no mobile
  useEffect(() => {
    if (showSignatureModal && isMobile) {
      document.body.style.overflow = 'hidden'
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) e.preventDefault()
      }
      document.addEventListener('touchmove', preventZoom, { passive: false })
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('touchmove', preventZoom)
      }
    }
  }, [showSignatureModal, isMobile])

  // Ajustar e resetar o canvas ao abrir o modal
  useEffect(() => {
    if (!showSignatureModal) return
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight * 0.6
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    if (signaturePreview) {
      const img = new window.Image()
      img.onload = () => ctx?.drawImage(img, 0, 0, width, height)
      img.src = signaturePreview
    }
  }, [showSignatureModal])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (isMobile) {
      // Para mobile, usar dimensões da tela disponível
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight * 0.6 // 60% da tela para o canvas
      canvas.width = screenWidth
      canvas.height = screenHeight
    } else {
      canvas.width = canvas.offsetWidth
      canvas.height = 200
    }

    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Limpar canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Carregar assinatura existente se houver
    if (formData && formData.assinatura_imagem) {
      setSignaturePreview(formData.assinatura_imagem)
      setHasSignature(true)
    }

    if (formData && formData.declaracao_veracidade) {
      setDeclaracaoAceita(true)
    }
  }, [formData?.assinatura_imagem, formData?.declaracao_veracidade, isMobile])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)

    let clientX: number, clientY: number

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Corrigido: não multiplicar por dpr, pois ctx.scale já foi aplicado
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let clientX: number, clientY: number

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Corrigido: não multiplicar por dpr, pois ctx.scale já foi aplicado
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()

    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const saveSignature = async (fromModal = false) => {
    // Salvar assinatura de canvas e coletar IP/user agent
    const canvas = canvasRef.current
    if (!canvas) return

    const dataURL = canvas.toDataURL("image/png")
    let ipAddress = ""
    try {
      const res = await fetch("https://api.ipify.org?format=json")
      const data = await res.json()
      ipAddress = data.ip
    } catch (e) {
      ipAddress = "Não disponível"
    }
    const userAgent = navigator.userAgent
    updateFormData({
      assinatura_imagem: dataURL,
      declaracao_veracidade: declaracaoAceita,
      ip_assinatura: ipAddress,
      user_agent: userAgent,
    })
    if (fromModal) {
      setSignaturePreview(dataURL)
      setShowSignatureModal(false)
    }
  }

  const handleSubmit = async () => {
    if (!hasSignature) {
      toast.error("Por favor, complete sua assinatura")
      return
    }

    if (!declaracaoAceita) {
      toast.error("Você deve aceitar a declaração de veracidade")
      return
    }

    setIsSubmitting(true)

    try {
      // Salvar assinatura
      await saveSignature()

      // Aguardar um momento para garantir que os dados foram salvos
      await new Promise((resolve) => setTimeout(resolve, 500))

      toast.success("Assinatura registrada com sucesso!")
      onFinalizar()
    } catch (error) {
      console.error("Erro ao salvar assinatura:", error)
      toast.error("Erro ao salvar assinatura. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Assinatura Digital
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Declaração de Veracidade */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Declaração de Veracidade</h3>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm text-gray-700 leading-relaxed">
                Declaro que todas as informações prestadas nesta proposta são verdadeiras e completas. Estou ciente de
                que a omissão ou falsidade de informações pode resultar na perda do direito à cobertura ou no
                cancelamento do contrato. Autorizo a operadora a verificar as informações prestadas e a solicitar exames
                médicos complementares, se necessário.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="declaracao"
                checked={declaracaoAceita}
                onCheckedChange={(checked) => setDeclaracaoAceita(checked as boolean)}
              />
              <label
                htmlFor="declaracao"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Li e aceito a declaração de veracidade acima
              </label>
            </div>
          </div>

          {/* Campo de Assinatura Manual (canvas) - ocupa toda a tela no mobile */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sua Assinatura</h3>
              <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
            {isMobile ? (
              <>
                {signaturePreview ? (
                  <div className="flex flex-col items-center">
                    <img src={signaturePreview} alt="Prévia da assinatura" className="border rounded w-full max-w-xs bg-white" />
                    <Button className="mt-2" onClick={() => setShowSignatureModal(true)}>
                      Refazer Assinatura
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowSignatureModal(true)}>
                    Assinar
                  </Button>
                )}
                <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
                  <DialogContent className="p-0 max-w-full w-screen h-screen flex items-center justify-center bg-white !rounded-none !shadow-none">
                    <DialogTitle className="sr-only">Assinatura Digital</DialogTitle>
                    <DialogDescription className="sr-only">
                      Área para assinar digitalmente o documento usando o dedo ou caneta
                    </DialogDescription>
                    <div className="w-full h-full flex flex-col">
                      {/* Header do modal */}
                      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Assine aqui</h3>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Use o dedo ou caneta para assinar no espaço abaixo
                        </p>
                      </div>

                      {/* Área de assinatura */}
                      <div className="flex-1 relative">
                        <canvas
                          ref={canvasRef}
                          className="assinatura-canvas"
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            padding: 0,
                            margin: 0,
                            border: 'none',
                            background: '#fff',
                            touchAction: 'none',
                            boxSizing: 'content-box',
                          }}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        
                        {/* Overlay de instruções (visível apenas se não houver assinatura) */}
                        {!hasSignature && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white bg-opacity-90 p-4 rounded-lg border border-gray-200 text-center">
                              <PenTool className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm text-gray-600">Toque e arraste para assinar</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botões de ação */}
                      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
                        <div className="flex gap-2 justify-center">
                          <Button 
                            variant="outline" 
                            onClick={clearSignature}
                            className="flex-1 max-w-[140px] py-4 text-base"
                          >
                            <RotateCcw className="h-5 w-5 mr-2" />
                            Limpar
                          </Button>
                          <Button 
                            onClick={() => saveSignature(true)}
                            className="flex-1 max-w-[140px] py-4 text-base"
                            disabled={!hasSignature}
                          >
                            Salvar
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowSignatureModal(false)}
                            className="flex-1 max-w-[140px] py-4 text-base"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex justify-center items-center">
                <canvas
                  ref={canvasRef}
                  className="assinatura-canvas"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    padding: 0,
                    margin: 0,
                    border: 'none',
                    background: '#fff',
                    touchAction: 'none',
                    boxSizing: 'content-box',
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <p className="text-sm text-gray-500 mt-2 text-center w-full">Assine no campo acima usando o mouse</p>
              </div>
            )}
          </div>

          {!hasSignature && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sua assinatura é obrigatória para finalizar a proposta. Por favor, complete sua assinatura no campo acima.
              </AlertDescription>
            </Alert>
          )}

          {/* Informações sobre Assinatura Digital */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Sobre a Assinatura Digital</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Sua assinatura digital tem a mesma validade jurídica de uma assinatura manuscrita</li>
              <li>• Os dados são criptografados e armazenados com segurança</li>
              <li>• A assinatura será anexada ao documento final da proposta</li>
              <li>• Você receberá uma cópia da proposta assinada por email</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Navegação */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Button type="button" variant="outline" onClick={onPrev} className="w-full sm:w-auto">
          Voltar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!hasSignature || !declaracaoAceita || isSubmitting}
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finalizando...
            </>
          ) : (
            "Finalizar Proposta"
          )}
        </Button>
      </div>
    </div>
  )
}
