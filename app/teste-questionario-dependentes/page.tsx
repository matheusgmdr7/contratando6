"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TesteQuestionarioDependentesPage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProposta, setSelectedProposta] = useState<any>(null)
  const [questionarios, setQuestionarios] = useState<any[]>([])
  const [dependentes, setDependentes] = useState<any[]>([])

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

  async function carregarQuestionariosDependentes(propostaId: string) {
    try {
      console.log("🔍 Carregando questionários de dependentes para proposta:", propostaId)

      // 1. Carregar dependentes
      const { data: dependentesData, error: dependentesError } = await supabase
        .from("dependentes")
        .select("*")
        .eq("proposta_id", propostaId)
        .order("created_at", { ascending: true })

      if (dependentesError) {
        console.error("Erro ao carregar dependentes:", dependentesError)
      } else {
        console.log("✅ Dependentes carregados:", dependentesData?.length || 0)
        setDependentes(dependentesData || [])
      }

      // 2. Buscar questionários na tabela questionario_respostas
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
            console.log(`   ${q.pessoa_tipo} (${q.pessoa_nome}): ${q.respostas_questionario?.length || 0} respostas`)
          })
        }
      }

      // 3. Buscar questionários na tabela questionario_saude
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

      // 4. Buscar questionários específicos dos dependentes
      const questionariosDependentes = []
      if (dependentesData && dependentesData.length > 0) {
        for (const dependente of dependentesData) {
          console.log(`🔍 Buscando questionário para dependente: ${dependente.nome} (ID: ${dependente.id})`)
          
          // Buscar na tabela questionario_saude com dependente_id
          const { data: questionarioDependente, error: errorQuestionarioDependente } = await supabase
            .from("questionario_saude")
            .select("*")
            .eq("proposta_id", propostaId)
            .eq("dependente_id", dependente.id)
            .order("pergunta_id", { ascending: true })
          
          if (!errorQuestionarioDependente && questionarioDependente && questionarioDependente.length > 0) {
            console.log(`✅ Questionário do dependente ${dependente.nome} encontrado em questionario_saude:`, questionarioDependente.length, "respostas")
            questionariosDependentes.push(...questionarioDependente)
          } else {
            console.log(`ℹ️ Nenhum questionário encontrado em questionario_saude para dependente ${dependente.nome}`)
          }
          
          // Buscar também na tabela questionario_respostas para dependentes
          const { data: questionarioRespostasDependente, error: errorQuestionarioRespostasDependente } = await supabase
            .from("questionario_respostas")
            .select("*, respostas_questionario(*)")
            .eq("proposta_id", propostaId)
            .eq("pessoa_tipo", "dependente")
            .eq("pessoa_nome", dependente.nome)
          
          if (!errorQuestionarioRespostasDependente && questionarioRespostasDependente && questionarioRespostasDependente.length > 0) {
            console.log(`✅ Questionário do dependente ${dependente.nome} encontrado em questionario_respostas:`, questionarioRespostasDependente.length, "registros")
            questionariosDependentes.push(...questionarioRespostasDependente)
          } else {
            console.log(`ℹ️ Nenhum questionário encontrado em questionario_respostas para dependente ${dependente.nome}`)
          }
        }
      }

      setQuestionarios([
        ...(questionariosRespostas || []),
        ...(questionariosSaude || []),
        ...questionariosDependentes
      ])
    } catch (error) {
      console.error("Erro ao carregar questionários:", error)
    }
  }

  async function testarProposta(proposta: any) {
    setSelectedProposta(proposta)
    await carregarQuestionariosDependentes(proposta.id)
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
      <h1 className="text-2xl font-bold">Teste - Questionários de Dependentes</h1>
      
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

                {/* Dependentes */}
                {dependentes.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-3">Dependentes ({dependentes.length}):</h3>
                    <div className="space-y-2">
                      {dependentes.map((dep, index) => (
                        <div key={dep.id} className="p-2 border rounded bg-gray-50">
                          <div className="text-sm">
                            <strong>Dependente {index + 1}:</strong> {dep.nome}
                          </div>
                          <div className="text-sm">
                            <strong>CPF:</strong> {dep.cpf || "Não informado"}
                          </div>
                          <div className="text-sm">
                            <strong>Parentesco:</strong> {dep.parentesco || "Não informado"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questionários */}
                {questionarios.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-3">Questionários Encontrados ({questionarios.length}):</h3>
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
                            <strong>Dependente ID:</strong> {q.dependente_id || "N/A"}
                          </div>
                          <div className="text-sm">
                            <strong>Pergunta ID:</strong> {q.pergunta_id || "N/A"}
                          </div>
                          <div className="text-sm">
                            <strong>Pergunta:</strong> {q.pergunta || q.pergunta_texto || "N/A"}
                          </div>
                          <div className="text-sm">
                            <strong>Resposta:</strong> {q.resposta || q.resposta_texto || "N/A"}
                          </div>
                          {q.respostas_questionario && (
                            <div className="text-sm">
                              <strong>Respostas Detalhadas:</strong> {q.respostas_questionario.length} perguntas
                              <div className="mt-1 ml-2">
                                {q.respostas_questionario.map((resp: any, respIdx: number) => (
                                  <div key={respIdx} className="text-xs">
                                    • {resp.pergunta_texto || resp.pergunta}: {resp.resposta}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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