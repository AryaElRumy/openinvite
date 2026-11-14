from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.security import get_current_user
from app.models.database import Invitation, User, Wedding
from app.models.engine import get_session
from app.schema.invitation_schema import (
    InvitationPreview,
    InvitationResponse,
    InvitationUpdate,
)

invitation_router = APIRouter(prefix="/api/invitation", tags=["Invitation"])


def _get_owner_wedding(session: Session, owner_id: str) -> Wedding | None:
    return session.exec(select(Wedding).where(Wedding.owner_id == owner_id)).first()


def _get_invitation(session: Session, wedding_id: str) -> Invitation | None:
    return session.exec(
        select(Invitation).where(Invitation.wedding_id == wedding_id)
    ).first()


@invitation_router.get("", response_model=InvitationResponse)
def get_invitation(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _get_owner_wedding(session, current_user.id)
    if wedding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set up your wedding first",
        )

    invitation = _get_invitation(session, wedding.id)
    if invitation is None:
        return InvitationResponse(
            headline=f"{wedding.partner_one_name} & {wedding.partner_two_name}"
        )
    return invitation


@invitation_router.get("/preview", response_model=InvitationPreview)
def preview_invitation(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _get_owner_wedding(session, current_user.id)
    if wedding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set up your wedding first",
        )

    invitation = _get_invitation(session, wedding.id)
    if invitation is None:
        invitation = InvitationResponse(
            headline=f"{wedding.partner_one_name} & {wedding.partner_two_name}"
        )
    return InvitationPreview(wedding=wedding, invitation=invitation)


@invitation_router.put("", response_model=InvitationResponse)
def update_invitation(
    payload: InvitationUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wedding = _get_owner_wedding(session, current_user.id)
    if wedding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set up your wedding first",
        )

    invitation = _get_invitation(session, wedding.id)
    if invitation is None:
        invitation = Invitation(wedding_id=wedding.id, **payload.model_dump())
    else:
        for key, value in payload.model_dump().items():
            setattr(invitation, key, value)
        invitation.updated_at = datetime.now(timezone.utc)

    session.add(invitation)
    session.commit()
    session.refresh(invitation)
    return invitation
