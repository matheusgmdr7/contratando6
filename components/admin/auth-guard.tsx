"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-auth"
import { Spinner } from "@/components/ui/spinner"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Verificando autenticação")
        
        const {
          data: { session },
        } = await supabase.auth.getSession()
        
        if (session) {
          console.log("Usuário autenticado com sucesso")
          setIsAuthenticated(true)
        } else {
          console.log("Redirecionando para login - sem sessão")
          router.push("/admin/login")
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error)
        router.push("/admin/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
