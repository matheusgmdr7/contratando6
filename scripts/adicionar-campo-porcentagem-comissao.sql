-- Script para adicionar campo porcentagem_comissao na tabela produtos_corretores
-- Execute este script no Supabase SQL Editor

-- 1. VERIFICAR SE O CAMPO JÁ EXISTE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'porcentagem_comissao'
    ) THEN
        RAISE NOTICE 'ℹ️ Campo porcentagem_comissao já existe na tabela produtos_corretores';
    ELSE
        RAISE NOTICE '🔧 Campo porcentagem_comissao não encontrado. Adicionando...';
    END IF;
END $$;

-- 2. ADICIONAR O CAMPO SE NÃO EXISTIR
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'porcentagem_comissao'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN porcentagem_comissao DECIMAL(5,2) DEFAULT 0;
        
        RAISE NOTICE '✅ Campo porcentagem_comissao adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo porcentagem_comissao já existe';
    END IF;
END $$;

-- 3. CRIAR ÍNDICE PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_produtos_corretores_porcentagem_comissao 
ON produtos_corretores(porcentagem_comissao);

-- 4. ADICIONAR COMENTÁRIO PARA DOCUMENTAÇÃO
COMMENT ON COLUMN produtos_corretores.porcentagem_comissao IS 'Porcentagem de comissão para o corretor (ex: 10.50 para 10,5%)';

-- 5. ATUALIZAR DADOS EXISTENTES (se necessário)
-- Converter campo 'comissao' existente para 'porcentagem_comissao' se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'comissao'
    ) THEN
        -- Atualizar porcentagem_comissao baseado no campo comissao existente
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
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'produtos_corretores' 
AND column_name IN ('porcentagem_comissao', 'comissao')
ORDER BY column_name;

-- 7. VERIFICAR DADOS DE EXEMPLO
SELECT 
    id,
    nome,
    operadora,
    comissao,
    porcentagem_comissao
FROM produtos_corretores 
ORDER BY created_at DESC 
LIMIT 5;

-- 8. VERIFICAR ÍNDICES CRIADOS
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'produtos_corretores' 
AND indexname LIKE '%porcentagem_comissao%'
ORDER BY indexname; 