from io import BytesIO

from openpyxl import Workbook

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


def create_category(client, name):
    response = client.post("/api/guest-categories", json={"name": name})
    assert response.status_code == 201
    return response.json()


def create_guest(client, name, category_id=None, max_attendees=None):
    payload = {"name": name, "category_id": category_id}
    if max_attendees is not None:
        payload["max_attendees"] = max_attendees
    response = client.post("/api/guests", json=payload)
    assert response.status_code == 201
    return response.json()


def test_guests_require_authentication(client):
    assert client.get("/api/guests").status_code == 401
    assert client.post("/api/guests", json={"name": "Ayu"}).status_code == 401
    assert client.get("/api/guest-categories").status_code == 401


def test_guests_require_a_wedding(client):
    login_as(client, "couple@example.com")

    assert client.get("/api/guests").status_code == 404
    assert client.get("/api/guest-categories").status_code == 404


def test_create_list_and_delete_guest(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    guest = create_guest(client, "Ayu")
    guests = client.get("/api/guests")
    assert guests.status_code == 200
    assert [item["name"] for item in guests.json()] == ["Ayu"]

    deleted = client.delete(f"/api/guests/{guest['id']}")
    assert deleted.status_code == 204
    assert client.get("/api/guests").json() == []


def test_update_guest_name_and_category(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    category = create_category(client, "Family")
    guest = create_guest(client, "Ayu")

    updated = client.put(
        f"/api/guests/{guest['id']}",
        json={"name": "Ayu Lestari", "category_id": category["id"]},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Ayu Lestari"
    assert updated.json()["category_id"] == category["id"]


def test_guest_gets_opaque_code_and_default_quota(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    guest = create_guest(client, "Ayu")

    assert guest["max_attendees"] == 1
    assert len(guest["invitation_code"]) >= 20
    assert "Ayu" not in guest["invitation_code"]
    assert (
        client.get("/api/guests").json()[0]["invitation_code"]
        == guest["invitation_code"]
    )


def test_invitation_codes_are_unique(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    first = create_guest(client, "Ayu")
    second = create_guest(client, "Bima")

    assert first["invitation_code"] != second["invitation_code"]


def test_update_preserves_invitation_code_and_updates_quota(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    guest = create_guest(client, "Ayu")

    updated = client.put(
        f"/api/guests/{guest['id']}",
        json={"name": "Ayu Lestari", "category_id": None, "max_attendees": 4},
    )
    assert updated.status_code == 200
    assert updated.json()["invitation_code"] == guest["invitation_code"]
    assert updated.json()["max_attendees"] == 4


def test_quota_must_be_at_least_one(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    guest = create_guest(client, "Ayu")

    assert (
        client.post(
            "/api/guests", json={"name": "Bima", "max_attendees": 0}
        ).status_code
        == 422
    )
    assert (
        client.put(
            f"/api/guests/{guest['id']}",
            json={"name": "Ayu", "max_attendees": 0},
        ).status_code
        == 422
    )


def test_capacity_total_matches_guest_quotas(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    create_guest(client, "Ayu", max_attendees=1)
    create_guest(client, "Bima", max_attendees=3)
    create_guest(client, "Citra", max_attendees=2)

    guests = client.get("/api/guests").json()
    assert sum(guest["max_attendees"] for guest in guests) == 6


def test_guest_name_cannot_be_blank(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    response = client.post("/api/guests", json={"name": "   "})
    assert response.status_code == 422


def test_categories_are_created_updated_and_deleted(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    category = create_category(client, "Family")
    duplicate = client.post("/api/guest-categories", json={"name": "family"})
    assert duplicate.status_code == 409

    renamed = client.put(
        f"/api/guest-categories/{category['id']}", json={"name": "Keluarga"}
    )
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Keluarga"

    deleted = client.delete(f"/api/guest-categories/{category['id']}")
    assert deleted.status_code == 204
    assert client.get("/api/guest-categories").json() == []


def test_deleting_a_category_leaves_guests_uncategorized(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    category = create_category(client, "Family")
    guest = create_guest(client, "Ayu", category_id=category["id"])

    assert client.delete(f"/api/guest-categories/{category['id']}").status_code == 204

    guests = client.get("/api/guests").json()
    assert guests[0]["id"] == guest["id"]
    assert guests[0]["category_id"] is None


def test_guests_can_be_searched_and_filtered(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    family = create_category(client, "Family")
    friends = create_category(client, "Friends")

    create_guest(client, "Ayu", category_id=family["id"])
    create_guest(client, "Bima", category_id=friends["id"])
    create_guest(client, "Citra")

    search = client.get("/api/guests", params={"search": "ay"}).json()
    assert [guest["name"] for guest in search] == ["Ayu"]

    filtered = client.get("/api/guests", params={"category_id": family["id"]}).json()
    assert [guest["name"] for guest in filtered] == ["Ayu"]


def test_guest_category_must_belong_to_the_owner(client):
    login_as(client, "first@example.com")
    create_wedding(client)
    category = create_category(client, "Family")
    client.post("/api/auth/logout")

    login_as(client, "second@example.com")
    create_wedding(client)

    response = client.post(
        "/api/guests", json={"name": "Ayu", "category_id": category["id"]}
    )
    assert response.status_code == 400


def upload_import(
    client,
    filename,
    content,
    dry_run=True,
    content_type="text/csv",
):
    return client.post(
        "/api/guests/import",
        params={"dry_run": dry_run},
        files={"file": (filename, content, content_type)},
    )


def test_csv_import_previews_and_imports_valid_rows(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    csv_content = "name,category,max_attendees\nAyu,Family,2\nBima,,1\n"
    preview = upload_import(client, "guests.csv", csv_content)
    assert preview.status_code == 200
    body = preview.json()
    assert body["dry_run"] is True
    assert body["valid_count"] == 2
    assert body["invalid_count"] == 0
    assert body["imported"] == 0
    assert body["rows"][0]["row"] == 2
    assert body["rows"][0]["max_attendees"] == 2
    assert client.get("/api/guests").json() == []

    imported = upload_import(client, "guests.csv", csv_content, dry_run=False)
    assert imported.status_code == 200
    assert imported.json()["imported"] == 2

    guests = client.get("/api/guests").json()
    assert [guest["name"] for guest in guests] == ["Ayu", "Bima"]
    assert sum(guest["max_attendees"] for guest in guests) == 3
    assert len({guest["invitation_code"] for guest in guests}) == 2

    categories = client.get("/api/guest-categories").json()
    assert [category["name"] for category in categories] == ["Family"]


def test_csv_import_reports_invalid_rows(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    csv_content = (
        "name,category,max_attendees\n,Family,1\nCitra,Family,0\nDewi,Friends,abc\n"
    )
    preview = upload_import(client, "guests.csv", csv_content)
    assert preview.status_code == 200
    body = preview.json()
    assert body["valid_count"] == 0
    assert body["invalid_count"] == 3
    assert [row["row"] for row in body["rows"]] == [2, 3, 4]
    assert all(row["errors"] for row in body["rows"])

    imported = upload_import(client, "guests.csv", csv_content, dry_run=False)
    assert imported.status_code == 200
    assert imported.json()["imported"] == 0
    assert client.get("/api/guests").json() == []


def test_xlsx_import(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["name", "category", "max_attendees"])
    sheet.append(["Ayu", "Family", 2])
    sheet.append(["Bima", None, 3])
    buffer = BytesIO()
    workbook.save(buffer)

    response = upload_import(
        client,
        "guests.xlsx",
        buffer.getvalue(),
        dry_run=False,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    assert response.status_code == 200
    assert response.json()["imported"] == 2

    guests = client.get("/api/guests").json()
    assert [guest["name"] for guest in guests] == ["Ayu", "Bima"]
    assert sum(guest["max_attendees"] for guest in guests) == 5


def test_import_matches_existing_categories_case_insensitively(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    create_category(client, "Family")

    csv_content = "name,category,max_attendees\nAyu,FAMILY,2\n"
    response = upload_import(client, "guests.csv", csv_content, dry_run=False)
    assert response.status_code == 200
    assert response.json()["imported"] == 1

    categories = client.get("/api/guest-categories").json()
    assert [category["name"] for category in categories] == ["Family"]


def test_import_skips_blank_rows_and_keeps_row_numbers(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    csv_content = "name,category,max_attendees\nAyu,,1\n,,\nBima,,2\n"
    preview = upload_import(client, "guests.csv", csv_content)
    assert preview.status_code == 200
    body = preview.json()
    assert body["valid_count"] == 2
    assert [row["row"] for row in body["rows"]] == [2, 4]


def test_import_rejects_unsupported_files(client):
    login_as(client, "couple@example.com")
    create_wedding(client)

    response = upload_import(
        client, "guests.txt", "name\nAyu\n", content_type="text/plain"
    )
    assert response.status_code == 400


def test_import_is_owner_scoped(client):
    login_as(client, "first@example.com")
    create_wedding(client)
    upload_import(
        client,
        "guests.csv",
        "name,category,max_attendees\nAyu,,1\n",
        dry_run=False,
    )
    client.post("/api/auth/logout")

    login_as(client, "second@example.com")
    create_wedding(client)

    assert client.get("/api/guests").json() == []


def test_mark_guest_shared_and_undo(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    guest = create_guest(client, "Ayu")

    marked = client.put(f"/api/guests/{guest['id']}/share", json={"shared": True})
    assert marked.status_code == 200
    assert marked.json()["shared_at"] is not None

    unshared = client.put(f"/api/guests/{guest['id']}/share", json={"shared": False})
    assert unshared.status_code == 200
    assert unshared.json()["shared_at"] is None


def test_marking_shared_preserves_first_timestamp(client):
    login_as(client, "couple@example.com")
    create_wedding(client)
    guest = create_guest(client, "Ayu")

    first = client.put(
        f"/api/guests/{guest['id']}/share", json={"shared": True}
    ).json()["shared_at"]
    second = client.put(
        f"/api/guests/{guest['id']}/share", json={"shared": True}
    ).json()["shared_at"]
    assert first == second


def test_share_is_owner_scoped(client):
    login_as(client, "first@example.com")
    create_wedding(client)
    guest = create_guest(client, "Ayu")
    client.post("/api/auth/logout")

    login_as(client, "second@example.com")
    create_wedding(client)

    response = client.put(f"/api/guests/{guest['id']}/share", json={"shared": True})
    assert response.status_code == 404


def test_guests_are_scoped_to_the_owner(client):
    login_as(client, "first@example.com")
    create_wedding(client)
    guest = create_guest(client, "Ayu")
    client.post("/api/auth/logout")

    login_as(client, "second@example.com")
    create_wedding(client)

    assert client.get("/api/guests").json() == []
    assert client.delete(f"/api/guests/{guest['id']}").status_code == 404
    assert (
        client.put(f"/api/guests/{guest['id']}", json={"name": "Other"}).status_code
        == 404
    )
