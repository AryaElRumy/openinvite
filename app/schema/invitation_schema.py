from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schema.wedding_schema import URL_PATTERN, WeddingResponse


def _clean_url(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    if not URL_PATTERN.match(value):
        raise ValueError("URL must start with http:// or https://")
    return value


class InvitationUpdate(BaseModel):
    template_id: Literal["classic"] = "classic"
    headline: str = Field(default="", max_length=120)
    message: str = Field(default="", max_length=4000)
    quote: str | None = Field(default=None, max_length=500)
    cover_image_url: str | None = Field(default=None, max_length=500)
    gallery_image_urls: list[str] = Field(default_factory=list, max_length=20)
    closing_message: str | None = Field(default=None, max_length=500)

    @field_validator("cover_image_url")
    @classmethod
    def validate_cover_image_url(cls, value: str | None) -> str | None:
        return _clean_url(value)

    @field_validator("gallery_image_urls")
    @classmethod
    def validate_gallery_image_urls(cls, value: list[str]) -> list[str]:
        cleaned = []
        for item in value:
            url = _clean_url(item)
            if url is not None:
                cleaned.append(url)
        return cleaned


class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    template_id: str = "classic"
    headline: str = ""
    message: str = ""
    quote: str | None = None
    cover_image_url: str | None = None
    gallery_image_urls: list[str] = Field(default_factory=list)
    closing_message: str | None = None


class InvitationPreview(BaseModel):
    wedding: WeddingResponse
    invitation: InvitationResponse
