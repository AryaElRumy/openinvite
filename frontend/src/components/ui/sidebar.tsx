import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Sidebar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <aside data-slot="sidebar" className={cn('flex h-dvh w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground', className)}>
      {children}
    </aside>
  )
}

export function SidebarHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div data-slot="sidebar-header" className={cn('p-5', className)}>{children}</div>
}

export function SidebarContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div data-slot="sidebar-content" className={cn('flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3', className)}>{children}</div>
}

export function SidebarGroup({ className, children }: { className?: string; children: ReactNode }) {
  return <section data-slot="sidebar-group" className={cn('flex min-w-0 flex-col gap-1', className)}>{children}</section>
}

export function SidebarGroupLabel({ children }: { children: ReactNode }) {
  return <p data-slot="sidebar-group-label" className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">{children}</p>
}

export function SidebarMenu({ children }: { children: ReactNode }) {
  return <nav data-slot="sidebar-menu" className="flex flex-col gap-1">{children}</nav>
}

export function SidebarFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div data-slot="sidebar-footer" className={cn('mt-auto border-t border-sidebar-border p-3', className)}>{children}</div>
}
