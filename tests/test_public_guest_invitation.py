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


def test_public_guest_invitation_returns_snapshot_and_guest(client):
    login_as(client, "couple@example.com")
    wedding = create_wedding(client)
    publish_invitation(client)
    guest = create_guest(client)
    client.post("/api/auth/logout")

    response = client.get(
        f"/api/public/invitations/{wedding['slug']}/guests/{guest['invitation_code']}"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["guest"] == {
        "name": "Ayu",
        "max_attendees": 2,
        "rsvp": None,
    }
    assert body["version"] == 1
    assert body["wedding"]["partner_one_name"] == "Ayu"
    assert body["invitation"]["message"] == INVITATION["message"]


def test_public_guest_invitation_unknown_code_returns_404(client):
    login_as(client, "couple@example.com")
    wedding = create_wedding(client)
    publish_invitation(client)
    create_guest(client)
    client.post("/api/auth/logout")

    response = client.get(
        f"/api/public/invitations/{wedding['slug']}/guests/not-a-code"
    )
    assert response.status_code == 404


def test_public_guest_invitation_wrong_wedding_returns_404(client):
    login_as(client, "first@example.com")
    create_wedding(client)
    publish_invitation(client)
    first_guest = create_guest(client)
    client.post("/api/auth/logout")

    login_as(client, "second@example.com")
    second_wedding = create_wedding(client)
    publish_invitation(client)

    response = client.get(
        f"/api/public/invitations/{second_wedding['slug']}/guests/{first_guest['invitation_code']}"
    )
    assert response.status_code == 404


def test_public_guest_invitation_unpublished_returns_404(client):
    login_as(client, "couple@example.com")
    wedding = create_wedding(client)
    guest = create_guest(client)
    client.post("/api/auth/logout")

    response = client.get(
        f"/api/public/invitations/{wedding['slug']}/guests/{guest['invitation_code']}"
    )
    assert response.status_code == 404
