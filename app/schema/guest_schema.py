from pydantic import BaseModel, ConfigDict, Field, field_validator


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
