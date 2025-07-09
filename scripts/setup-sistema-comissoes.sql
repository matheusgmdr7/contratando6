-- ========================================
-- SCRIPT COMPLETO PARA CONFIGURAR SISTEMA DE COMISSÕES
-- ========================================
-- Execute este script no Supabase SQL Editor

-- 1. ADICIONAR CAMPOS NA TABELA PROPOSTAS
-- ========================================

-- Campo pago
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'pago') THEN
        ALTER TABLE propostas ADD COLUMN pago BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Coluna pago adicionada em propostas';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna pago já existe em propostas';
    END IF;
END $$;

-- Campo data_pagamento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'data_pagamento') THEN
        ALTER TABLE propostas ADD COLUMN data_pagamento TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna data_pagamento adicionada em propostas';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna data_pagamento já existe em propostas';
    END IF;
END $$;

-- Campo mes_referencia
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'mes_referencia') THEN
        ALTER TABLE propostas ADD COLUMN mes_referencia VARCHAR(7);
        RAISE NOTICE '✅ Coluna mes_referencia adicionada em propostas';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna mes_referencia já existe em propostas';
    END IF;
END $$;

-- Campo corretor_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'corretor_id') THEN
        ALTER TABLE propostas ADD COLUMN corretor_id UUID;
        RAISE NOTICE '✅ Coluna corretor_id adicionada em propostas';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna corretor_id já existe em propostas';
    END IF;
END $$;

-- Campo produto_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'produto_id') THEN
        ALTER TABLE propostas ADD COLUMN produto_id BIGINT;
        RAISE NOTICE '✅ Coluna produto_id adicionada em propostas';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna produto_id já existe em propostas';
    END IF;
END $$;

-- Campo valor_mensal
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'valor_mensal') THEN
        ALTER TABLE propostas ADD COLUMN valor_mensal DECIMAL(10,2);
        RAISE NOTICE '✅ Coluna valor_mensal adicionada em propostas';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna valor_mensal já existe em propostas';
    END IF;
END $$;

-- Campo data_vencimento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'data_vencimento') THEN
        ALTER TABLE propostas ADD COLUMN data_vencimento DATE;
        RAISE NOTICE '✅ Coluna data_vencimento adicionada em propostas';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna data_vencimento já existe em propostas';
    END IF;
END $$;

-- 2. ADICIONAR CAMPO NA TABELA PRODUTOS_CORRETORES
-- ================================================

-- Campo porcentagem_comissao
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos_corretores' AND column_name = 'porcentagem_comissao') THEN
        ALTER TABLE produtos_corretores ADD COLUMN porcentagem_comissao DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE '✅ Coluna porcentagem_comissao adicionada em produtos_corretores';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna porcentagem_comissao já existe em produtos_corretores';
    END IF;
END $$;

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =================================

