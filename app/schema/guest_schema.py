from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schema.rsvp_schema import RsvpResponse


class GuestCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if value == "":
            raise ValueError("name must not be empty")
        return value


class GuestCategoryUpdate(GuestCategoryCreate):
    pass


class GuestCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


class GuestCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category_id: str | None = None
    max_attendees: int = Field(default=1, ge=1)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if value == "":
            raise ValueError("name must not be empty")
        return value


class GuestUpdate(GuestCreate):
    pass


class GuestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category_id: str | None
    invitation_code: str
    max_attendees: int
    shared_at: datetime | None
    rsvp: RsvpResponse | None = None
    checked_in_at: datetime | None = None


class GuestShareUpdate(BaseModel):
    shared: bool


class GuestImportRow(BaseModel):
    row: int
    name: str
    category: str
    max_attendees: int | None
    valid: bool
    errors: list[str]


class GuestImportResult(BaseModel):
    dry_run: bool
    rows: list[GuestImportRow]
    valid_count: int
    invalid_count: int
    imported: int
