import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type AuthUser = {
  id: string
  name: string
  role: 'admin' | 'sub_admin' | 'member'
  projectIds: string[]
}

type AuthContextType = {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  updateProjectIds: (ids: string[]) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  updateProjectIds: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const s = localStorage.getItem('together_user')
    return s ? JSON.parse(s) : null
  })

  const login = (u: AuthUser) => {
    setUser(u)
    localStorage.setItem('together_user', JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('together_user')
  }

  const updateProjectIds = (ids: string[]) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, projectIds: ids }
      localStorage.setItem('together_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProjectIds }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
