from agno.agent import Agent
from agno.models.openrouter import OpenRouter
from agno.tools.hackernews import HackerNewsTools

from app.core.settings import settings
from app.models.engine import agent_db

agent = Agent(
    id="invite-assistant",
    name="Invite Assistant",
    model=OpenRouter(
        id=settings.agent_settings.MODEL_ID,
        api_key=settings.agent_settings.API_KEY,
    ),
    db=agent_db,
    tools=[HackerNewsTools()],
    instructions=(
        "You are a helpful assistant that provides information about "
        "trending startups and products."
    ),
    add_history_to_context=True,
    num_history_runs=3,
    markdown=True,
)
