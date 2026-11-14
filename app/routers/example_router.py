from fastapi import APIRouter

example_router = APIRouter(prefix="/api/example", tags=["Example"])


@example_router.get("/")
def get_message():
    return {"message": "Example Router"}
