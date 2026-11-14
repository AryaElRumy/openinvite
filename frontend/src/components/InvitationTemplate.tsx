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
    <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      {invitation.cover_image_url && (
        <img
          className="block max-h-96 w-full object-cover"
          src={invitation.cover_image_url}
          alt=""
        />
      )}

      <header className="px-6 py-10 text-center">
        {guest && (
          <>
            <p className="text-sm font-semibold break-words">Dear {guest.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Admits up to {guest.max_attendees}{' '}
              {guest.max_attendees === 1 ? 'guest' : 'guests'}.
            </p>
          </>
        )}
        <p className="mt-4 text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
          The Wedding Of
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-[1.02] tracking-[-0.025em] sm:text-5xl">
          {headline}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDate(wedding.wedding_date)}
        </p>
      </header>

      {invitation.quote && (
        <blockquote className="mx-6 my-4 border-s-4 border-primary bg-muted/40 p-4 text-sm text-muted-foreground italic">
          {invitation.quote}
        </blockquote>
      )}

      {invitation.message && (
        <p className="px-6 py-2 leading-7 whitespace-pre-line">
          {invitation.message}
        </p>
      )}

      {wedding.events.length > 0 && (
        <section className="border-t px-6 py-5">
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
            Events
          </h2>
          <ul className="mt-3 space-y-3">
            {wedding.events.map((event, index) => (
              <li key={index} className="flex flex-col gap-0.5">
                <strong className="font-semibold">{event.name}</strong>
                {(event.start || event.end) && (
                  <span className="text-sm text-muted-foreground">
                    {[event.start, event.end].filter(Boolean).join(' – ')}
                  </span>
                )}
                {event.venue && (
                  <span className="text-sm text-muted-foreground">
                    {event.venue}
                  </span>
                )}
                {event.address && (
                  <span className="text-sm text-muted-foreground">
                    {event.address}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t px-6 py-5">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
          Venue
        </h2>
        <p className="mt-2 text-sm font-medium">{wedding.venue_name}</p>
        {wedding.venue_address && (
          <p className="text-sm text-muted-foreground">
            {wedding.venue_address}
          </p>
        )}
        {wedding.maps_url && (
          <a
            href={wedding.maps_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Open map
          </a>
        )}
      </section>

      {invitation.gallery_image_urls.length > 0 && (
        <section className="border-t px-6 py-5">
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
            Gallery
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {invitation.gallery_image_urls.map((url, index) => (
              <img
                key={index}
                className="aspect-square w-full rounded-lg object-cover"
                src={url}
                alt=""
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}

      {invitation.closing_message && (
        <footer className="px-6 py-8 text-center font-serif text-xl tracking-[-0.01em]">
          {invitation.closing_message}
        </footer>
      )}
    </article>
  )
}