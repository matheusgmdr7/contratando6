import { supabase } from "@/lib/supabase"
import { supabase as supabaseAuth } from "@/lib/supabase-auth"
import bcrypt from "bcryptjs"

export interface UsuarioAdmin {
  id: string
  nome: string
  email: string
  senha_hash?: string // agora opcional
  ativo: boolean
  perfil: string
  permissoes: any
  ultimo_login?: string
  created_at: string
  updated_at: string
  auth_user_id?: string // novo campo para vincular com Supabase Auth
}

export interface CriarUsuarioData {
  nome: string
  email: string
  senha: string
  perfil?: string
  permissoes?: any
}

export interface LoginData {
  email: string
  senha: string
}

/**
 * Serviço para gerenciar usuários administrativos (Integrado com Supabase Auth)
 */
export class UsuariosAdminService {
  /**
   * Criar um novo usuário admin (Integrado)
   */
  static async criarUsuario(
    dados: CriarUsuarioData,
  ): Promise<{ success: boolean; message: string; usuario?: UsuarioAdmin }> {
    try {
      console.log("🔐 Criando novo usuário admin integrado:", dados.email)

      // 1. Verificar se o email já existe na tabela usuarios_admin
      const { data: usuarioExistente, error: errorVerificacao } = await supabase
        .from("usuarios_admin")
        .select("email")
        .eq("email", dados.email.toLowerCase())
        .single()

      if (usuarioExistente) {
        return {
          success: false,
          message: "Email já está em uso na tabela de permissões",
        }
      }

      // 2. Criar usuário no Supabase Auth (usando signUp em vez de admin)
      console.log("📋 Criando usuário no Supabase Auth...")
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email: dados.email.toLowerCase(),
        password: dados.senha,
        options: {
          data: {
            role: "admin",
            nome: dados.nome,
            perfil: dados.perfil || "assistente",
          }
        }
      })

      if (authError) {
        console.error("❌ Erro ao criar usuário no Auth:", authError)
        return {
          success: false,
          message: "Erro ao criar usuário no sistema de autenticação: " + authError.message,
        }
      }

      if (!authData.user) {
        return {
          success: false,
          message: "Erro: Usuário não foi criado no Auth",
        }
      }

