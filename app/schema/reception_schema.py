from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReceptionValidationRequest(BaseModel):
    code: str = Field(min_length=1, max_length=120)


class ReceptionistTokenStatus(BaseModel):
    active: bool
    created_at: datetime
    last_used_at: datetime | None


class ReceptionistTokenResponse(BaseModel):
    token: str
    active: bool
    created_at: datetime
    last_used_at: datetime | None


class ReceptionistGuestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    max_attendees: int
    invitation_code: str
