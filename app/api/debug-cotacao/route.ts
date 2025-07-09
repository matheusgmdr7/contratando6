import { NextRequest, NextResponse } from "next/server"
import { buscarProdutosPorFaixaEtaria } from "@/services/produtos-corretores-service"

export async function POST(request: NextRequest) {
  try {
    const { faixaEtaria } = await request.json()
    
    console.log("🧪 DEBUG: Testando função de cotação com faixa:", faixaEtaria)
    
    const produtos = await buscarProdutosPorFaixaEtaria(faixaEtaria)
    
    console.log("✅ DEBUG: Produtos encontrados:", produtos)
    
    return NextResponse.json({
      success: true,
      faixaEtaria,
      produtos,
      count: Object.keys(produtos).length
    })
  } catch (error) {
    console.error("❌ DEBUG: Erro no teste:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
} 