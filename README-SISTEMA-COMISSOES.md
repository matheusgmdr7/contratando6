# Sistema de Comissões - Contratando4

## 📋 Visão Geral

O sistema de comissões permite ao administrador gerenciar e controlar o pagamento de comissões aos corretores baseado nas propostas aprovadas. O sistema calcula automaticamente as comissões baseado na porcentagem configurada para cada produto.

## 🚀 Configuração Inicial

### 1. Executar Script SQL

Execute o script `scripts/setup-sistema-comissoes.sql` no Supabase SQL Editor para configurar todos os campos necessários:

```sql
-- Execute o arquivo: scripts/setup-sistema-comissoes.sql
```

Este script irá:
- ✅ Adicionar campos na tabela `propostas`
- ✅ Adicionar campo na tabela `produtos_corretores`
- ✅ Criar índices para performance
- ✅ Migrar dados existentes
- ✅ Configurar comentários de documentação

### 2. Campos Adicionados

#### Tabela `propostas`:
- `pago` (BOOLEAN) - Indica se o pagamento foi realizado
- `data_pagamento` (TIMESTAMP) - Data/hora do pagamento
- `mes_referencia` (VARCHAR(7)) - Mês/ano de referência (YYYY-MM)
- `corretor_id` (UUID) - ID do corretor responsável
- `produto_id` (BIGINT) - ID do produto contratado
- `valor_mensal` (DECIMAL) - Valor mensal para cálculo da comissão
- `data_vencimento` (DATE) - Data de vencimento do pagamento

#### Tabela `produtos_corretores`:
- `porcentagem_comissao` (DECIMAL(5,2)) - Porcentagem de comissão (ex: 10.50 para 10,5%)

## 📊 Como Usar o Sistema

### 1. Acessar a Página de Comissões

Navegue para: `Admin > Comissões`

### 2. Selecionar Período

- **Mês**: Selecione o mês desejado
- **Ano**: Selecione o ano desejado
- O sistema mostrará todos os clientes cadastrados até o mês/ano selecionado

### 3. Visualizar Clientes

O sistema exibe:
- **Lista de Clientes**: Organizada por data de vencimento
- **Informações**: Nome, email, corretor, produto, valor, comissão
- **Status**: Pago ou Pendente
- **Cálculo Automático**: Comissão baseada na porcentagem do produto

### 4. Marcar Pagamentos

#### Individual:
- Clique em "Marcar Pago" para cada cliente
- O sistema registra a data/hora do pagamento

#### Em Lote:
- **Por Corretor**: "Marcar Todos como Pago" para um corretor específico
- **Geral**: "Marcar Todos como Pago" para todos os clientes pendentes

### 5. Relatório de Comissões

#### Visualizar Relatório:
- Clique em "Mostrar Relatório" para ver a divisão por corretor
- Cada corretor mostra:
  - Total de clientes
  - Total de comissão
  - Lista detalhada de clientes

#### Exportar Relatório:
- Clique em "Exportar CSV" para baixar o relatório
- Arquivo inclui dados por corretor e detalhes de cada cliente

## 🧮 Cálculo de Comissões

### Fórmula:
```
Valor da Comissão = Valor Mensal × (Porcentagem do Produto ÷ 100)
```

### Exemplo:
- Valor Mensal: R$ 500,00
- Porcentagem do Produto: 15%
- Comissão: R$ 500,00 × (15 ÷ 100) = R$ 75,00

## 📈 Estatísticas Disponíveis

### Cards Informativos:
- **Total de Clientes**: Número total de clientes no período
- **Clientes Pagos**: Clientes com pagamento confirmado
- **Clientes Pendentes**: Clientes aguardando pagamento
- **Total de Comissões**: Soma de todas as comissões

### Relatório por Corretor:
- Agrupamento automático por corretor
- Ordenação por valor total de comissão (maior primeiro)
- Detalhamento de cada cliente

## 🔧 Configuração de Produtos

### Definir Porcentagem de Comissão:

1. Acesse: `Admin > Produtos Corretores`
2. Edite um produto
3. Configure o campo "Porcentagem de Comissão"
4. Salve as alterações

### Exemplo de Configuração:
- Produto: Plano Saúde Premium
- Porcentagem: 12.50 (para 12,5%)
- Valor Mensal: R$ 800,00
- Comissão Calculada: R$ 100,00

## 📋 Fluxo de Trabalho

### 1. Cadastro de Proposta
- Corretor cadastra proposta
- Sistema associa produto e porcentagem
- Define data de vencimento automaticamente

### 2. Aprovação da Proposta
- Admin aprova proposta
- Status muda para "cadastrado"
- Cliente aparece na lista de comissões

### 3. Controle de Pagamento
- Admin marca clientes como pagos
- Sistema registra data do pagamento
- Relatório atualiza automaticamente

### 4. Relatório Mensal
- Admin gera relatório do mês
- Sistema calcula totais por corretor
- Exporta dados para análise

## 🎯 Benefícios

### Para o Administrador:
- ✅ Controle total sobre pagamentos
- ✅ Relatórios organizados por corretor
- ✅ Cálculo automático de comissões
- ✅ Histórico de pagamentos
- ✅ Exportação de dados

### Para os Corretores:
- ✅ Transparência nas comissões
- ✅ Base de cálculo clara
- ✅ Histórico de pagamentos
- ✅ Relatórios detalhados

## 🔍 Troubleshooting

### Problemas Comuns:

#### 1. Cliente não aparece na lista:
- Verificar se status é "cadastrado"
- Verificar se data de vencimento está correta
- Verificar se corretor está associado

#### 2. Comissão não calculada:
- Verificar se produto tem porcentagem configurada
- Verificar se valor_mensal está preenchido
- Verificar se produto_id está associado

#### 3. Relatório vazio:
- Verificar se há clientes no período selecionado
- Verificar se clientes têm status "cadastrado"
- Verificar se corretores estão aprovados

### Logs e Debug:
- Console do navegador mostra logs detalhados
- Verificar erros no Supabase
- Verificar estrutura das tabelas

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs no console
2. Executar script de setup novamente
3. Verificar estrutura das tabelas
4. Contatar suporte técnico

---

**Sistema de Comissões - Contratando4**  
*Versão 1.0 - Configurado e Funcional* 🎉 