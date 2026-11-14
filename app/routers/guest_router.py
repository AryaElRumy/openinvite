import csv
import io
import secrets
from datetime import datetime, timezone

import openpyxl
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.security import get_current_user
from app.models.database import Guest, GuestCategory, User, Wedding
from app.models.engine import get_session
from app.schema.guest_schema import (
    GuestCategoryCreate,
    GuestCategoryResponse,
    GuestCategoryUpdate,
    GuestCreate,
    GuestImportResult,
    GuestImportRow,
    GuestResponse,
    GuestShareUpdate,
    GuestUpdate,
)

guest_router = APIRouter(prefix="/api/guests", tags=["Guests"])
guest_category_router = APIRouter(
    prefix="/api/guest-categories", tags=["Guest categories"]
)


def _get_owner_wedding(session: Session, owner_id: str) -> Wedding | None:
    return session.exec(select(Wedding).where(Wedding.owner_id == owner_id)).first()


def _get_category(
    session: Session, wedding_id: str, category_id: str
) -> GuestCategory | None:
    return session.exec(
        select(GuestCategory).where(
            GuestCategory.id == category_id,
            GuestCategory.wedding_id == wedding_id,
        )
    ).first()


def _get_guest(session: Session, wedding_id: str, guest_id: str) -> Guest | None:
    return session.exec(
        select(Guest).where(Guest.id == guest_id, Guest.wedding_id == wedding_id)
    ).first()


def _category_name_taken(
    session: Session, wedding_id: str, name: str, exclude_id: str | None = None
) -> bool:
    statement = select(GuestCategory).where(
        GuestCategory.wedding_id == wedding_id,
        func.lower(GuestCategory.name) == name.lower(),
    )
    if exclude_id is not None:
        statement = statement.where(GuestCategory.id != exclude_id)
    return session.exec(statement).first() is not None


def _generate_invitation_code(session: Session, used: set[str] | None = None) -> str:
    while True:
        code = secrets.token_urlsafe(18)
        if used is not None and code in used:
            continue
        existing = session.exec(
            select(Guest).where(Guest.invitation_code == code)
        ).first()
        if existing is None:
            return code


def _normalize_header(value: object) -> str:
    return str(value if value is not None else "").strip().lower().replace(" ", "_")


def _read_import_rows(
    filename: str, contents: bytes
) -> list[tuple[int, dict[str, str]]]:
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if suffix == "csv":
        try:
            text = contents.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV must be UTF-8 encoded",
            ) from exc

        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must start with a header row",
            )

        rows = []
        for number, row in enumerate(reader, start=2):
            values = {
                _normalize_header(key): str(value or "").strip()
                for key, value in row.items()
                if key is not None
            }
            if not any(values.values()):
                continue
            rows.append((number, values))
        return rows

    if suffix == "xlsx":
        try:
            workbook = openpyxl.load_workbook(
                io.BytesIO(contents), read_only=True, data_only=True
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to read XLSX file",
            ) from exc

        sheet = workbook.active
        rows = []
        try:
            iterator = sheet.iter_rows(values_only=True)
            try:
                headers = next(iterator)
            except StopIteration as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File must start with a header row",
                ) from exc

            keys = [_normalize_header(header) for header in headers]
            for number, values in enumerate(iterator, start=2):
                row = {
                    key: "" if value is None else str(value).strip()
                    for key, value in zip(keys, values)
                }
                if not any(row.values()):
                    continue
                rows.append((number, row))
        finally:
            workbook.close()
        return rows

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Only CSV and XLSX files are supported",
    )


def _parse_import_row(number: int, row: dict[str, str]) -> GuestImportRow:
    name = row.get("name", "")
    category = row.get("category", "")
    raw_max_attendees = row.get("max_attendees", "")

    errors = []
    if name == "":
        errors.append("Name is required")
    elif len(name) > 120:
        errors.append("Name must be 120 characters or fewer")

    if len(category) > 80:
        errors.append("Category must be 80 characters or fewer")

    max_attendees: int | None
    if raw_max_attendees == "":
        max_attendees = 1
    else:
        try:
            parsed = float(raw_max_attendees)
        except ValueError:
            max_attendees = None
            errors.append("Max attendees must be a whole number")
        else:
            if not parsed.is_integer():
                max_attendees = None
                errors.append("Max attendees must be a whole number")
            else:
                max_attendees = int(parsed)
                if max_attendees < 1:
                    errors.append("Max attendees must be at least 1")

    return GuestImportRow(
        row=number,
        name=name,
        category=category,
        max_attendees=max_attendees,
        valid=not errors,
        errors=errors,
    )


def _require_wedding(session: Session, owner_id: str) -> Wedding:
    wedding = _get_owner_wedding(session, owner_id)
    if wedding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set up your wedding first",
        )
    return wedding


