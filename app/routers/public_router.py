from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.models.database import Guest, Invitation, Rsvp, Wedding
from app.models.engine import get_session
from app.schema.invitation_schema import (
    PublicGuestInvitationResponse,
    PublicGuestResponse,
    PublicInvitationResponse,
)
from app.schema.rsvp_schema import RsvpResponse, RsvpUpdate

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


def _get_guest_context(
    session: Session, slug: str, code: str
) -> tuple[Wedding, Invitation, Guest]:
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

    return wedding, invitation, guest


@public_router.get(
    "/invitations/{slug}/guests/{code}",
    response_model=PublicGuestInvitationResponse,
)
def get_public_guest_invitation(
    slug: str,
    code: str,
    session: Session = Depends(get_session),
):
    _, invitation, guest = _get_guest_context(session, slug, code)

    rsvp = session.exec(select(Rsvp).where(Rsvp.guest_id == guest.id)).first()
    return PublicGuestInvitationResponse(
        **invitation.published_snapshot,
        guest=PublicGuestResponse(
            name=guest.name,
            max_attendees=guest.max_attendees,
            rsvp=RsvpResponse.model_validate(rsvp) if rsvp is not None else None,
        ),
    )


@public_router.post(
    "/invitations/{slug}/guests/{code}/rsvp",
    response_model=RsvpResponse,
)
def submit_rsvp(
    slug: str,
    code: str,
    payload: RsvpUpdate,
    session: Session = Depends(get_session),
):
    _, _, guest = _get_guest_context(session, slug, code)

    if payload.status == "attending" and payload.attendee_count > guest.max_attendees:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendee count exceeds invitation quota",
        )

    now = datetime.now(timezone.utc)
    rsvp = session.exec(select(Rsvp).where(Rsvp.guest_id == guest.id)).first()
    if rsvp is None:
        rsvp = Rsvp(
            guest_id=guest.id,
            status=payload.status,
            attendee_count=payload.attendee_count,
            responded_at=now,
        )
    else:
        rsvp.status = payload.status
        rsvp.attendee_count = payload.attendee_count
        rsvp.responded_at = now
        rsvp.updated_at = now

    session.add(rsvp)
    session.commit()
    session.refresh(rsvp)
    return rsvp
