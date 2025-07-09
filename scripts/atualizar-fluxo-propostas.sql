-- Script para atualizar o fluxo de propostas
-- Adiciona colunas necessárias para o novo fluxo

-- 1. Adicionar colunas para dados de cadastro na tabela propostas
ALTER TABLE propostas 
ADD COLUMN IF NOT EXISTS administradora VARCHAR(255),
ADD COLUMN IF NOT EXISTS data_vencimento DATE,
ADD COLUMN IF NOT EXISTS data_vigencia DATE,
ADD COLUMN IF NOT EXISTS data_cadastro TIMESTAMP WITH TIME ZONE;

-- 2. Adicionar colunas para dados de cadastro na tabela propostas_corretores
ALTER TABLE propostas_corretores 
ADD COLUMN IF NOT EXISTS administradora VARCHAR(255),
ADD COLUMN IF NOT EXISTS data_vencimento DATE,
ADD COLUMN IF NOT EXISTS data_vigencia DATE,
ADD COLUMN IF NOT EXISTS data_cadastro TIMESTAMP WITH TIME ZONE;

-- 3. Atualizar constraint de status para incluir o novo status "cadastrado"
-- Primeiro, remover a constraint existente se houver
DO $$
BEGIN
    -- Verificar se existe constraint na tabela propostas
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'propostas' 
        AND constraint_name LIKE '%status%'
    ) THEN
        EXECUTE 'ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_status_check';
    END IF;
    
    -- Verificar se existe constraint na tabela propostas_corretores
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'propostas_corretores' 
        AND constraint_name LIKE '%status%'
    ) THEN
        EXECUTE 'ALTER TABLE propostas_corretores DROP CONSTRAINT IF EXISTS propostas_corretores_status_check';
    END IF;
    
    RAISE NOTICE '✅ Constraints antigas removidas com sucesso!';
END $$;

-- 4. Criar novas constraints com o status "cadastrado"
ALTER TABLE propostas 
ADD CONSTRAINT propostas_status_check 
CHECK (status IN ('parcial', 'aguardando_cliente', 'pendente', 'aprovada', 'rejeitada', 'cadastrado'));

ALTER TABLE propostas_corretores 
ADD CONSTRAINT propostas_corretores_status_check 
CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'cadastrado'));

-- 5. Criar índices para melhor performance (apenas colunas que existem)
CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(status);
CREATE INDEX IF NOT EXISTS idx_propostas_cadastro ON propostas(data_cadastro);
CREATE INDEX IF NOT EXISTS idx_propostas_created_at ON propostas(created_at);

CREATE INDEX IF NOT EXISTS idx_propostas_corretores_status ON propostas_corretores(status);
CREATE INDEX IF NOT EXISTS idx_propostas_corretores_cadastro ON propostas_corretores(data_cadastro);
CREATE INDEX IF NOT EXISTS idx_propostas_corretores_created_at ON propostas_corretores(created_at);

-- 6. Adicionar comentários nas colunas
COMMENT ON COLUMN propostas.administradora IS 'Nome da administradora para qual o cliente foi enviado';
COMMENT ON COLUMN propostas.data_vencimento IS 'Data de vencimento do plano';
COMMENT ON COLUMN propostas.data_vigencia IS 'Data de vigência do plano';
COMMENT ON COLUMN propostas.data_cadastro IS 'Data em que o cadastro foi finalizado';

COMMENT ON COLUMN propostas_corretores.administradora IS 'Nome da administradora para qual o cliente foi enviado';
COMMENT ON COLUMN propostas_corretores.data_vencimento IS 'Data de vencimento do plano';
COMMENT ON COLUMN propostas_corretores.data_vigencia IS 'Data de vigência do plano';
COMMENT ON COLUMN propostas_corretores.data_cadastro IS 'Data em que o cadastro foi finalizado';

-- 7. Verificar se as alterações foram aplicadas
SELECT 
    'propostas' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'propostas' 
AND column_name IN ('administradora', 'data_vencimento', 'data_vigencia', 'data_cadastro')
ORDER BY column_name;

SELECT 
    'propostas_corretores' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'propostas_corretores' 
AND column_name IN ('administradora', 'data_vencimento', 'data_vigencia', 'data_cadastro')
ORDER BY column_name;

-- 8. Verificar constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%status%' 
AND conrelid IN ('propostas'::regclass, 'propostas_corretores'::regclass);

-- 9. Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('propostas', 'propostas_corretores')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 10. Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE '✅ Script de atualização do fluxo de propostas concluído!';
    RAISE NOTICE 'As novas colunas e constraints foram adicionadas com sucesso.';
    RAISE NOTICE 'Índices de performance foram criados.';
END $$; 