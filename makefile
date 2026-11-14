format:
	uv run ruff format
	uv run ruff check --fix

dev:
	uv run uvicorn app.main:app --reload

dev-web:
	npm --prefix frontend run dev

build-web:
	npm --prefix frontend run build

test:
	uv run pytest -q
