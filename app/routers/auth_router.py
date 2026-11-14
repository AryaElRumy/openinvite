from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from app.core.security import (
    clear_session_cookie,
    get_current_user,
    hash_password,
    set_session_cookie,
    verify_password,
)
from app.models.database import User
from app.models.engine import get_session
from app.schema.auth_schema import LoginRequest, RegisterRequest, UserResponse

auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])


@auth_router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(
    payload: RegisterRequest,
    response: Response,
    session: Session = Depends(get_session),
):
    email = payload.email.lower()
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = User(email=email, password_hash=hash_password(payload.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    set_session_cookie(response, user.id)
    return user


@auth_router.post("/login", response_model=UserResponse)
def login(
    payload: LoginRequest,
    response: Response,
    session: Session = Depends(get_session),
):
    email = payload.email.lower()
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    set_session_cookie(response, user.id)
    return user


@auth_router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    clear_session_cookie(response)


@auth_router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
