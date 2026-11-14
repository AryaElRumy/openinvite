PASSWORD = "password123"

WEDDING = {
    "partner_one_name": "Ayu",
    "partner_two_name": "Bima",
    "wedding_date": "2027-06-12",
    "venue_name": "Villa Taman",
    "venue_address": "Jl. Mawar 1",
    "maps_url": "https://maps.example.com/villa",
    "events": [
        {
            "name": "Akad",
            "start": "08:00",
            "end": "10:00",
            "venue": "Villa Taman",
            "address": "Jl. Mawar 1",
        }
    ],
}


def login_as(client, email):
    response = client.post(
        "/api/auth/register", json={"email": email, "password": PASSWORD}
    )
    assert response.status_code == 201


def test_wedding_requires_authentication(client):
    assert client.get("/api/wedding").status_code == 401
    assert client.put("/api/wedding", json=WEDDING).status_code == 401


def test_get_before_setup_returns_404(client):
    login_as(client, "couple@example.com")

    assert client.get("/api/wedding").status_code == 404


def test_create_and_read_wedding(client):
    login_as(client, "couple@example.com")

    created = client.put("/api/wedding", json=WEDDING)
    assert created.status_code == 200
    body = created.json()
    assert body["slug"] == "ayu-bima"
    assert body["slug_locked"] is False
    assert body["partner_one_name"] == "Ayu"
    assert body["events"][0]["name"] == "Akad"

    fetched = client.get("/api/wedding")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == body["id"]


def test_update_keeps_slug_and_changes_fields(client):
    login_as(client, "couple@example.com")
    created = client.put("/api/wedding", json=WEDDING).json()

    updated = client.put(
        "/api/wedding",
        json={**WEDDING, "venue_name": "Garden Hall", "events": []},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["slug"] == created["slug"]
    assert body["venue_name"] == "Garden Hall"
    assert body["events"] == []


def test_custom_slug_can_be_set_before_publishing(client):
    login_as(client, "couple@example.com")
    client.put("/api/wedding", json=WEDDING)

    updated = client.put("/api/wedding", json={**WEDDING, "slug": "ayu-bima-2027"})
    assert updated.status_code == 200
    assert updated.json()["slug"] == "ayu-bima-2027"


def test_slug_conflict_returns_409(client):
    login_as(client, "first@example.com")
    first = client.put("/api/wedding", json={**WEDDING, "slug": "shared-slug"})
    assert first.status_code == 200

    client.post("/api/auth/logout")
    login_as(client, "second@example.com")

    conflict = client.put("/api/wedding", json={**WEDDING, "slug": "shared-slug"})
    assert conflict.status_code == 409


def test_weddings_are_scoped_to_the_owner(client):
    login_as(client, "first@example.com")
    client.put("/api/wedding", json=WEDDING)

    client.post("/api/auth/logout")
    login_as(client, "second@example.com")

    assert client.get("/api/wedding").status_code == 404


def test_invalid_maps_url_and_slug_are_rejected(client):
    login_as(client, "couple@example.com")

    bad_url = client.put("/api/wedding", json={**WEDDING, "maps_url": "not-a-url"})
    assert bad_url.status_code == 422

    bad_slug = client.put("/api/wedding", json={**WEDDING, "slug": "Bad Slug!"})
    assert bad_slug.status_code == 422
