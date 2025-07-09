# Atualização do Fluxo de Propostas - Admin

## Resumo das Mudanças

Este documento descreve as melhorias implementadas no fluxo de propostas do painel administrativo, incluindo novas páginas, funcionalidades e melhorias na experiência do usuário.

## 🎯 Novas Funcionalidades

### 1. Menu Lateral Atualizado

O menu lateral do admin foi reorganizado com as seguintes páginas:

- **Propostas Recebidas** (antiga "Propostas") - Mostra todas as propostas recebidas
- **Em Análise** - Propostas pendentes de aprovação/reprovação
- **Cadastrado** - Clientes aprovados com dados de cadastro

### 2. Fluxo de Trabalho Melhorado

#### Propostas Recebidas (`/admin/propostas`)
- **Título atualizado**: "Propostas Recebidas"
- **Novo botão**: "Enviar para Análise" (substitui aprovar/reprovar)
- **Funcionalidade**: Move propostas com status "pendente" para análise

#### Em Análise (`/admin/em-analise`)
- **Nova página**: Mostra apenas propostas com status "pendente"
- **Ações disponíveis**:
  - ✅ **Aprovar** - Move para status "aprovada"
  - ❌ **Reprovar** - Move para status "rejeitada" com motivo
- **Filtros**: Por nome, email e origem (direto/corretor)

#### Cadastrado (`/admin/cadastrado`)
- **Nova página**: Mostra propostas com status "aprovada"
- **Funcionalidade**: Permite completar cadastro com dados obrigatórios
- **Campos obrigatórios**:
  - Administradora
  - Data de Vencimento
  - Data de Vigência
- **Status**: "Completo" ou "Pendente de Cadastro"

### 3. Geração de PDF Melhorada

#### Nova Funcionalidade na Página de Detalhes
- **Botão**: "Gerar PDF" (substitui "Baixar PDF Completo")
- **Modal de seleção**: Permite escolher o modelo de proposta
- **Funcionalidade**: Gera PDF com dados da proposta usando modelo selecionado
- **Marca d'água**: De acordo com o status da proposta

## 🗄️ Alterações no Banco de Dados

### Novas Colunas Adicionadas

#### Tabela `propostas`
```sql
ALTER TABLE propostas 
ADD COLUMN administradora VARCHAR(255),
ADD COLUMN data_vencimento DATE,
ADD COLUMN data_vigencia DATE,
ADD COLUMN data_cadastro TIMESTAMP WITH TIME ZONE;
```

#### Tabela `propostas_corretores`
```sql
ALTER TABLE propostas_corretores 
ADD COLUMN administradora VARCHAR(255),
ADD COLUMN data_vencimento DATE,
ADD COLUMN data_vigencia DATE,
ADD COLUMN data_cadastro TIMESTAMP WITH TIME ZONE;
```

### Novos Status
- **"cadastrado"** - Adicionado ao fluxo de status válidos

### Índices de Performance
```sql
CREATE INDEX idx_propostas_status ON propostas(status);
CREATE INDEX idx_propostas_origem ON propostas(origem);
CREATE INDEX idx_propostas_cadastro ON propostas(data_cadastro);
```

## 📁 Arquivos Criados/Modificados

### Novos Arquivos
- `app/admin/(auth)/em-analise/page.tsx` - Página "Em Análise"
- `app/admin/(auth)/cadastrado/page.tsx` - Página "Cadastrado"
- `scripts/atualizar-fluxo-propostas.sql` - Script de atualização do banco

### Arquivos Modificados
- `components/admin/admin-sidebar.tsx` - Menu lateral atualizado
- `app/admin/(auth)/propostas/page.tsx` - Página principal atualizada

## 🔄 Fluxo de Trabalho Atualizado

### 1. Proposta Recebida
- Cliente envia proposta → Status: "parcial" ou "pendente"
- Admin visualiza em "Propostas Recebidas"

### 2. Envio para Análise
- Admin clica "Enviar para Análise"
- Proposta aparece em "Em Análise"

### 3. Análise da Proposta
- Admin analisa detalhes da proposta
- **Aprova** → Status: "aprovada" → Vai para "Cadastrado"
- **Reprova** → Status: "rejeitada" → Fica em histórico

### 4. Finalização do Cadastro
- Admin preenche dados obrigatórios:
  - Administradora
  - Data de Vencimento
  - Data de Vigência
- Status muda para "cadastrado"

## 🎨 Melhorias na Interface

### Estatísticas Rápidas
- **Propostas Recebidas**: Total, aguardando validação, aguardando análise
- **Em Análise**: Total em análise, clientes diretos, via corretores
- **Cadastrado**: Total aprovados, cadastros completos, pendentes de cadastro

### Filtros Inteligentes
- Busca por nome ou email
- Filtro por origem (direto/corretor)
- Paginação otimizada

### Modais Informativos
- Modal de rejeição com motivo obrigatório
- Modal de cadastro com validação de campos
- Modal de seleção de modelo PDF

## 🚀 Como Usar

### Para Administradores

1. **Acesse "Propostas Recebidas"**
   - Visualize todas as propostas recebidas
   - Use filtros para encontrar propostas específicas

2. **Envie para Análise**
   - Clique em "Enviar para Análise" em propostas pendentes
   - As propostas aparecerão em "Em Análise"

3. **Analise as Propostas**
   - Acesse "Em Análise"
   - Visualize detalhes completos
   - Aprove ou reprove com motivo

4. **Finalize o Cadastro**
   - Acesse "Cadastrado"
   - Preencha dados obrigatórios
   - Cliente fica oficialmente cadastrado

### Para Gerar PDFs

1. **Acesse detalhes da proposta**
2. **Clique em "Gerar PDF"**
3. **Selecione o modelo desejado**
4. **PDF será gerado e aberto automaticamente**

## 🔧 Scripts de Atualização

Execute o script SQL para atualizar o banco de dados:

```bash
# Execute no seu banco de dados PostgreSQL
psql -d seu_banco -f scripts/atualizar-fluxo-propostas.sql
```

## 📊 Benefícios

### Para Administradores
- **Fluxo mais organizado**: Separação clara por status
- **Melhor controle**: Acompanhamento visual do progresso
- **Dados obrigatórios**: Garantia de informações completas
- **PDF personalizado**: Geração com modelo escolhido

### Para o Sistema
- **Performance**: Índices otimizados
- **Integridade**: Constraints atualizadas
- **Rastreabilidade**: Histórico completo de mudanças
- **Escalabilidade**: Estrutura preparada para crescimento

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro ao gerar PDF**
   - Verifique se o modelo tem arquivo válido
   - Confirme se os dados da proposta estão completos

2. **Proposta não aparece na página correta**
   - Verifique o status da proposta no banco
   - Confirme se as constraints foram aplicadas

3. **Erro ao finalizar cadastro**
   - Verifique se todos os campos obrigatórios foram preenchidos
   - Confirme se as colunas foram criadas no banco

### Logs de Debug
- Console do navegador mostra logs detalhados
- Verifique erros de rede e validação
- Confirme status das operações no banco

## 📈 Próximos Passos

### Melhorias Futuras
- [ ] Notificações por email automáticas
- [ ] Relatórios de performance
- [ ] Integração com sistemas externos
- [ ] Dashboard com métricas avançadas
- [ ] Workflow automatizado

### Manutenção
- [ ] Monitoramento de performance
- [ ] Backup automático dos dados
- [ ] Atualizações de segurança
- [ ] Documentação de API

---

**Versão**: 1.0.0  
**Data**: Dezembro 2024  
**Autor**: Sistema ContratandoPlanos 