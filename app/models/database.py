from typing import Optional

from app.core.models import BaseModel
from sqlmodel import Field


class ExampleModel(BaseModel, table=True):
    name: str = Field(default="Example Model")
    description: Optional[str] = None
