from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.models.database import Guest, Invitation, Wedding
from app.models.engine import get_session
from app.schema.invitation_schema import (
    PublicGuestInvitationResponse,
    PublicGuestResponse,
    PublicInvitationResponse,
)

public_router = APIRouter(prefix="/api/public", tags=["Public"])


@public_router.get("/invitations/{slug}", response_model=PublicInvitationResponse)
def get_public_invitation(
    slug: str,
    session: Session = Depends(get_session),
):
    wedding = session.exec(select(Wedding).where(Wedding.slug == slug)).first()
    if wedding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    invitation = session.exec(
        select(Invitation).where(Invitation.wedding_id == wedding.id)
    ).first()
    if invitation is None or invitation.published_snapshot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )
    return invitation.published_snapshot


@public_router.get(
    "/invitations/{slug}/guests/{code}",
    response_model=PublicGuestInvitationResponse,
)
def get_public_guest_invitation(
    slug: str,
    code: str,
    session: Session = Depends(get_session),
):
    wedding = session.exec(select(Wedding).where(Wedding.slug == slug)).first()
    if wedding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

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
            Guest.invitation_code == code,
            Guest.wedding_id == wedding.id,
        )
    ).first()
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    return PublicGuestInvitationResponse(
        **invitation.published_snapshot,
        guest=PublicGuestResponse(
            name=guest.name,
            max_attendees=guest.max_attendees,
        ),
    )