-- Índices para propostas
CREATE INDEX IF NOT EXISTS idx_propostas_pago ON propostas(pago);
CREATE INDEX IF NOT EXISTS idx_propostas_data_pagamento ON propostas(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_propostas_mes_referencia ON propostas(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_propostas_corretor_id ON propostas(corretor_id);
CREATE INDEX IF NOT EXISTS idx_propostas_produto_id ON propostas(produto_id);
CREATE INDEX IF NOT EXISTS idx_propostas_data_vencimento ON propostas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_propostas_status_pago ON propostas(status, pago);

-- Índices para produtos_corretores
CREATE INDEX IF NOT EXISTS idx_produtos_corretores_porcentagem_comissao ON produtos_corretores(porcentagem_comissao);

-- 4. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ==========================================

-- Comentários para propostas
COMMENT ON COLUMN propostas.pago IS 'Indica se o pagamento da comissão foi realizado';
COMMENT ON COLUMN propostas.data_pagamento IS 'Data e hora do pagamento da comissão';
COMMENT ON COLUMN propostas.mes_referencia IS 'Mês/ano de referência para a comissão (formato: YYYY-MM)';
COMMENT ON COLUMN propostas.corretor_id IS 'ID do corretor responsável pela proposta';
COMMENT ON COLUMN propostas.produto_id IS 'ID do produto na tabela produtos_corretores';
COMMENT ON COLUMN propostas.valor_mensal IS 'Valor mensal do plano para cálculo da comissão';
COMMENT ON COLUMN propostas.data_vencimento IS 'Data de vencimento do pagamento';

-- Comentários para produtos_corretores
COMMENT ON COLUMN produtos_corretores.porcentagem_comissao IS 'Porcentagem de comissão para o corretor (ex: 10.50 para 10,5%)';

-- 5. ATUALIZAR DADOS EXISTENTES
-- =============================

-- Definir data de vencimento como 1º dia do mês seguinte à criação
UPDATE propostas 
SET data_vencimento = DATE_TRUNC('month', created_at) + INTERVAL '1 month'
WHERE data_vencimento IS NULL;

-- Definir mês de referência baseado na data de criação
UPDATE propostas 
SET mes_referencia = TO_CHAR(created_at, 'YYYY-MM')
WHERE mes_referencia IS NULL;

-- Definir valor mensal baseado no valor_plano se existir
UPDATE propostas 
SET valor_mensal = valor_plano
WHERE valor_mensal IS NULL AND valor_plano IS NOT NULL;

-- Migrar dados de comissão da tabela produtos_corretores
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'comissao'
    ) THEN
        UPDATE produtos_corretores 
        SET porcentagem_comissao = CASE 
            WHEN comissao ~ '^[0-9]+\.?[0-9]*$' THEN CAST(comissao AS DECIMAL(5,2))
            WHEN comissao ~ '^[0-9]+%$' THEN CAST(REPLACE(comissao, '%', '') AS DECIMAL(5,2))
            ELSE 0
        END
        WHERE porcentagem_comissao = 0 OR porcentagem_comissao IS NULL;
        
        RAISE NOTICE '✅ Dados migrados do campo comissao para porcentagem_comissao';
    ELSE
        RAISE NOTICE 'ℹ️ Campo comissao não encontrado para migração';
    END IF;
END $$;

-- 6. VERIFICAR ESTRUTURA FINAL
-- ============================

-- Verificar campos em propostas
SELECT 
    'PROPOSTAS' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'propostas' 
AND column_name IN (
    'pago', 'data_pagamento', 'mes_referencia', 'corretor_id', 
    'produto_id', 'valor_mensal', 'data_vencimento'
)
ORDER BY column_name;

-- Verificar campos em produtos_corretores
SELECT 
    'PRODUTOS_CORRETORES' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'produtos_corretores' 
AND column_name IN ('porcentagem_comissao', 'comissao')
ORDER BY column_name;

-- 7. VERIFICAR DADOS DE EXEMPLO
-- =============================

-- Dados de exemplo de propostas
SELECT 
    'PROPOSTAS' as tabela,
    id,
    nome,
    corretor_nome,
    valor_mensal,
    data_vencimento,
    mes_referencia,
    pago,
    data_pagamento,
    status
FROM propostas 
ORDER BY created_at DESC 
LIMIT 3;

-- Dados de exemplo de produtos
SELECT 
    'PRODUTOS_CORRETORES' as tabela,
    id,
    nome,
    operadora,
    comissao,
    porcentagem_comissao
FROM produtos_corretores 
ORDER BY created_at DESC 
LIMIT 3;

-- 8. VERIFICAR ÍNDICES CRIADOS
-- ============================

SELECT 
    'PROPOSTAS' as tabela,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'propostas' 
AND indexname LIKE 'idx_propostas_%'
ORDER BY indexname;

SELECT 
    'PRODUTOS_CORRETORES' as tabela,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'produtos_corretores' 
AND indexname LIKE '%porcentagem_comissao%'
ORDER BY indexname;

-- 9. MENSAGEM FINAL
-- =================

DO $$
BEGIN
    RAISE NOTICE '🎉 SISTEMA DE COMISSÕES CONFIGURADO COM SUCESSO!';
    RAISE NOTICE '✅ Todos os campos necessários foram adicionados';
    RAISE NOTICE '✅ Índices de performance foram criados';
    RAISE NOTICE '✅ Dados existentes foram migrados';
    RAISE NOTICE '📋 A página de comissões está pronta para uso';
END $$; 