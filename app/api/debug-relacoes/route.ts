import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("🔍 DEBUG: Verificando relações entre produtos e tabelas...")
    
    // Buscar produtos com suas relações
    const { data: produtos, error: produtosError } = await supabase
      .from("produtos_corretores")
      .select(`
        id,
        nome,
        operadora,
        disponivel,
        produto_tabela_relacao (
          tabela_id,
          segmentacao,
          descricao
        )
      `)
      .eq("disponivel", true)
      .order("nome", { ascending: true })

    if (produtosError) {
      console.error("❌ DEBUG: Erro ao buscar produtos:", produtosError)
      throw produtosError
    }

    console.log("✅ DEBUG: Produtos encontrados:", produtos)
    
    // Buscar todas as tabelas disponíveis
    const { data: tabelas, error: tabelasError } = await supabase
      .from("tabelas_precos")
      .select("id, titulo, operadora")
      .order("titulo", { ascending: true })

    if (tabelasError) {
      console.error("❌ DEBUG: Erro ao buscar tabelas:", tabelasError)
      throw tabelasError
    }

    return NextResponse.json({
      success: true,
      produtos,
      tabelas,
      totalProdutos: produtos?.length || 0,
      totalTabelas: tabelas?.length || 0
    })
  } catch (error) {
    console.error("❌ DEBUG: Erro:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
} 