      // 3. Criar registro na tabela usuarios_admin
      console.log("📋 Criando registro na tabela de permissões...")
      const { data: novoUsuario, error } = await supabase
        .from("usuarios_admin")
        .insert([
          {
            id: authData.user.id, // Usar o mesmo ID do Auth
            nome: dados.nome,
            email: dados.email.toLowerCase(),
            ativo: true,
            perfil: dados.perfil || "assistente",
            permissoes: dados.permissoes || {},
            auth_user_id: authData.user.id, // Vincular com Auth
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao criar usuário na tabela:", error)
        // Não podemos deletar do Auth sem permissões admin, mas podemos marcar como inativo
        return {
          success: false,
          message: "Erro ao criar usuário na tabela de permissões: " + error.message,
        }
      }

      console.log("✅ Usuário criado com sucesso (Auth + Permissões):", novoUsuario.email)
      return {
        success: true,
        message: "Usuário criado com sucesso no sistema integrado. Verifique seu email para confirmar a conta.",
        usuario: novoUsuario,
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado ao criar usuário:", error)
      return {
        success: false,
        message: "Erro inesperado: " + error.message,
      }
    }
  }

  /**
   * Fazer login de usuário admin (Agora usa Supabase Auth)
   */
  static async login(dados: LoginData): Promise<{ success: boolean; message: string; usuario?: UsuarioAdmin }> {
    try {
      console.log("🔐 Tentativa de login integrado:", dados.email)

      // 1. Fazer login no Supabase Auth
      const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
        email: dados.email.toLowerCase(),
        password: dados.senha,
      })

      if (authError) {
        console.log("❌ Erro no login do Auth:", authError.message)
        return {
          success: false,
          message: "Email ou senha incorretos",
        }
      }

      // 2. Buscar dados do usuário na tabela usuarios_admin
      const { data: usuario, error: userError } = await supabase
        .from("usuarios_admin")
        .select("*")
        .eq("email", dados.email.toLowerCase())
        .eq("ativo", true)
        .single()

      if (userError || !usuario) {
        console.log("❌ Usuário não encontrado na tabela de permissões")
        // Fazer logout do Auth se não encontrar na tabela
        await supabaseAuth.auth.signOut()
        return {
          success: false,
          message: "Usuário não tem permissões configuradas",
        }
      }

      // 3. Atualizar último login
      await supabase
        .from("usuarios_admin")
        .update({
          ultimo_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", usuario.id)

      console.log("✅ Login realizado com sucesso:", usuario.email)
      return {
        success: true,
        message: "Login realizado com sucesso",
        usuario: {
          ...usuario,
          senha_hash: undefined, // Não retornar o hash da senha
        },
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado no login:", error)
      return {
        success: false,
        message: "Erro inesperado: " + error.message,
      }
    }
  }

  /**
   * Listar todos os usuários admin (Integrado)
   */
  static async listarUsuarios(): Promise<{ success: boolean; usuarios: UsuarioAdmin[]; message?: string }> {
    try {
      console.log("📋 Listando usuários admin integrados...")

      const { data: usuarios, error } = await supabase
        .from("usuarios_admin")
        .select("id, nome, email, ativo, ultimo_login, created_at, updated_at, perfil, permissoes, auth_user_id")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Erro ao listar usuários:", error)
        return {
          success: false,
          usuarios: [],
          message: "Erro ao listar usuários: " + error.message,
        }
      }

      console.log(`✅ ${usuarios?.length || 0} usuários encontrados`)
      return {
        success: true,
        usuarios: (usuarios || []).map(u => ({
          ...u,
          perfil: u.perfil || "assistente",
          permissoes: u.permissoes || {},
        })),
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado ao listar usuários:", error)
      return {
        success: false,
        usuarios: [],
        message: "Erro inesperado: " + error.message,
      }
    }
  }

  /**
   * Alterar status do usuário (Integrado)
   */
  static async alterarStatusUsuario(id: string, ativo: boolean): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔄 Alterando status do usuário ${id} para: ${ativo ? "ativo" : "inativo"}`)

      const { error } = await supabase
        .from("usuarios_admin")
        .update({
          ativo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) {
        console.error("❌ Erro ao alterar status:", error)
        return {
          success: false,
          message: "Erro ao alterar status: " + error.message,
        }
      }

      console.log("✅ Status alterado com sucesso")
      return {
        success: true,
        message: `Usuário ${ativo ? "ativado" : "desativado"} com sucesso`,
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado ao alterar status:", error)
      return {
        success: false,
        message: "Erro inesperado: " + error.message,
      }
    }
  }

  /**
   * Alterar senha do usuário (Integrado)
   */
  static async alterarSenha(id: string, novaSenha: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔐 Alterando senha do usuário ${id}`)

      // Buscar auth_user_id
      const { data: usuario, error: userError } = await supabase
        .from("usuarios_admin")
        .select("auth_user_id")
        .eq("id", id)
        .single()

      if (userError || !usuario?.auth_user_id) {
        return {
          success: false,
          message: "Usuário não encontrado ou não vinculado ao Auth",
        }
      }

      // Alterar senha no Supabase Auth (usando updateUser)
      const { error: authError } = await supabaseAuth.auth.updateUser({
        password: novaSenha
      })

      if (authError) {
        return {
          success: false,
          message: "Erro ao alterar senha: " + authError.message,
        }
      }

      console.log("✅ Senha alterada com sucesso")
      return {
        success: true,
        message: "Senha alterada com sucesso",
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado ao alterar senha:", error)
      return {
        success: false,
        message: "Erro inesperado: " + error.message,
      }
    }
  }

  /**
   * Excluir usuário (Integrado)
   */
  static async excluirUsuario(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ Excluindo usuário ${id}`)

      // Buscar usuário na tabela
      const { data: usuario, error: userError } = await supabase
        .from("usuarios_admin")
        .select("id")
        .eq("id", id)
        .single()

      if (userError || !usuario) {
        return {
          success: false,
          message: "Usuário não encontrado",
        }
      }

      // Excluir da tabela usuarios_admin
      const { error: dbError } = await supabase
        .from("usuarios_admin")
        .delete()
        .eq("id", id)

      if (dbError) {
        return {
          success: false,
          message: "Erro ao excluir usuário da tabela: " + dbError.message,
        }
      }

      // Não podemos excluir do Auth sem permissões admin, mas podemos marcar como inativo
      console.log("⚠️ Usuário removido da tabela. Para remover do Auth, use o Dashboard do Supabase.")
      
      console.log("✅ Usuário excluído com sucesso")
      return {
        success: true,
        message: "Usuário excluído da tabela de permissões. Para remover do Auth, use o Dashboard do Supabase.",
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado ao excluir usuário:", error)
      return {
        success: false,
        message: "Erro inesperado: " + error.message,
      }
    }
  }

  /**
   * Vincular usuário existente do Supabase Auth
   */
  static async vincularUsuarioExistente(
    email: string,
    dados: {
      nome: string
      perfil?: string
      permissoes?: any
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔗 Vincular usuário existente: ${email}`)

