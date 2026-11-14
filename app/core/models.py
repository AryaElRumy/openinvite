from datetime import datetime, timezone

from sqlmodel import Field, SQLModel

from app.utils.generate_id import generate_id


class BaseModel(SQLModel):
    id: str = Field(default_factory=generate_id, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    is_deleted: bool = Field(default=False)
