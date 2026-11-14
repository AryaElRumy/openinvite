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


def create_guest(client, name="Ayu"):
    response = client.post("/api/guests", json={"name": name})
    assert response.status_code == 201
    return response.json()


def publish_invitation(client):
    assert client.put("/api/invitation", json=INVITATION).status_code == 200
    assert client.post("/api/invitation/publish").status_code == 200


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


def test_validate_qr_returns_guest(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    publish_invitation(client)
    guest = create_guest(client, "Ayu Lestari")
    token = create_token(client)
    client.post("/api/auth/logout")

    response = client.post(
        "/api/reception/validate",
        json={"code": guest["invitation_code"]},
        headers=token_headers(token),
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Ayu Lestari"


def test_validate_unknown_code_returns_404(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    publish_invitation(client)
    create_guest(client)
    token = create_token(client)
    client.post("/api/auth/logout")

    response = client.post(
        "/api/reception/validate",
        json={"code": "not-a-code"},
        headers=token_headers(token),
    )
    assert response.status_code == 404


def test_validate_wrong_wedding_returns_404(client):
    login_as(client, "first@example.com")
    create_wedding(client)
    publish_invitation(client)
    guest = create_guest(client, "Ayu")
    client.post("/api/auth/logout")

    login_as(client, "second@example.com")
    create_wedding(client)
    publish_invitation(client)
    token = create_token(client)
    client.post("/api/auth/logout")

    response = client.post(
        "/api/reception/validate",
        json={"code": guest["invitation_code"]},
        headers=token_headers(token),
    )
    assert response.status_code == 404


def test_validate_requires_published_invitation(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    guest = create_guest(client, "Ayu")
    token = create_token(client)
    client.post("/api/auth/logout")

    response = client.post(
        "/api/reception/validate",
        json={"code": guest["invitation_code"]},
        headers=token_headers(token),
    )
    assert response.status_code == 404


def test_validate_empty_code_is_rejected(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    publish_invitation(client)
    token = create_token(client)
    client.post("/api/auth/logout")

    response = client.post(
        "/api/reception/validate",
        json={"code": ""},
        headers=token_headers(token),
    )
    assert response.status_code == 422


def test_validate_requires_receptionist_token(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    publish_invitation(client)
    guest = create_guest(client, "Ayu")

    response = client.post(
        "/api/reception/validate",
        json={"code": guest["invitation_code"]},
    )
    assert response.status_code == 401


def setup_check_in(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    publish_invitation(client)
    guest = create_guest(client, "Ayu")
    token = create_token(client)
    client.post("/api/auth/logout")
    return guest, token


def test_check_in_is_idempotent(client):
    guest, token = setup_check_in(client)
    headers = token_headers(token)
    url = "/api/reception/check-in"

    first = client.post(url, json={"code": guest["invitation_code"]}, headers=headers)
    assert first.status_code == 200
    assert first.json()["already_checked_in"] is False
    assert first.json()["checked_in_at"] is not None
    assert first.json()["guest"]["checked_in_at"] is not None

    second = client.post(url, json={"code": guest["invitation_code"]}, headers=headers)
    assert second.status_code == 200
    assert second.json()["already_checked_in"] is True
    assert second.json()["checked_in_at"] == first.json()["checked_in_at"]

    guests = client.get("/api/reception/guests", headers=headers).json()
    assert guests[0]["checked_in_at"] is not None


def test_check_in_unknown_code_returns_404(client):
    guest, token = setup_check_in(client)

    response = client.post(
        "/api/reception/check-in",
        json={"code": "not-a-code"},
        headers=token_headers(token),
    )
    assert response.status_code == 404


def test_check_in_requires_published_invitation(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    guest = create_guest(client, "Ayu")
    token = create_token(client)
    client.post("/api/auth/logout")

    response = client.post(
        "/api/reception/check-in",
        json={"code": guest["invitation_code"]},
        headers=token_headers(token),
    )
    assert response.status_code == 404


def test_check_in_requires_receptionist_token(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    publish_invitation(client)
    guest = create_guest(client, "Ayu")

    response = client.post(
        "/api/reception/check-in",
        json={"code": guest["invitation_code"]},
    )
    assert response.status_code == 401


def test_owner_can_see_and_undo_check_in(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    publish_invitation(client)
    guest = create_guest(client, "Ayu")
    token = create_token(client)

    client.post(
        "/api/reception/check-in",
        json={"code": guest["invitation_code"]},
        headers=token_headers(token),
    )

    guests = client.get("/api/guests").json()
    assert guests[0]["checked_in_at"] is not None

    undone = client.delete(f"/api/guests/{guest['id']}/check-in")
    assert undone.status_code == 204
    assert client.get("/api/guests").json()[0]["checked_in_at"] is None


def test_undo_check_in_is_owner_scoped(client):
    login_as(client, "first@example.com")
    create_wedding(client)
    publish_invitation(client)
    guest = create_guest(client, "Ayu")
    token = create_token(client)
    client.post(
        "/api/reception/check-in",
        json={"code": guest["invitation_code"]},
        headers=token_headers(token),
    )
    client.post("/api/auth/logout")

    login_as(client, "second@example.com")
    create_wedding(client)

    response = client.delete(f"/api/guests/{guest['id']}/check-in")
    assert response.status_code == 404
