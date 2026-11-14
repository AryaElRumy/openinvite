import type { Invitation, Wedding } from '../types'

type Props = {
  wedding: Wedding
  invitation: Invitation
  guest?: { name: string; max_attendees: number } | null
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { dateStyle: 'long' })
}

export default function InvitationTemplate({
  wedding,
  invitation,
  guest = null,
}: Props) {
  const names = `${wedding.partner_one_name} & ${wedding.partner_two_name}`
  const headline = invitation.headline.trim() === '' ? names : invitation.headline

  return (
    <article className="invitation">
      {invitation.cover_image_url && (
        <img
          className="invitation-cover"
          src={invitation.cover_image_url}
          alt=""
        />
      )}

      <header className="invitation-hero">
        {guest && (
          <>
            <p className="invitation-guest">Dear {guest.name}</p>
            <p className="invitation-quota">
              Admits up to {guest.max_attendees}{' '}
              {guest.max_attendees === 1 ? 'guest' : 'guests'}.
            </p>
          </>
        )}
        <p className="invitation-kicker">The Wedding Of</p>
        <h1>{headline}</h1>
        <p className="invitation-date">{formatDate(wedding.wedding_date)}</p>
      </header>

      {invitation.quote && (
        <blockquote className="invitation-quote">{invitation.quote}</blockquote>
      )}

      {invitation.message && (
        <p className="invitation-message">{invitation.message}</p>
      )}

      {wedding.events.length > 0 && (
        <section className="invitation-section">
          <h2>Events</h2>
          <ul className="invitation-events">
            {wedding.events.map((event, index) => (
              <li key={index}>
                <strong>{event.name}</strong>
                {(event.start || event.end) && (
                  <span>
                    {[event.start, event.end].filter(Boolean).join(' – ')}
                  </span>
                )}
                {event.venue && <span>{event.venue}</span>}
                {event.address && <span>{event.address}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="invitation-section">
        <h2>Venue</h2>
        <p>{wedding.venue_name}</p>
        {wedding.venue_address && (
          <p className="muted">{wedding.venue_address}</p>
        )}
        {wedding.maps_url && (
          <a href={wedding.maps_url} target="_blank" rel="noreferrer">
            Open map
          </a>
        )}
      </section>

      {invitation.gallery_image_urls.length > 0 && (
        <section className="invitation-section">
          <h2>Gallery</h2>
          <div className="invitation-gallery">
            {invitation.gallery_image_urls.map((url, index) => (
              <img key={index} src={url} alt="" loading="lazy" />
            ))}
          </div>
        </section>
      )}

      {invitation.closing_message && (
        <footer className="invitation-closing">
          {invitation.closing_message}
        </footer>
      )}
    </article>
  )
}
