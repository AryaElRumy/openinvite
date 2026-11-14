PASSWORD = "password123"

WEDDING = {
    "partner_one_name": "Ayu",
    "partner_two_name": "Bima",
    "wedding_date": "2027-06-12",
    "venue_name": "Villa Taman",
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


def create_guest(client, name="Ayu"):
    response = client.post("/api/guests", json={"name": name})
    assert response.status_code == 201
    return response.json()


def token_headers(token):
    return {"X-Receptionist-Token": token}


def create_token(client):
    response = client.post("/api/receptionist")
    assert response.status_code == 200
    return response.json()["token"]


def test_receptionist_token_is_required(client):
    assert client.get("/api/reception/session").status_code == 401
    assert client.get("/api/reception/guests").status_code == 401


def test_create_token_and_access_wedding(client):
    login_as(client, "couple@example.com")
    wedding = create_wedding(client)
    token = create_token(client)
    client.post("/api/auth/logout")

    response = client.get("/api/reception/session", headers=token_headers(token))
    assert response.status_code == 200
    assert response.json()["slug"] == wedding["slug"]


def test_token_status_does_not_return_the_token(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    create_token(client)

    response = client.get("/api/receptionist")
    assert response.status_code == 200
    body = response.json()
    assert body["active"] is True
    assert "token" not in body


def test_revoke_invalidates_token(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    token = create_token(client)

    assert client.delete("/api/receptionist").status_code == 204
    client.post("/api/auth/logout")

    response = client.get("/api/reception/session", headers=token_headers(token))
    assert response.status_code == 401


def test_regenerate_invalidates_old_token(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    first = create_token(client)
    second = create_token(client)
    client.post("/api/auth/logout")

    assert (
        client.get("/api/reception/session", headers=token_headers(first)).status_code
        == 401
    )
    assert (
        client.get("/api/reception/session", headers=token_headers(second)).status_code
        == 200
    )


def test_owner_endpoints_require_authentication(client):
    assert client.get("/api/receptionist").status_code == 401
    assert client.post("/api/receptionist").status_code == 401
    assert client.delete("/api/receptionist").status_code == 401


def test_receptionist_cannot_access_owner_apis(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    token = create_token(client)
    client.post("/api/auth/logout")

    assert client.get("/api/guests", headers=token_headers(token)).status_code == 401
    assert (
        client.put(
            "/api/wedding",
            json=WEDDING,
            headers=token_headers(token),
        ).status_code
        == 401
    )


def test_receptionist_guest_lookup_is_scoped(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    create_guest(client, "Ayu Lestari")
    create_guest(client, "Bima")
    token = create_token(client)
    client.post("/api/auth/logout")

    response = client.get(
        "/api/reception/guests?search=ayu", headers=token_headers(token)
    )
    assert response.status_code == 200
    assert [guest["name"] for guest in response.json()] == ["Ayu Lestari"]

    assert (
        client.get(
            "/api/reception/guests",
            headers=token_headers("not-a-token"),
        ).status_code
        == 401
    )


def test_revoking_is_scoped_to_the_owner(client):
    login_as(client, "first@example.com")
    create_wedding(client)
    token = create_token(client)
    client.post("/api/auth/logout")

    login_as(client, "second@example.com")
    create_wedding(client)
    assert client.delete("/api/receptionist").status_code == 204
    client.post("/api/auth/logout")

    response = client.get("/api/reception/session", headers=token_headers(token))
    assert response.status_code == 200
