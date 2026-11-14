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
from app.schema.wedding_schema import WeddingResponse

invitation_router = APIRouter(prefix="/api/invitation", tags=["Invitation"])


def _get_owner_wedding(session: Session, owner_id: str) -> Wedding | None:
    return session.exec(select(Wedding).where(Wedding.owner_id == owner_id)).first()


def _get_invitation(session: Session, wedding_id: str) -> Invitation | None:
    return session.exec(
        select(Invitation).where(Invitation.wedding_id == wedding_id)
    ).first()


def _to_response(invitation: Invitation, wedding: Wedding) -> InvitationResponse:
    return InvitationResponse.model_validate(invitation).model_copy(
        update={"slug": wedding.slug}
    )


def _missing_content(wedding: Wedding, invitation: Invitation) -> list[str]:
    missing = []
    if not invitation.headline.strip():
        missing.append("headline")
    if not invitation.message.strip():
        missing.append("message")
    if not wedding.partner_one_name.strip() or not wedding.partner_two_name.strip():
        missing.append("partner names")
    if wedding.wedding_date is None:
        missing.append("wedding date")
    if not wedding.venue_name.strip():
        missing.append("venue")
    return missing


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
            headline=f"{wedding.partner_one_name} & {wedding.partner_two_name}",
            slug=wedding.slug,
        )
    return _to_response(invitation, wedding)


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
        invitation_response = InvitationResponse(
            headline=f"{wedding.partner_one_name} & {wedding.partner_two_name}",
            slug=wedding.slug,
        )
    else:
        invitation_response = _to_response(invitation, wedding)
    return InvitationPreview(wedding=wedding, invitation=invitation_response)


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
    return _to_response(invitation, wedding)


@invitation_router.post("/publish", response_model=InvitationResponse)
def publish_invitation(
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Save an invitation draft before publishing",
        )

    missing = _missing_content(wedding, invitation)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required content: {', '.join(missing)}",
        )

    now = datetime.now(timezone.utc)
    version = invitation.version + 1
    wedding.slug_locked = True
    published = _to_response(invitation, wedding).model_copy(
        update={"version": version, "published_at": now}
    )
    invitation.version = version
    invitation.published_at = now
    invitation.published_snapshot = {
        "version": version,
        "published_at": now.isoformat(),
        "wedding": WeddingResponse.model_validate(wedding).model_dump(mode="json"),
        "invitation": published.model_dump(mode="json"),
    }

    session.add(invitation)
    session.add(wedding)
    session.commit()
    session.refresh(invitation)
    return _to_response(invitation, wedding)


@invitation_router.post("/unpublish", response_model=InvitationResponse)
def unpublish_invitation(
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
    if invitation is None or invitation.published_snapshot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation is not published",
        )

    invitation.published_snapshot = None
    invitation.published_at = None
    session.add(invitation)
    session.commit()
    session.refresh(invitation)
    return _to_response(invitation, wedding)
