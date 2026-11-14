EMAIL = "couple@example.com"
PASSWORD = "password123"


def register(client, email=EMAIL, password=PASSWORD):
    return client.post(
        "/api/auth/register", json={"email": email, "password": password}
    )


def test_register_sets_cookie_and_returns_user(client):
    response = register(client)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == EMAIL
    assert "password" not in body
    assert "password_hash" not in body
    assert client.cookies.get("openinvite_session")

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == EMAIL


def test_duplicate_email_is_rejected(client):
    assert register(client).status_code == 201
    assert register(client).status_code == 409


def test_short_password_is_rejected(client):
    assert register(client, password="short").status_code == 422


def test_login_and_logout(client):
    register(client)
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401

    login = client.post(
        "/api/auth/login", json={"email": EMAIL, "password": PASSWORD}
    )
    assert login.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_invalid_login_is_rejected(client):
    register(client)

    response = client.post(
        "/api/auth/login", json={"email": EMAIL, "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_me_requires_authentication(client):
    assert client.get("/api/auth/me").status_code == 401
