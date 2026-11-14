from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class RsvpUpdate(BaseModel):
    status: Literal["attending", "declined"]
    attendee_count: int = Field(default=1, ge=0)

    @model_validator(mode="after")
    def validate_attendee_count(self) -> "RsvpUpdate":
        if self.status == "declined":
            self.attendee_count = 0
        elif self.attendee_count < 1:
            raise ValueError("Attendee count must be at least 1")
        return self


class RsvpResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: Literal["attending", "declined"]
    attendee_count: int
    responded_at: datetime
