import { useAuth } from '../auth'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <main className="page">
      <header className="topbar">
        <strong>OpenInvite</strong>
        <button className="link" type="button" onClick={() => void logout()}>
          Sign out
        </button>
      </header>

      <section className="card">
        <h1>Welcome</h1>
        <p className="muted">{user?.email}</p>
        <p>Wedding setup arrives in the next ticket.</p>
      </section>
    </main>
  )
}
