import os
import sys
from datetime import datetime, timezone

from agno.os import AgentOS
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from scalar_fastapi import get_scalar_api_reference

from app.core.agents import agent
from app.core.settings import settings
from app.models.engine import agent_db
from app.routers.auth_router import auth_router
from app.routers.guest_router import guest_category_router, guest_router
from app.routers.invitation_router import invitation_router
from app.routers.public_router import public_router
from app.routers.reception_router import reception_router, receptionist_router
from app.routers.wedding_router import wedding_router

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
app.include_router(wedding_router)
app.include_router(invitation_router)
app.include_router(guest_router)
app.include_router(guest_category_router)
app.include_router(public_router)
app.include_router(receptionist_router)
app.include_router(reception_router)

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


STARTED_AT = datetime.now(timezone.utc)


@app.get("/health", tags=["Default"])
async def health_check():
    # ponytail: keep the app's old key alongside AgentOS's HealthResponse shape
    return {"health": "ok", "status": "ok", "instantiated_at": STARTED_AT.isoformat()}


@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    if app.openapi_url is None:
        raise ValueError("no openapi url")
    return get_scalar_api_reference(openapi_url=app.openapi_url, title=app.title)


agent_os = AgentOS(
    id="openinvite-os",
    agents=[agent],
    db=agent_db,
    base_app=app,
    on_route_conflict="preserve_base_app",
)
app = agent_os.get_app()

frontend_dist = os.path.abspath(settings.app_settings.FRONTEND_DIST)
if os.path.isdir(frontend_dist):

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        if full_path.startswith(("api/", "public/")):
            raise HTTPException(status_code=404)

        candidate = os.path.abspath(os.path.join(frontend_dist, full_path))
        if candidate.startswith(frontend_dist + os.sep) and os.path.isfile(candidate):
            return FileResponse(candidate)

        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404)
