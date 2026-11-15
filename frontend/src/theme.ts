type Theme = 'light' | 'dark'

const KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

const stored = () => localStorage.getItem(KEY)
const resolve = (): Theme => {
  const value = stored()
  if (value === 'light' || value === 'dark') return value
  return media.matches ? 'dark' : 'light'
}
const emit = () => {
  const dark = resolve() === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  listeners.forEach((listener) => listener())
}

export const theme = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  },
  get: resolve,
  set(value: Theme | 'system') {
    if (value === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, value)
    emit()
  },
  toggle() {
    theme.set(resolve() === 'dark' ? 'light' : 'dark')
  },
}

emit()
media.addEventListener('change', () => {
  if (!stored()) emit()
})
