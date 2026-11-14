from sqlmodel import Field

from app.core.models import BaseModel


class User(BaseModel, table=True):
    __tablename__ = "users"

    email: str = Field(index=True, unique=True)
    password_hash: str
