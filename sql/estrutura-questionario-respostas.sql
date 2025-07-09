-- Script para estruturar a tabela questionario_respostas
-- Compatível com o questionário de saúde (21 perguntas)
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, verificar se a tabela existe e sua estrutura atual
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'questionario_respostas' 
ORDER BY ordinal_position;

-- 2. Dropar a tabela se existir (CUIDADO: isso apaga todos os dados)
-- DROP TABLE IF EXISTS questionario_respostas CASCADE;

-- 3. Criar a tabela questionario_respostas com estrutura otimizada
CREATE TABLE IF NOT EXISTS questionario_respostas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proposta_id UUID NOT NULL,
    pessoa_tipo VARCHAR(20) NOT NULL CHECK (pessoa_tipo IN ('titular', 'dependente')),
    pessoa_nome VARCHAR(255) NOT NULL,
    pessoa_index INTEGER NOT NULL DEFAULT 0,
    peso DECIMAL(5,2), -- peso em kg (ex: 70.50)
    altura INTEGER, -- altura em cm (ex: 175)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT unique_questionario_pessoa UNIQUE (proposta_id, pessoa_tipo, pessoa_nome)
);

-- 4. Criar a tabela respostas_questionario para as 21 perguntas
CREATE TABLE IF NOT EXISTS respostas_questionario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    questionario_id UUID NOT NULL REFERENCES questionario_respostas(id) ON DELETE CASCADE,
    pergunta_id INTEGER NOT NULL CHECK (pergunta_id BETWEEN 1 AND 21),
    pergunta_texto TEXT NOT NULL,
    resposta VARCHAR(10) NOT NULL CHECK (resposta IN ('sim', 'nao')),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT unique_resposta_pergunta UNIQUE (questionario_id, pergunta_id)
);

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_questionario_respostas_proposta_id ON questionario_respostas(proposta_id);
CREATE INDEX IF NOT EXISTS idx_questionario_respostas_pessoa_tipo ON questionario_respostas(pessoa_tipo);
CREATE INDEX IF NOT EXISTS idx_questionario_respostas_pessoa_nome ON questionario_respostas(pessoa_nome);
CREATE INDEX IF NOT EXISTS idx_respostas_questionario_questionario_id ON respostas_questionario(questionario_id);
CREATE INDEX IF NOT EXISTS idx_respostas_questionario_pergunta_id ON respostas_questionario(pergunta_id);

