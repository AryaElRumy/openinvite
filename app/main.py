import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from scalar_fastapi import get_scalar_api_reference

from app.core.settings import settings
from app.routers.auth_router import auth_router

app = FastAPI(
    title=settings.app_settings.APP_NAME, version=settings.app_settings.APP_VERSION
)

if getattr(sys, "frozen", False):
    public_path = os.path.join(sys._MEIPASS, settings.app_settings.PUBLIC_DIR)
else:
    public_path = settings.app_settings.PUBLIC_DIR

if os.path.isdir(public_path):
    app.mount("/public", StaticFiles(directory=public_path), name="public")

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app_settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.app_settings.ALLOW_METHODS,
    allow_headers=settings.app_settings.ALLOW_HEADERS,
)


@app.get("/", tags=["Default"])
async def hello():
    return {"FastAPI Edge Template": "0.1.0"}


@app.get("/health", tags=["Default"])
async def health_check():
    return {"health": "ok"}


@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    if app.openapi_url is None:
        raise ValueError("no openapi url")
    return get_scalar_api_reference(openapi_url=app.openapi_url, title=app.title)
