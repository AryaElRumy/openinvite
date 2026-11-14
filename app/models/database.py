from datetime import date, datetime

from sqlalchemy import JSON, CheckConstraint, Column, UniqueConstraint
from sqlmodel import Field

from app.core.models import BaseModel


class User(BaseModel, table=True):
    __tablename__ = "users"

    email: str = Field(index=True, unique=True)
    password_hash: str


class Wedding(BaseModel, table=True):
    __tablename__ = "weddings"

    owner_id: str = Field(foreign_key="users.id", unique=True, index=True)
    slug: str = Field(unique=True, index=True)
    partner_one_name: str
    partner_two_name: str
    wedding_date: date
    venue_name: str
    venue_address: str | None = None
    maps_url: str | None = None
    events: list[dict] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
    )
    slug_locked: bool = Field(default=False)


class Invitation(BaseModel, table=True):
    __tablename__ = "invitations"

    wedding_id: str = Field(foreign_key="weddings.id", unique=True, index=True)
    template_id: str = Field(default="classic")
    headline: str = Field(default="")
    message: str = Field(default="")
    quote: str | None = None
    cover_image_url: str | None = None
    gallery_image_urls: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
    )
    closing_message: str | None = None
    version: int = Field(default=0)
    published_at: datetime | None = None
    published_snapshot: dict | None = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )


class GuestCategory(BaseModel, table=True):
    __tablename__ = "guest_categories"
    __table_args__ = (
        UniqueConstraint("wedding_id", "name", name="uq_guest_categories_wedding_name"),
    )

    wedding_id: str = Field(foreign_key="weddings.id", index=True)
    name: str


class Guest(BaseModel, table=True):
    __tablename__ = "guests"
    __table_args__ = (
        CheckConstraint("max_attendees >= 1", name="ck_guests_max_attendees_positive"),
    )

    wedding_id: str = Field(foreign_key="weddings.id", index=True)
    category_id: str | None = Field(
        default=None, foreign_key="guest_categories.id", index=True
    )
    name: str
    invitation_code: str = Field(index=True, unique=True)
    max_attendees: int = Field(default=1)
    shared_at: datetime | None = None
