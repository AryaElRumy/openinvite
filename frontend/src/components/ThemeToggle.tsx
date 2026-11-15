import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'
import { theme } from '@/theme'

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(theme.subscribe, () => theme.get() === 'dark')

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => theme.toggle()}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
