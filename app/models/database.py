from datetime import date

from sqlalchemy import JSON, Column
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
