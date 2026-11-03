import {
  AudioLines, Blend, BookOpen, Building, Code, Copy, Eraser, FileText, Gamepad, GraduationCap, Info,
  KeyRound, Languages, Library, LifeBuoy, Mail, Mic, Newspaper, Repeat, Shield, Sparkles, Users, Wand, Webhook, Zap,
  type LucideProps,
} from 'lucide-react'
import type { IconName } from '@/config/products'

const ICONS: Record<IconName, React.ComponentType<LucideProps>> = {
  AudioLines, Blend, BookOpen, Building, Code, Copy, Eraser, FileText, Gamepad, GraduationCap, Info,
  KeyRound, Languages, Library, LifeBuoy, Mail, Mic, Newspaper, Repeat, Shield, Sparkles, Users, Wand, Webhook, Zap,
}

/** Lucide icon at the design-system stroke (1.75px), hidden from assistive tech. */
export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  const C = ICONS[name]
  return <C size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" className={className} />
}
