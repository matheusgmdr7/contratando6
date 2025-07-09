-- Adicionar campos CPF e Data de Nascimento na tabela corretores
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'cpf'
    ) THEN
        ALTER TABLE corretores ADD COLUMN cpf VARCHAR(14);
        RAISE NOTICE 'Coluna cpf adicionada na tabela corretores';
    ELSE
        RAISE NOTICE 'Coluna cpf já existe na tabela corretores';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'data_nascimento'
    ) THEN
        ALTER TABLE corretores ADD COLUMN data_nascimento DATE;
        RAISE NOTICE 'Coluna data_nascimento adicionada na tabela corretores';
    ELSE
        RAISE NOTICE 'Coluna data_nascimento já existe na tabela corretores';
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN corretores.cpf IS 'CPF do corretor';
COMMENT ON COLUMN corretores.data_nascimento IS 'Data de nascimento do corretor'; 