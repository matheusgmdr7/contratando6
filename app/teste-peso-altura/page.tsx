"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestePesoAlturaPage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProposta, setSelectedProposta] = useState<any>(null)
  const [questionarios, setQuestionarios] = useState<any[]>([])

  useEffect(() => {
    carregarPropostas()
  }, [])

  async function carregarPropostas() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Erro ao carregar propostas:", error)
        return
      }

      setPropostas(data || [])
    } catch (error) {
      console.error("Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  async function carregarQuestionarios(propostaId: string) {
    try {
      console.log("🔍 Carregando questionários para proposta:", propostaId)

      // Buscar na tabela questionario_respostas
      const { data: questionariosRespostas, error: errorQuestionariosRespostas } = await supabase
        .from("questionario_respostas")
        .select("*, respostas_questionario(*)")
        .eq("proposta_id", propostaId)

      if (errorQuestionariosRespostas) {
        console.error("Erro ao buscar questionario_respostas:", errorQuestionariosRespostas)
      } else {
        console.log("✅ Questionários encontrados em questionario_respostas:", questionariosRespostas?.length || 0)
        if (questionariosRespostas) {
          questionariosRespostas.forEach(q => {
            console.log(`   ${q.pessoa_tipo} (${q.pessoa_nome}): peso=${q.peso}, altura=${q.altura}`)
          })
        }
      }

      // Buscar na tabela questionario_saude
      const { data: questionariosSaude, error: errorQuestionariosSaude } = await supabase
        .from("questionario_saude")
        .select("*")
        .eq("proposta_id", propostaId)
        .order("pergunta_id", { ascending: true })

      if (errorQuestionariosSaude) {
        console.error("Erro ao buscar questionario_saude:", errorQuestionariosSaude)
      } else {
        console.log("✅ Questionários encontrados em questionario_saude:", questionariosSaude?.length || 0)
      }

      setQuestionarios([
        ...(questionariosRespostas || []),
        ...(questionariosSaude || [])
      ])
    } catch (error) {
      console.error("Erro ao carregar questionários:", error)
    }
  }

  async function testarProposta(proposta: any) {
    setSelectedProposta(proposta)
    await carregarQuestionarios(proposta.id)
  }

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
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Teste - Peso e Altura</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Propostas */}
        <Card>
          <CardHeader>
            <CardTitle>Propostas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {propostas.map((proposta) => (
                <div
                  key={proposta.id}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedProposta?.id === proposta.id ? "bg-blue-50 border-blue-200" : ""
                  }`}
                  onClick={() => testarProposta(proposta)}
                >
                  <div className="font-medium">{proposta.nome_cliente || proposta.nome || "Sem nome"}</div>
                  <div className="text-sm text-gray-600">ID: {proposta.id.substring(0, 8)}...</div>
                  <div className="text-sm text-gray-600">
                    Criada: {new Date(proposta.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detalhes da Proposta Selecionada */}
        {selectedProposta && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Proposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <strong>Nome:</strong> {selectedProposta.nome_cliente || selectedProposta.nome || "Sem nome"}
                </div>
                <div>
                  <strong>Email:</strong> {selectedProposta.email || "Não informado"}
                </div>
                <div>
                  <strong>Status:</strong> {selectedProposta.status || "Não informado"}
                </div>
                <div>
                  <strong>Peso (proposta):</strong> {selectedProposta.peso || "Não informado"}
                </div>
                <div>
                  <strong>Altura (proposta):</strong> {selectedProposta.altura || "Não informado"}
                </div>
              </div>

              {/* Questionários */}
              {questionarios.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Questionários Encontrados:</h3>
                  <div className="space-y-2">
                    {questionarios.map((q, index) => (
                      <div key={index} className="p-2 border rounded bg-gray-50">
                        <div className="text-sm">
                          <strong>Tipo:</strong> {q.pessoa_tipo || "N/A"}
                        </div>
                        <div className="text-sm">
                          <strong>Nome:</strong> {q.pessoa_nome || "N/A"}
                        </div>
                        <div className="text-sm">
                          <strong>Peso:</strong> {q.peso || "Não informado"}
                        </div>
                        <div className="text-sm">
                          <strong>Altura:</strong> {q.altura || "Não informado"}
                        </div>
                        {q.respostas_questionario && (
                          <div className="text-sm">
                            <strong>Respostas:</strong> {q.respostas_questionario.length} perguntas
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Botão para recarregar */}
      <div className="flex justify-center">
        <Button onClick={carregarPropostas}>
          Recarregar Propostas
        </Button>
      </div>
    </div>
  )
} 