-- 6. Criar tabela de perguntas padrão (opcional, para referência)
CREATE TABLE IF NOT EXISTS perguntas_saude (
    id INTEGER PRIMARY KEY,
    pergunta TEXT NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Inserir as 21 perguntas padrão do questionário de saúde
INSERT INTO perguntas_saude (id, pergunta, descricao, categoria) VALUES
(1, 'Teve alguma doença que resultou em internação nos últimos 2 anos?', 'Informe qual doença e quando ocorreu', 'Internações'),
(2, 'Foi submetido(a) a internações clínicas, cirúrgicas ou psiquiátricas nos últimos 5 anos?', 'Caso positivo, informe quando e qual doença', 'Internações'),
(3, 'Possui alguma doença hereditária ou congênita?', 'Informe qual doença', 'Doenças Hereditárias'),
(4, 'É portador de alguma doença que desencadeou sequela física?', 'Informe qual doença e sequela', 'Sequela Física'),
(5, 'É portador de alguma doença que necessitará de transplante?', 'Informe qual órgão e doença', 'Transplantes'),
(6, 'É portador de doença renal que necessite diálise e/ou hemodiálise?', 'Informe tipo e frequência', 'Doenças Renais'),
(7, 'É portador de câncer?', 'Informar a localização e estágio', 'Câncer'),
(8, 'Tem ou teve alguma doença oftalmológica?', 'Como catarata, glaucoma, astigmatismo, miopia, hipermetropia. Fez cirurgia refrativa?', 'Oftalmologia'),
(9, 'Tem ou teve alguma doença do ouvido, nariz ou garganta?', 'Como sinusite, desvio de septo, amigdalite, otite ou outra', 'Otorrinolaringologia'),
(10, 'É portador de alguma doença do aparelho digestivo?', 'Como gastrite, úlcera, colite, doença da vesícula biliar ou outras', 'Digestivo'),
(11, 'É portador de alguma doença ortopédica?', 'Como hérnia de disco, osteoporose ou outros', 'Ortopedia'),
(12, 'É portador de alguma doença neurológica?', 'Como mal de Parkinson, doenças de Alzheimer, epilepsia ou outros', 'Neurologia'),
(13, 'É portador de alguma doença cardíaca, circulatória, hipertensiva ou diabetes?', 'Informe qual condição específica', 'Cardiologia'),
(14, 'É portador de alguma doença ginecológica / urológica?', 'Informe qual condição específica', 'Ginecologia/Urologia'),
(15, 'É portador de hérnia inguinal, umbilical, incisional ou outras?', 'Informe localização e tipo', 'Hérnias'),
(16, 'É portador de alguma doença infectocontagiosa?', 'Inclusive AIDS ou hepatite', 'Doenças Infectocontagiosas'),
(17, 'É portador de alguma doença psiquiátrica?', 'Como depressão, esquizofrenia, demência, alcoolismo, dependência de drogas ou outra', 'Psiquiatria'),
(18, 'Teve alguma patologia que necessitou de tratamento psicológico ou psicoterápico?', 'Informe qual patologia', 'Psicologia'),
(19, 'É portador ou já sofreu de alguma doença do aparelho respiratório?', 'Como asma, doença pulmonar obstrutiva crônica, bronquite, enfisema ou outra', 'Respiratória'),
(20, 'Tem ou teve alguma doença não relacionada nas perguntas anteriores?', 'Informe qual doença', 'Outras'),
(21, 'É gestante?', 'Informe semanas de gestação se aplicável', 'Gestação')
ON CONFLICT (id) DO UPDATE SET
    pergunta = EXCLUDED.pergunta,
    descricao = EXCLUDED.descricao,
    categoria = EXCLUDED.categoria;

-- 8. Adicionar comentários para documentação
COMMENT ON TABLE questionario_respostas IS 'Armazena os dados básicos do questionário de saúde para cada pessoa da proposta';
COMMENT ON COLUMN questionario_respostas.proposta_id IS 'ID da proposta relacionada';
COMMENT ON COLUMN questionario_respostas.pessoa_tipo IS 'Tipo da pessoa: titular ou dependente';
COMMENT ON COLUMN questionario_respostas.pessoa_nome IS 'Nome da pessoa que respondeu';
COMMENT ON COLUMN questionario_respostas.pessoa_index IS 'Índice da pessoa (0=titular, 1+=dependentes)';
COMMENT ON COLUMN questionario_respostas.peso IS 'Peso da pessoa em kg';
COMMENT ON COLUMN questionario_respostas.altura IS 'Altura da pessoa em cm';

COMMENT ON TABLE respostas_questionario IS 'Armazena as respostas individuais das 21 perguntas do questionário de saúde';
COMMENT ON COLUMN respostas_questionario.questionario_id IS 'ID do questionário (referência a questionario_respostas)';
COMMENT ON COLUMN respostas_questionario.pergunta_id IS 'ID da pergunta (1-21)';
COMMENT ON COLUMN respostas_questionario.pergunta_texto IS 'Texto da pergunta respondida';
COMMENT ON COLUMN respostas_questionario.resposta IS 'Resposta: sim ou nao';
COMMENT ON COLUMN respostas_questionario.observacao IS 'Observações adicionais quando resposta for sim';

COMMENT ON TABLE perguntas_saude IS 'Tabela de referência com as 21 perguntas padrão do questionário de saúde';

-- 9. Criar função para obter texto da pergunta por ID
CREATE OR REPLACE FUNCTION obter_texto_pergunta(pergunta_id_param INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT pergunta FROM perguntas_saude WHERE id = pergunta_id_param);
END;
$$ LANGUAGE plpgsql;

-- 10. Criar função para inserir questionário completo
CREATE OR REPLACE FUNCTION inserir_questionario_completo(
    proposta_id_param UUID,
    pessoa_tipo_param VARCHAR(20),
    pessoa_nome_param VARCHAR(255),
    pessoa_index_param INTEGER,
    peso_param DECIMAL(5,2),
    altura_param INTEGER,
    respostas_param JSONB
)
RETURNS UUID AS $$
DECLARE
    questionario_id UUID;
    pergunta_record RECORD;
BEGIN
    -- Inserir dados básicos do questionário
    INSERT INTO questionario_respostas (
        proposta_id, pessoa_tipo, pessoa_nome, pessoa_index, peso, altura
    ) VALUES (
        proposta_id_param, pessoa_tipo_param, pessoa_nome_param, pessoa_index_param, peso_param, altura_param
    ) RETURNING id INTO questionario_id;
    
    -- Inserir respostas individuais
    FOR pergunta_record IN SELECT * FROM jsonb_array_elements(respostas_param)
    LOOP
        INSERT INTO respostas_questionario (
            questionario_id, pergunta_id, pergunta_texto, resposta, observacao
        ) VALUES (
            questionario_id,
            (pergunta_record->>'pergunta_id')::INTEGER,
            obter_texto_pergunta((pergunta_record->>'pergunta_id')::INTEGER),
            pergunta_record->>'resposta',
            pergunta_record->>'observacao'
        );
    END LOOP;
    
    RETURN questionario_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Verificar estrutura final
SELECT 
    'questionario_respostas' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'questionario_respostas'
ORDER BY ordinal_position;

SELECT 
    'respostas_questionario' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'respostas_questionario'
ORDER BY ordinal_position;

SELECT 
    'perguntas_saude' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'perguntas_saude'
ORDER BY ordinal_position;

-- 12. Verificar perguntas inseridas
SELECT id, pergunta, categoria FROM perguntas_saude ORDER BY id;

-- 13. Exemplo de uso da função (comentado)
/*
-- Exemplo de como usar a função inserir_questionario_completo:
SELECT inserir_questionario_completo(
    'uuid-da-proposta-aqui',
    'titular',
    'João Silva',
    0,
    75.5,
    175,
    '[
        {"pergunta_id": 1, "resposta": "nao", "observacao": null},
        {"pergunta_id": 2, "resposta": "sim", "observacao": "Cirurgia de apendicite em 2022"},
        {"pergunta_id": 3, "resposta": "nao", "observacao": null}
        -- ... continuar para todas as 21 perguntas
    ]'::jsonb
);
*/ 