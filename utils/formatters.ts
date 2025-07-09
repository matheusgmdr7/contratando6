/**
 * Formata um valor numérico para moeda brasileira (R$)
 * @param valor Valor a ser formatado
 * @returns String formatada como moeda brasileira
 */
export function formatarMoeda(valor: number): string {
  console.log(`🔍 DEBUG formatarMoeda - Entrada:`, {
    valor,
    tipo: typeof valor,
    isNaN: isNaN(valor)
  })

  // Garantir que o valor seja um número válido
  if (typeof valor !== 'number' || isNaN(valor)) {
    console.warn("⚠️ Valor inválido para formatação de moeda:", valor)
    return "R$ 0,00"
  }

  // Usar toLocaleString com configurações específicas para garantir precisão
  const resultado = valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  console.log(`✅ DEBUG formatarMoeda - Resultado:`, {
    entrada: valor,
    saida: resultado
  })

  return resultado
}

/**
 * Formata uma data para o formato brasileiro (DD/MM/YYYY)
 * @param data Data a ser formatada
 * @returns String formatada como data brasileira
 */
export function formatarData(data: Date | string): string {
  if (!data) return ""

  const dataObj = typeof data === "string" ? new Date(data) : data

  return dataObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Formata um CPF (000.000.000-00)
 * @param cpf CPF a ser formatado
 * @returns String formatada como CPF
 */
export function formatarCPF(cpf: string): string {
  if (!cpf) return ""

  // Remove caracteres não numéricos
  const cpfLimpo = cpf.replace(/\D/g, "")

  // Verifica se tem 11 dígitos
  if (cpfLimpo.length !== 11) return cpf

  // Formata o CPF
  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

/**
 * Formata um telefone ((00) 00000-0000)
 * @param telefone Telefone a ser formatado
 * @returns String formatada como telefone
 */
export function formatarTelefone(telefone: string): string {
  if (!telefone) return ""

  // Remove caracteres não numéricos
  const telefoneLimpo = telefone.replace(/\D/g, "")

  // Verifica se é celular (11 dígitos) ou fixo (10 dígitos)
  if (telefoneLimpo.length === 11) {
    return telefoneLimpo.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3")
  } else if (telefoneLimpo.length === 10) {
    return telefoneLimpo.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3")
  }

  return telefone
}

/**
 * Formata um CEP (00000-000)
 * @param cep CEP a ser formatado
 * @returns String formatada como CEP
 */
export function formatarCEP(cep: string): string {
  if (!cep) return ""

  // Remove caracteres não numéricos
  const cepLimpo = cep.replace(/\D/g, "")

  // Verifica se tem 8 dígitos
  if (cepLimpo.length !== 8) return cep

  // Formata o CEP
  return cepLimpo.replace(/^(\d{5})(\d{3})$/, "$1-$2")
}

/**
 * Calcula a idade a partir da data de nascimento
 * @param dataNascimento Data de nascimento
 * @returns Idade em anos
 */
export function calcularIdade(dataNascimento: string | Date): number {
  if (!dataNascimento) return 0

  const hoje = new Date()
  const nascimento = new Date(dataNascimento)

  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const m = hoje.getMonth() - nascimento.getMonth()

  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--
  }

  return idade
}
