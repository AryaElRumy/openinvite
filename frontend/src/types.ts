export type User = {
  id: string
  email: string
}

export type WeddingEvent = {
  name: string
  start?: string | null
  end?: string | null
  venue?: string | null
  address?: string | null
}

export type Wedding = {
  id: string
  slug: string
  slug_locked: boolean
  partner_one_name: string
  partner_two_name: string
  wedding_date: string
  venue_name: string
  venue_address: string | null
  maps_url: string | null
  events: WeddingEvent[]
}

export type WeddingPayload = {
  partner_one_name: string
  partner_two_name: string
  wedding_date: string
  venue_name: string
  venue_address: string | null
  maps_url: string | null
  events: WeddingEvent[]
  slug?: string | null
}

export type Invitation = {
  template_id: string
  headline: string
  message: string
  quote: string | null
  cover_image_url: string | null
  gallery_image_urls: string[]
  closing_message: string | null
}

export type InvitationPreview = {
  wedding: Wedding
  invitation: Invitation
}
