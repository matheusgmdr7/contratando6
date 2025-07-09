import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { tabelaId } = await request.json()
    
    console.log("🔍 DEBUG: Verificando tabela:", tabelaId)
    
    // Buscar todas as faixas da tabela
    const { data: faixas, error } = await supabase
      .from("tabelas_precos_faixas")
      .select("faixa_etaria, valor")
      .eq("tabela_id", tabelaId)
      .order("faixa_etaria", { ascending: true })

    if (error) {
      console.error("❌ DEBUG: Erro ao buscar faixas:", error)
      throw error
    }

    // Buscar informações da tabela
    const { data: tabela, error: tabelaError } = await supabase
      .from("tabelas_precos")
      .select("titulo, operadora")
      .eq("id", tabelaId)
      .single()

    return NextResponse.json({
      success: true,
      tabela,
      faixas,
      totalFaixas: faixas?.length || 0,
      temFaixa29_33: faixas?.some(f => f.faixa_etaria === "29-33") || false
    })
  } catch (error) {
    console.error("❌ DEBUG: Erro:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
} 