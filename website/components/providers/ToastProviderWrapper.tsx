/**
 * Toast Provider Wrapper
 * Client component wrapper for ToastProvider to use in Server Component layouts
 */

'use client'

import { ToastProvider } from '@/lib/hooks/useToast'
import { ReactNode } from 'react'

interface ToastProviderWrapperProps {
  children: ReactNode
}

export function ToastProviderWrapper({ children }: ToastProviderWrapperProps) {
  return <ToastProvider>{children}</ToastProvider>
}