      // Verificar se já existe na tabela
      const { data: usuarioExistente, error: checkError } = await supabase
        .from("usuarios_admin")
        .select("id")
        .eq("email", email.toLowerCase())
        .single()

      if (usuarioExistente) {
        return {
          success: false,
          message: "Usuário já existe na tabela de permissões",
        }
      }

      // Criar registro na tabela usuarios_admin (sem auth_user_id por enquanto)
      const { error: dbError } = await supabase
        .from("usuarios_admin")
        .insert({
          id: crypto.randomUUID(), // Gerar ID único
          nome: dados.nome,
          email: email.toLowerCase(),
          perfil: dados.perfil || "assistente",
          permissoes: dados.permissoes || {},
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (dbError) {
        return {
          success: false,
          message: "Erro ao vincular usuário: " + dbError.message,
        }
      }

      return {
        success: true,
        message: "Usuário vinculado com sucesso. Para vincular com Auth, use o Dashboard do Supabase.",
      }
    } catch (error: any) {
      return {
        success: false,
        message: "Erro inesperado: " + error.message,
      }
    }
  }

  /**
   * Buscar usuário por ID
   */
  static async buscarUsuarioPorId(id: string): Promise<{ success: boolean; usuario?: UsuarioAdmin; message?: string }> {
    try {
      console.log("🔍 Buscando usuário por ID:", id)

      const { data: usuario, error } = await supabase
        .from("usuarios_admin")
        .select("id, nome, email, ativo, ultimo_login, created_at, updated_at, perfil, permissoes, auth_user_id")
        .eq("id", id)
        .single()

      if (error || !usuario) {
        console.log("❌ Usuário não encontrado")
        return {
          success: false,
          message: "Usuário não encontrado",
        }
      }

      console.log("✅ Usuário encontrado:", usuario.email)
      return {
        success: true,
        usuario: {
          ...usuario,
          perfil: usuario.perfil || "assistente",
          permissoes: usuario.permissoes || {},
        },
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado ao buscar usuário:", error)
      return {
        success: false,
        message: "Erro inesperado: " + error.message,
      }
    }
  }

  /**
   * Verificar se existe pelo menos um usuário admin
   */
  static async verificarUsuariosExistentes(): Promise<{ success: boolean; existem: boolean; total: number }> {
    try {
      console.log("🔍 Verificando usuários existentes...")

      const { data: usuarios, error } = await supabase.from("usuarios_admin").select("id", { count: "exact" })

      if (error) {
        console.error("❌ Erro ao verificar usuários:", error)
        return {
          success: false,
          existem: false,
          total: 0,
        }
      }

      const total = usuarios?.length || 0
      console.log(`✅ ${total} usuários encontrados`)

      return {
        success: true,
        existem: total > 0,
        total,
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado ao verificar usuários:", error)
      return {
        success: false,
        existem: false,
        total: 0,
      }
    }
  }

  /**
   * Criar usuário admin padrão (para setup inicial)
   */
  static async criarUsuarioPadrao(): Promise<{ success: boolean; message: string; usuario?: UsuarioAdmin }> {
    try {
      console.log("🔧 Criando usuário admin padrão...")

      const dadosPadrao: CriarUsuarioData = {
        nome: "Administrador",
        email: "admin@contratandoplanos.com",
        senha: "admin123456",
      }

      const resultado = await this.criarUsuario(dadosPadrao)

      if (resultado.success) {
        console.log("✅ Usuário admin padrão criado com sucesso")
        console.log("📧 Email:", dadosPadrao.email)
        console.log("🔐 Senha:", dadosPadrao.senha)
        console.log("⚠️ IMPORTANTE: Altere a senha após o primeiro login!")
      }

      return resultado
    } catch (error: any) {
      console.error("❌ Erro ao criar usuário padrão:", error)
      return {
        success: false,
        message: "Erro ao criar usuário padrão: " + error.message,
      }
    }
  }

  /**
   * Validar token de sessão (simulado - em produção usar JWT)
   */
  static async validarSessao(token: string): Promise<{ success: boolean; usuario?: UsuarioAdmin }> {
    try {
      // Em produção, implementar validação JWT real
      // Por enquanto, usar uma validação simples baseada no email
      const email = Buffer.from(token, "base64").toString("utf-8")

      const { data: usuario, error } = await supabase
        .from("usuarios_admin")
        .select("id, nome, email, ativo, ultimo_login, created_at, updated_at, perfil, permissoes, auth_user_id")
        .eq("email", email)
        .eq("ativo", true)
        .single()

      if (error || !usuario) {
        return { success: false }
      }

      return {
        success: true,
        usuario: {
          ...usuario,
          perfil: usuario.perfil || "assistente",
          permissoes: usuario.permissoes || {},
        },
      }
    } catch (error: any) {
      console.error("❌ Erro ao validar sessão:", error)
      return { success: false }
    }
  }

  /**
   * Gerar token de sessão (simulado - em produção usar JWT)
   */
  static gerarToken(email: string): string {
    // Em produção, usar JWT com expiração e assinatura
    return Buffer.from(email).toString("base64")
  }

  /**
   * Atualizar dados do usuário admin (nome, perfil, permissoes)
   */
  static async atualizarUsuario(id: string, dados: Partial<UsuarioAdmin>): Promise<{ error?: any }> {
    try {
      const { error } = await supabase
        .from("usuarios_admin")
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
      return { error }
    } catch (error: any) {
      return { error }
    }
  }
}

// Exportar instância padrão
export const usuariosAdminService = UsuariosAdminService

export async function buscarUsuariosAdmin() {
  const res = await UsuariosAdminService.listarUsuarios()
  if (!res.success) throw new Error(res.message || "Erro ao buscar usuários")
  return res.usuarios
}

export async function inicializarSistemaUsuarios() {
  // Verifica se existe usuário master, e cria se não existir
  const res = await UsuariosAdminService.verificarUsuariosExistentes()
  if (!res.success) throw new Error("Erro ao verificar usuários")
  if (!res.existem) {
    const criado = await UsuariosAdminService.criarUsuarioPadrao()
    if (!criado.success) throw new Error(criado.message || "Erro ao criar usuário padrão")
  }
  return true
}

export async function criarUsuarioAdmin(dados: CriarUsuarioData) {
  return UsuariosAdminService.criarUsuario(dados)
}

export async function atualizarUsuarioAdmin(id: string, dados: Partial<UsuarioAdmin>) {
  // Atualiza apenas os campos enviados
  const { error } = await supabase
    .from("usuarios_admin")
    .update({
      nome: dados.nome,
      email: dados.email?.toLowerCase(),
      perfil: dados.perfil,
      permissoes: dados.permissoes,
      ativo: dados.ativo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw new Error(error.message)
  return true
}

export async function excluirUsuarioAdmin() {
  throw new Error("Função de exclusão de usuário não implementada")
}

export async function alterarStatusUsuarioAdmin(id: string, ativo: boolean) {
  return UsuariosAdminService.alterarStatusUsuario(id, ativo)
}

export async function buscarPermissoesPerfil() {
  throw new Error("Função de buscar permissões não implementada")
}

export async function validarSenhaUsuarioAdmin(email: string, senha: string): Promise<UsuarioAdmin | null> {
  try {
    console.log("🔐 Validando senha do usuário admin:", email)

    // Buscar usuário pelo email
    const { data: usuario, error } = await supabase
      .from("usuarios_admin")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("ativo", true)
      .single()

    if (error || !usuario) {
      console.log("❌ Usuário não encontrado ou inativo")
      return null
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)

    if (!senhaValida) {
      console.log("❌ Senha incorreta")
      return null
    }

    // Atualizar último login
    await supabase
      .from("usuarios_admin")
      .update({
        ultimo_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", usuario.id)

    console.log("✅ Login realizado com sucesso:", usuario.email)
    return {
      ...usuario,
      senha_hash: undefined, // Não retornar o hash da senha
      perfil: usuario.perfil || "assistente",
      permissoes: usuario.permissoes || {},
    }
  } catch (error: any) {
    console.error("❌ Erro inesperado na validação:", error)
    return null
  }
}
