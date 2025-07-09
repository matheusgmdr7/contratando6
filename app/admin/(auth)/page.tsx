"use client"

import { useEffect, useState } from "react"
import PageHeader from "@/components/admin/page-header"
import StatCard from "@/components/admin/stat-card"
import { Users, FileText, Package, DollarSign, BarChart3, TrendingUp, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { buscarLeads } from "@/services/leads-service"
import { buscarPropostas } from "@/services/propostas-service-unificado"
import { buscarCorretores } from "@/services/corretores-service"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [leadsRecebidos, setLeadsRecebidos] = useState(0)
  const [propostasRecebidas, setPropostasRecebidas] = useState(0)
  const [propostasAprovadas, setPropostasAprovadas] = useState(0)
  const [corretoresAtivos, setCorretoresAtivos] = useState(0)
  const [corretores, setCorretores] = useState<any[]>([])
  const [dadosGrafico, setDadosGrafico] = useState<any>(null)

  // Função para gerar dados do gráfico dos últimos 6 meses
  const gerarDadosGrafico = (leads: any[], propostas: any[]) => {
    const meses = []
    const dadosLeads = []
    const dadosPropostas = []
    const dadosAprovadas = []
    
    // Gerar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const data = new Date()
      data.setMonth(data.getMonth() - i)
      const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      meses.push(mesAno)
      
      const inicioMes = new Date(data.getFullYear(), data.getMonth(), 1)
      const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59, 999)
      
      // Contar leads do mês
      const leadsMes = leads.filter(lead => {
        const dataLead = new Date(lead.created_at || lead.data)
        return dataLead >= inicioMes && dataLead <= fimMes
      }).length
      dadosLeads.push(leadsMes)
      
      // Contar propostas do mês
      const propostasMes = propostas.filter(proposta => {
        const dataProposta = new Date(proposta.created_at || proposta.data)
        return dataProposta >= inicioMes && dataProposta <= fimMes
      }).length
      dadosPropostas.push(propostasMes)
      
      // Contar propostas aprovadas do mês
      const aprovadasMes = propostas.filter(proposta => {
        const dataProposta = new Date(proposta.created_at || proposta.data)
        return dataProposta >= inicioMes && dataProposta <= fimMes && proposta.status === 'aprovada'
      }).length
      dadosAprovadas.push(aprovadasMes)
    }
    
    return {
      labels: meses,
      datasets: [
        {
          label: 'Leads Recebidos',
          data: dadosLeads,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
        {
          label: 'Propostas Recebidas',
          data: dadosPropostas,
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
        {
          label: 'Propostas Aprovadas',
          data: dadosAprovadas,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch Leads
        const leads = await buscarLeads()
        setLeadsRecebidos(leads.length)

        // Fetch Propostas de Corretores
        const propostasCorretores = await buscarPropostas()
        setPropostasRecebidas(propostasCorretores.length)

        // Filtra propostas aprovadas
        const aprovadas = propostasCorretores.filter((p) => p.status === "aprovada").length
        setPropostasAprovadas(aprovadas)

        // Fetch Corretores
        const corretoresData = await buscarCorretores()
        // Verificando se o campo status existe antes de filtrar
        const ativos = corretoresData.filter((c: any) => c.status === "aprovado").length
        setCorretoresAtivos(ativos)
        setCorretores(corretoresData)

        // Gerar dados do gráfico
        const dadosGraficoProcessados = gerarDadosGrafico(leads, propostasCorretores)
        setDadosGrafico(dadosGraficoProcessados)
      } catch (error) {
        console.error("Error fetching data:", error)
        // Definindo valores padrão em caso de erro
        setLeadsRecebidos(0)
        setPropostasRecebidas(0)
        setPropostasAprovadas(0)
        setCorretoresAtivos(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-400"></div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Dashboard Administrativo"
        description="Visão geral das operações e métricas da plataforma Contratandoplanos."
        actions={
          <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors font-medium">
            Gerar Relatório
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Leads Recebidos"
          value={leadsRecebidos}
          icon={Users}
          trend="neutral"
          trendValue="Total acumulado"
          color="blue"
        />
        <StatCard
          title="Propostas Recebidas"
          value={propostasRecebidas}
          icon={FileText}
          trend="neutral"
          trendValue="Total acumulado"
          color="green"
        />
        <StatCard
          title="Propostas Aprovadas"
          value={propostasAprovadas}
          icon={CheckCircle}
          trend="neutral"
          trendValue="Total acumulado"
          color="emerald"
        />
        <StatCard
          title="Corretores Ativos"
          value={corretoresAtivos}
          icon={Package}
          trend="neutral"
          trendValue="Total acumulado"
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Desempenho dos Últimos 6 Meses</h3>
            <Link href="/admin/propostas" className="text-sm text-gray-600 hover:text-gray-800 font-medium">
              Ver todas →
            </Link>
          </div>
          <div className="h-64">
            {dadosGrafico ? (
              <Line
                data={dadosGrafico}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Carregando dados do gráfico...</p>
                </div>
            </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Corretores Recentes</h3>
            <Link href="/admin/corretores" className="text-sm text-gray-600 hover:text-gray-800 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-4">
            {corretores.slice(0, 5).map((corretor: any) => (
              <div
                key={corretor.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{corretor.nome}</p>
                  <p className="text-xs text-gray-500 truncate">{corretor.email}</p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      corretor.status === "aprovado"
                        ? "bg-green-100 text-green-800"
                        : corretor.status === "rejeitado"
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-50 text-yellow-500"
                    }`}
                  >
                    {corretor.status === "aprovado"
                      ? "Ativo"
                      : corretor.status === "rejeitado"
                        ? "Inativo"
                        : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
            {corretores.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-indigo-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhum corretor cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção adicional de métricas */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-semibold text-gray-900">Taxa de Conversão</h4>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {propostasRecebidas > 0 ? Math.round((propostasAprovadas / propostasRecebidas) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500 mt-1">Propostas aprovadas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                <Clock className="h-8 w-8" />
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-semibold text-gray-900">Tempo Médio</h4>
              <p className="text-2xl font-bold text-amber-600 mt-1">2.5h</p>
              <p className="text-sm text-gray-500 mt-1">Processamento de propostas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-full bg-green-50 text-green-700 border border-green-100">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-semibold text-gray-900">Volume Total</h4>
              <p className="text-2xl font-bold text-green-600 mt-1">R$ 0</p>
              <p className="text-sm text-gray-500 mt-1">Propostas processadas</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
