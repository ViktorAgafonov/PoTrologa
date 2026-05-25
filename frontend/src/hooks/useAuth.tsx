import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from '../services/api'

interface User {
  id: number
  login: string
  role: string
  email: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (login: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (login: string, password: string) => {
    const res = await authApi.login(login, password)
    setUser(res.user)
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
