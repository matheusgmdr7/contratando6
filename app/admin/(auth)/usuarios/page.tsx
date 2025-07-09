"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { UsuariosAdminService, UsuarioAdmin } from "@/services/usuarios-admin-service"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Trash2, Eye, EyeOff, UserPlus, Users, Shield, Calendar, Mail } from "lucide-react"

// Permissões padrão para novo usuário
const PERMISSOES_PADRAO = {
  dashboard: { visualizar: true },
  leads: { visualizar: true },
  propostas: { visualizar: true },
  usuarios: { visualizar: false },
  // ... adicione outros módulos conforme necessário ...
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: "assistente",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [editandoUsuario, setEditandoUsuario] = useState<UsuarioAdmin | null>(null)
  const [editForm, setEditForm] = useState({
    nome: "",
    email: "",
    perfil: "assistente",
    permissoes: PERMISSOES_PADRAO,
  })
  const [showEditModal, setShowEditModal] = useState(false)
  const { toast } = useToast()

  // Carregar usuários
  const carregarUsuarios = async () => {
    setLoading(true)
    try {
      const resultado = await UsuariosAdminService.listarUsuarios()
      if (resultado.success) {
        setUsuarios(resultado.usuarios)
      } else {
        toast({
          title: "Erro",
          description: resultado.message || "Erro ao carregar usuários",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar usuários",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarUsuarios()
  }, [])

  // Criar usuário
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.email || !formData.senha) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    try {
      const resultado = await UsuariosAdminService.criarUsuario(formData)
      
      if (resultado.success) {
        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso",
        })
        setShowForm(false)
        setFormData({ nome: "", email: "", senha: "", perfil: "assistente" })
        carregarUsuarios()
      } else {
        toast({
          title: "Erro",
          description: resultado.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar usuário",
        variant: "destructive",
      })
    }
  }

  // Alterar status
  const handleAlterarStatus = async (id: string, ativo: boolean) => {
    try {
      const resultado = await UsuariosAdminService.alterarStatusUsuario(id, ativo)
      
      if (resultado.success) {
        toast({
          title: "Sucesso",
          description: resultado.message,
        })
        carregarUsuarios()
      } else {
        toast({
          title: "Erro",
          description: resultado.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao alterar status",
        variant: "destructive",
      })
    }
  }

  // Excluir usuário
  const handleExcluirUsuario = async (id: string) => {
    try {
      const resultado = await UsuariosAdminService.excluirUsuario(id)
      
      if (resultado.success) {
        toast({
          title: "Sucesso",
          description: "Usuário excluído com sucesso",
        })
        carregarUsuarios()
      } else {
        toast({
          title: "Erro",
          description: resultado.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir usuário",
        variant: "destructive",
      })
    }
  }

  // Abrir modal de edição
  const handleAbrirEditar = (usuario: UsuarioAdmin) => {
    setEditandoUsuario(usuario)
    setEditForm({
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil || "assistente",
      permissoes: usuario.permissoes || PERMISSOES_PADRAO,
    })
    setShowEditModal(true)
  }

  // Salvar edição
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editandoUsuario) return
    try {
      const { nome, perfil, permissoes } = editForm
      const { error } = await UsuariosAdminService.atualizarUsuario(editandoUsuario.id, {
        nome,
        perfil,
        permissoes,
      })
      if (!error) {
        toast({ title: "Sucesso", description: "Usuário atualizado com sucesso" })
        setShowEditModal(false)
        carregarUsuarios()
      } else {
        toast({ title: "Erro", description: error.message, variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    }
  }

  const getPerfilColor = (perfil: string) => {
    switch (perfil) {
      case "master":
        return "bg-red-100 text-red-800"
      case "admin":
        return "bg-orange-100 text-orange-800"
      case "assistente":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPerfilLabel = (perfil: string) => {
    switch (perfil) {
      case "master":
        return "Master"
      case "admin":
        return "Administrador"
      case "assistente":
        return "Assistente"
      default:
        return perfil
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie usuários administrativos do sistema (tabela local)
          </p>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie um novo usuário administrativo no sistema local.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCriarUsuario} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@exemplo.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senha">Senha *</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="Digite a senha"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="perfil">Perfil</Label>
                <Select
                  value={formData.perfil}
                  onValueChange={(value) => setFormData({ ...formData, perfil: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assistente">Assistente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Criar Usuário
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total de Usuários</p>
                <p className="text-2xl font-bold">{usuarios.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Usuários Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {usuarios.filter(u => u.ativo).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Usuários Inativos</p>
                <p className="text-2xl font-bold text-red-600">
                  {usuarios.filter(u => !u.ativo).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Criados Hoje</p>
                <p className="text-2xl font-bold text-blue-600">
                  {usuarios.filter(u => {
                    const hoje = new Date().toDateString()
                    const criado = new Date(u.created_at).toDateString()
                    return hoje === criado
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Lista de todos os usuários administrativos (tabela local)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {usuarios.map((usuario) => (
                <div
                  key={usuario.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {usuario.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{usuario.nome}</h3>
                        <Badge variant={usuario.ativo ? "default" : "secondary"}>
                          {usuario.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        <Badge className={getPerfilColor(usuario.perfil)}>
                          {getPerfilLabel(usuario.perfil)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{usuario.email}</span>
                        </div>
                        
                        {usuario.ultimo_login && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Último login: {format(new Date(usuario.ultimo_login), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAbrirEditar(usuario)}
                    >
                      Editar
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o usuário "{usuario.nome}"? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleExcluirUsuario(usuario.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showEditModal && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>Edite o perfil e permissões do usuário</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil">Perfil</Label>
                <Select value={editForm.perfil} onValueChange={v => setEditForm(f => ({ ...f, perfil: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assistente">Assistente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Permissões</Label>
                {/* Exemplo de UI simples para editar permissões */}
                {Object.keys(PERMISSOES_PADRAO).map(modulo => (
                  <div key={modulo} className="flex items-center gap-2">
                    <span className="capitalize w-32">{modulo}</span>
                    {Object.keys(PERMISSOES_PADRAO[modulo]).map(acao => (
                      <label key={acao} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={!!editForm.permissoes?.[modulo]?.[acao]}
                          onChange={e => setEditForm(f => ({
                            ...f,
                            permissoes: {
                              ...f.permissoes,
                              [modulo]: {
                                ...f.permissoes?.[modulo],
                                [acao]: e.target.checked,
                              },
                            },
                          }))}
                        />
                        <span className="capitalize text-xs">{acao}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
