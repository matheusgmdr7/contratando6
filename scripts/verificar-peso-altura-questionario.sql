-- Script para verificar e corrigir colunas peso e altura na tabela questionario_respostas
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela questionario_respostas existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'questionario_respostas'
);

-- 2. Verificar estrutura atual da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'questionario_respostas' 
ORDER BY ordinal_position;

-- 3. Verificar se as colunas peso e altura existem
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'questionario_respostas' 
AND column_name IN ('peso', 'altura');

-- 4. Adicionar coluna peso se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questionario_respostas' 
        AND column_name = 'peso'
    ) THEN
        ALTER TABLE questionario_respostas 
        ADD COLUMN peso DECIMAL(5,2);
        
        RAISE NOTICE 'Coluna peso adicionada à tabela questionario_respostas';
    ELSE
        RAISE NOTICE 'Coluna peso já existe na tabela questionario_respostas';
    END IF;
END $$;

-- 5. Adicionar coluna altura se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questionario_respostas' 
        AND column_name = 'altura'
    ) THEN
        ALTER TABLE questionario_respostas 
        ADD COLUMN altura INTEGER;
        
        RAISE NOTICE 'Coluna altura adicionada à tabela questionario_respostas';
    ELSE
        RAISE NOTICE 'Coluna altura já existe na tabela questionario_respostas';
    END IF;
END $$;

-- 6. Verificar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'questionario_respostas' 
ORDER BY ordinal_position;

-- 7. Verificar dados existentes
SELECT 
    proposta_id,
    pessoa_tipo,
    pessoa_nome,
    peso,
    altura,
    created_at
FROM questionario_respostas 
LIMIT 10;

-- 8. Contar registros com peso e altura preenchidos
SELECT 
    COUNT(*) as total_registros,
    COUNT(peso) as registros_com_peso,
    COUNT(altura) as registros_com_altura,
    COUNT(CASE WHEN peso IS NOT NULL AND altura IS NOT NULL THEN 1 END) as registros_completos
FROM questionario_respostas;

-- 9. Verificar dados de uma proposta específica (substitua o ID)
-- SELECT 
--     proposta_id,
--     pessoa_tipo,
--     pessoa_nome,
--     peso,
--     altura,
--     created_at
-- FROM questionario_respostas 
-- WHERE proposta_id = 'uuid-da-proposta-aqui'
-- ORDER BY pessoa_tipo, created_at; 