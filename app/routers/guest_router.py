import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    GuestResponse,
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


def _generate_invitation_code(session: Session) -> str:
    while True:
        code = secrets.token_urlsafe(18)
        existing = session.exec(
            select(Guest).where(Guest.invitation_code == code)
        ).first()
        if existing is None:
            return code


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
