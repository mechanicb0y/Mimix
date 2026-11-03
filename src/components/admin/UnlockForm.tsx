'use client'
import { useRouter } from 'next/navigation'
import { ReauthForm } from './admin-api'

export function UnlockForm({ next }: { next: string }) {
  const router = useRouter()
  return <ReauthForm twoFactor locked onDone={() => { router.replace(next); router.refresh() }} />
}
