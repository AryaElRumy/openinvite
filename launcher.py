import os
import sys

from alembic import command
from alembic.config import Config
from loguru import logger

from app.core.settings import settings

settings.logger_settings.setup_logger()


def run_server():
    try:
        logger.info("Starting Uvicorn server...")
        if getattr(sys, "frozen", False):
            import uvicorn

            uvicorn.run(
                "app.main:app",
                host="0.0.0.0",
                port=settings.app_settings.APP_PORT,
                reload=False,
            )
        else:
            import subprocess

            proc = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--host",
                    "0.0.0.0",
                    "--port",
                    str(settings.app_settings.APP_PORT),
                    "--reload",
                ]
            )
            proc.wait()
    except Exception as e:
        logger.error(f"Error running server: {e}")
        sys.exit(1)


def main():
    try:
        logger.info("Running Alembic upgrade...")
        if getattr(sys, "frozen", False):
            bundle_dir = sys._MEIPASS
            alembic_cfg = Config(os.path.join(bundle_dir, "alembic.ini"))
            alembic_cfg.set_main_option(
                "script_location", os.path.join(bundle_dir, "alembic")
            )
        else:
            alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migration completed.")
    except Exception as e:
        logger.error(f"Error running Alembic: {e}")
        sys.exit(1)

    run_server()


if __name__ == "__main__":
    main()
