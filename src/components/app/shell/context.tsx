'use client'
import { createContext, useContext } from 'react'
import type { AppContext } from '@/server/app-context'

const Ctx = createContext<AppContext | null>(null)
export const AppContextProvider = Ctx.Provider

export function useAppContext(): AppContext {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppContext outside AppShell')
  return v
}
