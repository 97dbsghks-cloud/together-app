import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export type Theme = 'light' | 'dark'

type ThemeContextType = {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('together_theme') as Theme) ?? 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('together_theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
