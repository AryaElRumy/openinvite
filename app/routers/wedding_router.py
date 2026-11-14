import re
import secrets
import unicodedata
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.security import get_current_user
from app.models.database import User, Wedding
from app.models.engine import get_session
from app.schema.wedding_schema import WeddingResponse, WeddingUpdate

wedding_router = APIRouter(prefix="/api/wedding", tags=["Wedding"])


def _slug_base(partner_one: str, partner_two: str) -> str:
    value = f"{partner_one}-{partner_two}"
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:60] or "wedding"


def _unique_slug(session: Session, base: str) -> str:
    candidate = base
    while session.exec(select(Wedding).where(Wedding.slug == candidate)).first():
        candidate = f"{base}-{secrets.token_hex(2)}"
    return candidate


def _get_owner_wedding(session: Session, owner_id: str) -> Wedding | None:
    return session.exec(select(Wedding).where(Wedding.owner_id == owner_id)).first()


def _slug_taken(session: Session, slug: str, wedding: Wedding | None) -> bool:
    existing = session.exec(select(Wedding).where(Wedding.slug == slug)).first()
    return existing is not None and existing.id != (wedding.id if wedding else None)


@wedding_router.get("", response_model=WeddingResponse)
def get_wedding(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _get_owner_wedding(session, current_user.id)
    if wedding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedding is not set up yet",
        )
    return wedding


@wedding_router.put("", response_model=WeddingResponse)
def upsert_wedding(
    payload: WeddingUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _get_owner_wedding(session, current_user.id)
    data = payload.model_dump(exclude={"slug", "events"})
    events = [event.model_dump() for event in payload.events]

    if wedding is None:
        if payload.slug is not None:
            if _slug_taken(session, payload.slug, None):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Slug is already in use",
                )
            slug = payload.slug
        else:
            slug = _unique_slug(
                session,
                _slug_base(payload.partner_one_name, payload.partner_two_name),
            )
        wedding = Wedding(
            owner_id=current_user.id,
            slug=slug,
            events=events,
            **data,
        )
    else:
        if payload.slug is not None and payload.slug != wedding.slug:
            if wedding.slug_locked:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Slug cannot change after publishing",
                )
            if _slug_taken(session, payload.slug, wedding):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Slug is already in use",
                )
            wedding.slug = payload.slug

        for key, value in data.items():
            setattr(wedding, key, value)
        wedding.events = events
        wedding.updated_at = datetime.now(timezone.utc)

    session.add(wedding)
    session.commit()
    session.refresh(wedding)
    return wedding
