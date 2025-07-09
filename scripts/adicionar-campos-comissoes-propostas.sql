-- Script para adicionar campos necessários para o sistema de comissões
-- Execute este script no Supabase SQL Editor

-- 1. ADICIONAR CAMPOS DE CONTROLE DE PAGAMENTO
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'pago') THEN
        ALTER TABLE propostas ADD COLUMN pago BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Coluna pago adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna pago já existe';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'data_pagamento') THEN
        ALTER TABLE propostas ADD COLUMN data_pagamento TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna data_pagamento adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna data_pagamento já existe';
    END IF;
END $$;

-- 2. ADICIONAR CAMPOS DE REFERÊNCIA PARA COMISSÕES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'mes_referencia') THEN
        ALTER TABLE propostas ADD COLUMN mes_referencia VARCHAR(7); -- Formato: YYYY-MM
        RAISE NOTICE '✅ Coluna mes_referencia adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna mes_referencia já existe';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'corretor_id') THEN
        ALTER TABLE propostas ADD COLUMN corretor_id UUID;
        RAISE NOTICE '✅ Coluna corretor_id adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna corretor_id já existe';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'produto_id') THEN
        ALTER TABLE propostas ADD COLUMN produto_id UUID;
        RAISE NOTICE '✅ Coluna produto_id adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna produto_id já existe';
    END IF;
END $$;

-- 3. ADICIONAR CAMPOS DE VALOR E VENCIMENTO
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'valor_mensal') THEN
        ALTER TABLE propostas ADD COLUMN valor_mensal DECIMAL(10,2);
        RAISE NOTICE '✅ Coluna valor_mensal adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna valor_mensal já existe';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'data_vencimento') THEN
        ALTER TABLE propostas ADD COLUMN data_vencimento DATE;
        RAISE NOTICE '✅ Coluna data_vencimento adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna data_vencimento já existe';
    END IF;
END $$;

-- 4. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_propostas_pago ON propostas(pago);
CREATE INDEX IF NOT EXISTS idx_propostas_data_pagamento ON propostas(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_propostas_mes_referencia ON propostas(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_propostas_corretor_id ON propostas(corretor_id);
CREATE INDEX IF NOT EXISTS idx_propostas_produto_id ON propostas(produto_id);
CREATE INDEX IF NOT EXISTS idx_propostas_data_vencimento ON propostas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_propostas_status_pago ON propostas(status, pago);

-- 5. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN propostas.pago IS 'Indica se o pagamento da comissão foi realizado';
COMMENT ON COLUMN propostas.data_pagamento IS 'Data e hora do pagamento da comissão';
COMMENT ON COLUMN propostas.mes_referencia IS 'Mês/ano de referência para a comissão (formato: YYYY-MM)';
COMMENT ON COLUMN propostas.corretor_id IS 'ID do corretor responsável pela proposta';
COMMENT ON COLUMN propostas.produto_id IS 'ID do produto contratado';
COMMENT ON COLUMN propostas.valor_mensal IS 'Valor mensal do plano para cálculo da comissão';
COMMENT ON COLUMN propostas.data_vencimento IS 'Data de vencimento do pagamento';

-- 6. ATUALIZAR DADOS EXISTENTES (se necessário)
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

-- 7. VERIFICAR ESTRUTURA FINAL
SELECT 
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

-- 8. VERIFICAR ÍNDICES CRIADOS
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'propostas' 
AND indexname LIKE 'idx_propostas_%'
ORDER BY indexname;

-- 9. VERIFICAR DADOS DE EXEMPLO
SELECT 
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
LIMIT 5; 