@guest_router.get("", response_model=list[GuestResponse])
def list_guests(
    search: str | None = Query(default=None, max_length=120),
    category_id: str | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    statement = select(Guest).where(Guest.wedding_id == wedding.id)
    if search is not None and search.strip() != "":
        statement = statement.where(Guest.name.ilike(f"%{search.strip()}%"))
    if category_id is not None:
        statement = statement.where(Guest.category_id == category_id)
    statement = statement.order_by(Guest.name)

    return session.exec(statement).all()


@guest_router.post(
    "", response_model=GuestResponse, status_code=status.HTTP_201_CREATED
)
def create_guest(
    payload: GuestCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    if payload.category_id is not None:
        category = _get_category(session, wedding.id, payload.category_id)
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found",
            )

    guest = Guest(
        wedding_id=wedding.id,
        invitation_code=_generate_invitation_code(session),
        **payload.model_dump(),
    )
    session.add(guest)
    session.commit()
    session.refresh(guest)
    return guest


@guest_router.post("/import", response_model=GuestImportResult)
async def import_guests(
    dry_run: bool = True,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large; maximum size is 5 MB",
        )

    raw_rows = _read_import_rows(file.filename or "", contents)
    parsed_rows = [_parse_import_row(number, row) for number, row in raw_rows]
    valid_rows = [row for row in parsed_rows if row.valid]

    imported = 0
    if not dry_run and valid_rows:
        existing_categories = session.exec(
            select(GuestCategory).where(GuestCategory.wedding_id == wedding.id)
        ).all()
        categories_by_name = {
            category.name.lower(): category for category in existing_categories
        }
        used_codes: set[str] = set()

        for row in valid_rows:
            category_id = None
            if row.category:
                key = row.category.lower()
                category = categories_by_name.get(key)
                if category is None:
                    category = GuestCategory(wedding_id=wedding.id, name=row.category)
                    session.add(category)
                    categories_by_name[key] = category
                category_id = category.id

            guest = Guest(
                wedding_id=wedding.id,
                category_id=category_id,
                name=row.name,
                max_attendees=row.max_attendees or 1,
                invitation_code=_generate_invitation_code(session, used_codes),
            )
            used_codes.add(guest.invitation_code)
            session.add(guest)
            imported += 1

        session.commit()

    return GuestImportResult(
        dry_run=dry_run,
        rows=parsed_rows,
        valid_count=len(valid_rows),
        invalid_count=len(parsed_rows) - len(valid_rows),
        imported=imported,
    )


@guest_router.put("/{guest_id}", response_model=GuestResponse)
def update_guest(
    guest_id: str,
    payload: GuestUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    guest = _get_guest(session, wedding.id, guest_id)
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found"
        )

    if payload.category_id is not None:
        category = _get_category(session, wedding.id, payload.category_id)
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found",
            )

    for key, value in payload.model_dump().items():
        setattr(guest, key, value)
    session.add(guest)
    session.commit()
    session.refresh(guest)
    return guest


@guest_router.put("/{guest_id}/share", response_model=GuestResponse)
def share_guest(
    guest_id: str,
    payload: GuestShareUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    guest = _get_guest(session, wedding.id, guest_id)
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found"
        )

    if payload.shared:
        if guest.shared_at is None:
            guest.shared_at = datetime.now(timezone.utc)
    else:
        guest.shared_at = None

    session.add(guest)
    session.commit()
    session.refresh(guest)
    return guest


@guest_router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest(
    guest_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    guest = _get_guest(session, wedding.id, guest_id)
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found"
        )

    session.delete(guest)
    session.commit()


@guest_category_router.get("", response_model=list[GuestCategoryResponse])
def list_categories(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)
    statement = (
        select(GuestCategory)
        .where(GuestCategory.wedding_id == wedding.id)
        .order_by(GuestCategory.name)
    )
    return session.exec(statement).all()


@guest_category_router.post(
    "", response_model=GuestCategoryResponse, status_code=status.HTTP_201_CREATED
)
def create_category(
    payload: GuestCategoryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    if _category_name_taken(session, wedding.id, payload.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )

    category = GuestCategory(wedding_id=wedding.id, name=payload.name)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@guest_category_router.put("/{category_id}", response_model=GuestCategoryResponse)
def update_category(
    category_id: str,
    payload: GuestCategoryUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    category = _get_category(session, wedding.id, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    if _category_name_taken(session, wedding.id, payload.name, exclude_id=category.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )

    category.name = payload.name
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@guest_category_router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    category = _get_category(session, wedding.id, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    guests = session.exec(select(Guest).where(Guest.category_id == category.id)).all()
    for guest in guests:
        guest.category_id = None
        session.add(guest)

    session.delete(category)
    session.commit()
