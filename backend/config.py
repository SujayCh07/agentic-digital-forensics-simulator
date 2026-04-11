"""Application configuration."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env then .env.local (later file wins)
_base = Path(__file__).parent
load_dotenv(_base / ".env")
load_dotenv(_base / ".env.local", override=True)

# Grid dimensions
GRID_WIDTH = 20
GRID_HEIGHT = 15
MAX_X = GRID_WIDTH - 1
MAX_Y = GRID_HEIGHT - 1

MAX_NPCS = 25

# Simulation timeline: 3 phases × 5 rounds each = 15 total rounds.
NUM_PHASES = 3
ROUNDS_PER_PHASE = 5
DEFAULT_NUM_ROUNDS = NUM_PHASES * ROUNDS_PER_PHASE

# Memory stream parameters (Park et al. 2023, arXiv:2304.03442).
MEMORY_TOP_K = 8
RECENCY_DECAY = 0.8
REFLECTION_THRESHOLD = 25
REFLECTION_MAX_PER_ROUND = 5

# LLM provider configuration.
# Prefer Featherless for the current ECHO setup, but allow OpenAI as a fallback
# so local development doesn't fail on a missing legacy K2 key.
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen3-0.6B")
FEATHERLESS_API_KEY = os.getenv("FEATHERLESS_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
LLM_MAX_CONCURRENCY = max(1, int(os.getenv("LLM_MAX_CONCURRENCY", "3")))
LLM_MAX_RETRIES = max(0, int(os.getenv("LLM_MAX_RETRIES", "3")))
LLM_RETRY_BASE_DELAY_S = max(0.1, float(os.getenv("LLM_RETRY_BASE_DELAY_S", "1.0")))

FEATHERLESS_BASE_URL = os.getenv(
    "FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1"
).strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").strip()

if FEATHERLESS_API_KEY:
    LLM_PROVIDER = "featherless"
    LLM_API_KEY = FEATHERLESS_API_KEY
    LLM_BASE_URL = FEATHERLESS_BASE_URL
elif OPENAI_API_KEY:
    LLM_PROVIDER = "openai"
    LLM_API_KEY = OPENAI_API_KEY
    LLM_BASE_URL = OPENAI_BASE_URL
else:
    raise RuntimeError(
        "Missing LLM credentials. Set FEATHERLESS_API_KEY in backend/.env "
        "(preferred) or OPENAI_API_KEY as a fallback."
    )

LLM_MODEL = MODEL_NAME
