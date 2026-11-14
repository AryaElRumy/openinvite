import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.security import get_current_user
from app.models.database import Guest, Invitation, ReceptionistToken, User, Wedding
from app.models.engine import get_session
from app.schema.reception_schema import (
    ReceptionistGuestResponse,
    ReceptionistTokenResponse,
    ReceptionistTokenStatus,
    ReceptionValidationRequest,
)
from app.schema.wedding_schema import WeddingResponse

receptionist_router = APIRouter(prefix="/api/receptionist", tags=["Receptionist"])
reception_router = APIRouter(prefix="/api/reception", tags=["Reception"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _get_owner_wedding(session: Session, owner_id: str) -> Wedding | None:
    return session.exec(select(Wedding).where(Wedding.owner_id == owner_id)).first()


def _require_wedding(session: Session, owner_id: str) -> Wedding:
    wedding = _get_owner_wedding(session, owner_id)
    if wedding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set up your wedding first",
        )
    return wedding


def _get_token(session: Session, wedding_id: str) -> ReceptionistToken | None:
    return session.exec(
        select(ReceptionistToken).where(ReceptionistToken.wedding_id == wedding_id)
    ).first()


def require_receptionist(
    x_receptionist_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Wedding:
    if x_receptionist_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked receptionist access",
        )

    token = _get_token_by_hash(session, _hash_token(x_receptionist_token))
    if token is None or token.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked receptionist access",
        )

    wedding = session.get(Wedding, token.wedding_id)
    if wedding is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked receptionist access",
        )

    token.last_used_at = datetime.now(timezone.utc)
    session.add(token)
    session.commit()
    return wedding


def _get_token_by_hash(session: Session, token_hash: str) -> ReceptionistToken | None:
    return session.exec(
        select(ReceptionistToken).where(ReceptionistToken.token_hash == token_hash)
    ).first()


@receptionist_router.get("", response_model=ReceptionistTokenStatus)
def get_receptionist_token(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    token = _get_token(session, wedding.id)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receptionist access is not configured",
        )

    return ReceptionistTokenStatus(
        active=token.revoked_at is None,
        created_at=token.created_at,
        last_used_at=token.last_used_at,
    )


@receptionist_router.post("", response_model=ReceptionistTokenResponse)
def create_receptionist_token(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    plain_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    token = _get_token(session, wedding.id)

    if token is None:
        token = ReceptionistToken(
            wedding_id=wedding.id,
            token_hash=_hash_token(plain_token),
            created_at=now,
        )
    else:
        token.token_hash = _hash_token(plain_token)
        token.revoked_at = None
        token.last_used_at = None
        token.created_at = now
        token.updated_at = now

    session.add(token)
    session.commit()
    session.refresh(token)

    return ReceptionistTokenResponse(
        token=plain_token,
        active=True,
        created_at=token.created_at,
        last_used_at=None,
    )


@receptionist_router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def revoke_receptionist_token(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _require_wedding(session, current_user.id)

    token = _get_token(session, wedding.id)
    if token is not None and token.revoked_at is None:
        token.revoked_at = datetime.now(timezone.utc)
        session.add(token)
        session.commit()


@reception_router.get("/session", response_model=WeddingResponse)
def reception_session(
    wedding: Wedding = Depends(require_receptionist),
):
    return wedding


@reception_router.get("/guests", response_model=list[ReceptionistGuestResponse])
def reception_guests(
    search: str | None = Query(default=None, max_length=120),
    wedding: Wedding = Depends(require_receptionist),
    session: Session = Depends(get_session),
):
    statement = select(Guest).where(Guest.wedding_id == wedding.id)
    if search is not None and search.strip() != "":
        statement = statement.where(Guest.name.ilike(f"%{search.strip()}%"))
    statement = statement.order_by(Guest.name)
    return session.exec(statement).all()


@reception_router.post("/validate", response_model=ReceptionistGuestResponse)
def validate_qr(
    payload: ReceptionValidationRequest,
    wedding: Wedding = Depends(require_receptionist),
    session: Session = Depends(get_session),
):
    invitation = session.exec(
        select(Invitation).where(Invitation.wedding_id == wedding.id)
    ).first()
    if invitation is None or invitation.published_snapshot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    guest = session.exec(
        select(Guest).where(
            Guest.invitation_code == payload.code,
            Guest.wedding_id == wedding.id,
        )
    ).first()
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    return guest
