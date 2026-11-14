import type { ReactNode } from 'react'
import { useState } from 'react'
import { BookOpen, CalendarDays, Eye, Heart, LayoutDashboard, LogOut, Menu, Palette, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu } from '@/components/ui/sidebar'
import { useAuth } from '@/auth'
import { cn } from '@/lib/utils'

export function Page({
  children,
  width = 'default',
}: {
  children: ReactNode
  width?: 'default' | 'wide'
}) {
  return (
    <main
      className={cn('mx-auto w-full px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:pl-72', width === 'wide' ? 'max-w-7xl' : 'max-w-5xl')}
    >
      {children}
    </main>
  )
}

export function AppTopBar({
  active,
}: {
  active: 'dashboard' | 'guests' | 'guestbook' | 'editor' | 'preview'
}) {
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <>
      <SidebarNavigation active={active} logout={logout} />
      {open && <><div className="fixed inset-0 z-30 bg-foreground/35 lg:hidden" onClick={() => setOpen(false)} /><SidebarNavigation active={active} logout={logout} mobile onNavigate={() => setOpen(false)} /></>}
      <header className="sticky top-0 z-20 mb-10 flex items-center justify-between border-b border-border/80 bg-background/90 py-3 backdrop-blur-xl lg:hidden">
        <span className="font-semibold tracking-tight">openinvite<span className="text-primary">.</span></span>
        <Button variant="outline" size="icon" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu className="size-4" /></Button>
      </header>
    </>
  )
}

const sidebarItems = [
  { label: 'Overview', href: '/', icon: LayoutDashboard, key: 'dashboard' },
  { label: 'Guest list', href: '/guests', icon: Users, key: 'guests' },
  { label: 'Guestbook', href: '/guestbook', icon: BookOpen, key: 'guestbook' },
  { label: 'Design invitation', href: '/editor', icon: Palette, key: 'editor' },
  { label: 'Preview', href: '/preview', icon: Eye, key: 'preview' },
] as const

function SidebarNavigation({
  active,
  logout,
  mobile = false,
  onNavigate,
}: {
  active: 'dashboard' | 'guests' | 'guestbook' | 'editor' | 'preview'
  logout: () => Promise<void>
  mobile?: boolean
  onNavigate?: () => void
}) {
  return (
    <Sidebar className={cn('fixed left-0 top-0 z-40', mobile ? 'lg:hidden' : 'hidden lg:flex')}>
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-sidebar-foreground no-underline">
          <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-foreground text-sidebar"><Heart className="size-4 fill-current" /></span>
          <span>openinvite<span className="text-sidebar-primary">.</span></span>
        </Link>
        {mobile && <Button variant="ghost" size="icon" className="absolute right-4 top-4 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label="Close navigation" onClick={onNavigate}><X className="size-4" /></Button>}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            {sidebarItems.map(({ label, href, icon: Icon, key }) => (
              <Link key={key} to={href} onClick={onNavigate} className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/65 no-underline transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', active === key && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
                <Icon className="size-4" />{label}
              </Link>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-auto mb-4">
          <SidebarGroupLabel>Event</SidebarGroupLabel>
          <div className="mx-3 rounded-md border border-sidebar-border bg-sidebar-accent/50 p-3 text-xs text-sidebar-foreground/60"><CalendarDays className="mb-2 size-4 text-sidebar-primary" /><p>Everything in one place, ready when you are.</p></div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><LogOut className="size-4" />Sign out</button>
      </SidebarFooter>
    </Sidebar>
  )
}
