import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("🔍 DEBUG: Verificando todas as faixas etárias disponíveis...")
    
    // Buscar todas as faixas etárias
    const { data: faixas, error } = await supabase
      .from("tabelas_precos_faixas")
      .select(`
        faixa_etaria,
        valor,
        tabela_id,
        tabelas_precos (
          titulo,
          operadora
        )
      `)
      .order("faixa_etaria", { ascending: true })

    if (error) {
      console.error("❌ DEBUG: Erro ao buscar faixas:", error)
      throw error
    }

    console.log("✅ DEBUG: Faixas encontradas:", faixas)
    
    // Agrupar por tabela
    const faixasPorTabela = faixas?.reduce((acc: Record<string, any[]>, faixa: any) => {
      const tabelaNome = faixa.tabelas_precos?.titulo || `Tabela ${faixa.tabela_id}`
      if (!acc[tabelaNome]) {
        acc[tabelaNome] = []
      }
      acc[tabelaNome].push({
        faixa_etaria: faixa.faixa_etaria,
        valor: faixa.valor,
        tabela_id: faixa.tabela_id,
        operadora: faixa.tabelas_precos?.operadora
      })
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      totalFaixas: faixas?.length || 0,
      faixasPorTabela,
      todasFaixas: faixas
    })
  } catch (error) {
    console.error("❌ DEBUG: Erro:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
} 