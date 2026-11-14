from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, Depends, HTTPException, Response, status
from pwdlib import PasswordHash
from sqlmodel import Session

from app.core.settings import settings
from app.models.database import User
from app.models.engine import get_session

password_hash = PasswordHash.recommended()

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(user_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.app_settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"sub": user_id, "exp": expires},
        settings.app_settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token, settings.app_settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
    except jwt.PyJWTError:
        return None
    user_id = payload.get("sub")
    return user_id if isinstance(user_id, str) else None


def set_session_cookie(response: Response, user_id: str) -> None:
    response.set_cookie(
        key=settings.app_settings.COOKIE_NAME,
        value=create_access_token(user_id),
        max_age=settings.app_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=settings.app_settings.COOKIE_SECURE,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.app_settings.COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.app_settings.COOKIE_SECURE,
    )


def get_current_user(
    token: str | None = Cookie(default=None, alias=settings.app_settings.COOKIE_NAME),
    session: Session = Depends(get_session),
) -> User:
    user_id = decode_access_token(token) if token else None
    user = session.get(User, user_id) if user_id else None
    if user is None or user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user
