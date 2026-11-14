PASSWORD = "password123"

WEDDING = {
    "partner_one_name": "Ayu",
    "partner_two_name": "Bima",
    "wedding_date": "2027-06-12",
    "venue_name": "Villa Taman",
}

INVITATION = {
    "template_id": "classic",
    "headline": "Ayu & Bima",
    "message": "We are getting married.",
    "quote": None,
    "cover_image_url": None,
    "gallery_image_urls": [],
    "closing_message": None,
}


def login_as(client, email):
    response = client.post(
        "/api/auth/register", json={"email": email, "password": PASSWORD}
    )
    assert response.status_code == 201


def create_wedding(client):
    response = client.put("/api/wedding", json=WEDDING)
    assert response.status_code == 200
    return response.json()


def publish_invitation(client):
    assert client.put("/api/invitation", json=INVITATION).status_code == 200
    response = client.post("/api/invitation/publish")
    assert response.status_code == 200
    return response.json()


def create_guest(client, name="Ayu", max_attendees=2):
    response = client.post(
        "/api/guests", json={"name": name, "max_attendees": max_attendees}
    )
    assert response.status_code == 201
    return response.json()


def rsvp_url(wedding, guest):
    return (
        f"/api/public/invitations/{wedding['slug']}/guests/"
        f"{guest['invitation_code']}/rsvp"
    )


def setup_published_guest(client, max_attendees=2):
    login_as(client, "couple@example.com")
    wedding = create_wedding(client)
    publish_invitation(client)
    guest = create_guest(client, max_attendees=max_attendees)
    client.post("/api/auth/logout")
    return wedding, guest


def test_guest_can_submit_and_update_rsvp(client):
    wedding, guest = setup_published_guest(client)
    url = rsvp_url(wedding, guest)

    first = client.post(url, json={"status": "attending", "attendee_count": 2})
    assert first.status_code == 200
    assert first.json()["status"] == "attending"
    assert first.json()["attendee_count"] == 2
    assert first.json()["responded_at"] is not None

    public = client.get(
        f"/api/public/invitations/{wedding['slug']}/guests/{guest['invitation_code']}"
    )
    assert public.status_code == 200
    assert public.json()["guest"]["rsvp"]["attendee_count"] == 2

    second = client.post(url, json={"status": "attending", "attendee_count": 1})
    assert second.status_code == 200
    assert second.json()["attendee_count"] == 1


def test_declined_rsvp_forces_zero_attendees(client):
    wedding, guest = setup_published_guest(client)

    response = client.post(
        rsvp_url(wedding, guest),
        json={"status": "declined", "attendee_count": 5},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "declined"
    assert response.json()["attendee_count"] == 0


def test_attendee_count_cannot_exceed_quota(client):
    wedding, guest = setup_published_guest(client, max_attendees=2)

    response = client.post(
        rsvp_url(wedding, guest),
        json={"status": "attending", "attendee_count": 3},
    )
    assert response.status_code == 400


def test_attending_attendee_count_must_be_positive(client):
    wedding, guest = setup_published_guest(client)

    response = client.post(
        rsvp_url(wedding, guest),
        json={"status": "attending", "attendee_count": 0},
    )
    assert response.status_code == 422


def test_rsvp_unknown_guest_returns_404(client):
    wedding, _ = setup_published_guest(client)

    response = client.post(
        f"/api/public/invitations/{wedding['slug']}/guests/not-a-code/rsvp",
        json={"status": "attending", "attendee_count": 1},
    )
    assert response.status_code == 404


def test_rsvp_requires_published_invitation(client):
    login_as(client, "couple@example.com")
    wedding = create_wedding(client)
    guest = create_guest(client)
    client.post("/api/auth/logout")

    response = client.post(
        rsvp_url(wedding, guest),
        json={"status": "attending", "attendee_count": 1},
    )
    assert response.status_code == 404
