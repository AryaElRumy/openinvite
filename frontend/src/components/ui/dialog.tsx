import { useEffect, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/35 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      {children}
    </div>
  )
}

export function DialogContent({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      aria-modal="true"
      className={cn(
        'relative my-auto flex w-full max-w-lg flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground shadow-2xl',
        className,
      )}
      role="dialog"
    >
      {children}
    </section>
  )
}

export function DialogHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex flex-col gap-2', className)}>{children}</div>
}

export function DialogTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={cn('font-serif text-2xl tracking-tight', className)}>{children}</h2>
}

export function DialogDescription({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}>{children}</div>
}

export function DialogClose({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={cn('text-sm text-muted-foreground hover:text-foreground', className)} onClick={onClick}>
      {children}
    </button>
  )
}
