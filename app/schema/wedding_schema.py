import re
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
URL_PATTERN = re.compile(r"^https?://\S+$")


class WeddingEvent(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    start: str | None = Field(default=None, max_length=40)
    end: str | None = Field(default=None, max_length=40)
    venue: str | None = Field(default=None, max_length=200)
    address: str | None = Field(default=None, max_length=300)


class WeddingUpdate(BaseModel):
    partner_one_name: str = Field(min_length=1, max_length=120)
    partner_two_name: str = Field(min_length=1, max_length=120)
    wedding_date: date
    venue_name: str = Field(min_length=1, max_length=200)
    venue_address: str | None = Field(default=None, max_length=300)
    maps_url: str | None = Field(default=None, max_length=500)
    events: list[WeddingEvent] = Field(default_factory=list, max_length=20)
    slug: str | None = Field(default=None, min_length=3, max_length=80)

    @field_validator("maps_url")
    @classmethod
    def validate_maps_url(cls, value: str | None) -> str | None:
        if value and not URL_PATTERN.match(value):
            raise ValueError("maps_url must start with http:// or https://")
        return value

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if not SLUG_PATTERN.match(normalized):
            raise ValueError("slug must use lowercase letters, numbers, and hyphens")
        return normalized


class WeddingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    slug_locked: bool
    partner_one_name: str
    partner_two_name: str
    wedding_date: date
    venue_name: str
    venue_address: str | None
    maps_url: str | None
    events: list[WeddingEvent]
