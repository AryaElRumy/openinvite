from agno.db.postgres import PostgresDb
from sqlmodel import Session, create_engine

from app.core.settings import settings

engine = create_engine(settings.database_settings.DATABASE_URL, echo=True)

agent_db = PostgresDb(
    id="openinvite-agent-db",
    db_url=settings.database_settings.AGENT_DATABASE_URL,
    db_schema=settings.database_settings.AGENT_DB_SCHEMA,
)


def get_session():
    with Session(engine) as session:
        yield session
