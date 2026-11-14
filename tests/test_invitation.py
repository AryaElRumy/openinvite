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
    "quote": "Love is patient",
    "cover_image_url": "https://img.example.com/cover.jpg",
    "gallery_image_urls": [
        "https://img.example.com/1.jpg",
        "https://img.example.com/2.jpg",
    ],
    "closing_message": "See you there",
}


def login_as(client, email):
    response = client.post(
        "/api/auth/register", json={"email": email, "password": PASSWORD}
    )
    assert response.status_code == 201


def create_wedding(client, **overrides):
    response = client.put("/api/wedding", json={**WEDDING, **overrides})
    assert response.status_code == 200
    return response.json()


def test_invitation_requires_authentication(client):
    assert client.get("/api/invitation").status_code == 401
    assert client.put("/api/invitation", json=INVITATION).status_code == 401


def test_invitation_requires_a_wedding(client):
    login_as(client, "couple@example.com")

    assert client.get("/api/invitation").status_code == 404
    assert client.put("/api/invitation", json=INVITATION).status_code == 404


def test_get_returns_a_default_draft(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    response = client.get("/api/invitation")
    assert response.status_code == 200
    body = response.json()
    assert body["template_id"] == "classic"
    assert body["headline"] == "Ayu & Bima"
    assert body["message"] == ""
    assert body["gallery_image_urls"] == []


def test_create_and_update_draft(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    created = client.put("/api/invitation", json=INVITATION)
    assert created.status_code == 200
    assert created.json()["message"] == INVITATION["message"]

    fetched = client.get("/api/invitation")
    assert fetched.status_code == 200
    assert fetched.json()["gallery_image_urls"] == INVITATION["gallery_image_urls"]

    updated = client.put(
        "/api/invitation", json={**INVITATION, "message": "New message"}
    )
    assert updated.status_code == 200
    assert client.get("/api/invitation").json()["message"] == "New message"


def test_url_fields_accept_only_http_or_empty(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    bad_cover = client.put(
        "/api/invitation",
        json={**INVITATION, "cover_image_url": "ftp://img.example.com/cover.jpg"},
    )
    assert bad_cover.status_code == 422

    bad_gallery = client.put(
        "/api/invitation",
        json={**INVITATION, "gallery_image_urls": ["not-a-url"]},
    )
    assert bad_gallery.status_code == 422

    empty = client.put(
        "/api/invitation",
        json={
            **INVITATION,
            "cover_image_url": "",
            "gallery_image_urls": ["", "  ", "https://img.example.com/1.jpg"],
        },
    )
    assert empty.status_code == 200
    assert empty.json()["cover_image_url"] is None
    assert empty.json()["gallery_image_urls"] == ["https://img.example.com/1.jpg"]


def test_preview_requires_authentication(client):
    assert client.get("/api/invitation/preview").status_code == 401


def test_preview_requires_a_wedding(client):
    login_as(client, "couple@example.com")

    assert client.get("/api/invitation/preview").status_code == 404


def test_preview_assembles_wedding_and_saved_draft(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    default_preview = client.get("/api/invitation/preview")
    assert default_preview.status_code == 200
    assert default_preview.json()["wedding"]["slug"] == "ayu-bima"
    assert default_preview.json()["invitation"]["headline"] == "Ayu & Bima"

    client.put("/api/invitation", json=INVITATION)
    preview = client.get("/api/invitation/preview")
    assert preview.status_code == 200
    body = preview.json()
    assert body["wedding"]["partner_one_name"] == "Ayu"
    assert body["invitation"]["message"] == INVITATION["message"]
    assert body["invitation"]["gallery_image_urls"] == INVITATION["gallery_image_urls"]


def test_unknown_template_is_rejected(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    response = client.put(
        "/api/invitation", json={**INVITATION, "template_id": "modern"}
    )
    assert response.status_code == 422


def test_invitations_are_scoped_to_the_owner(client):
    login_as(client, "first@example.com")
    create_wedding(client)
    client.put("/api/invitation", json=INVITATION)

    client.post("/api/auth/logout")
    login_as(client, "second@example.com")
    create_wedding(client, partner_one_name="Citra", partner_two_name="Dewa")

    second = client.get("/api/invitation")
    assert second.status_code == 200
    assert second.json()["headline"] == "Citra & Dewa"
    assert second.json()["message"] == ""

    client.post("/api/auth/logout")
    login = client.post(
        "/api/auth/login",
        json={"email": "first@example.com", "password": PASSWORD},
    )
    assert login.status_code == 200
    assert client.get("/api/invitation").json()["message"] == INVITATION["message"]
