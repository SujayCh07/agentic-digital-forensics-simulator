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

# LLM Configuration
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
FEATHERLESS_API_KEY = os.environ.get("FEATHERLESS_API_KEY", "")
XAI_API_KEY = os.environ.get("XAI_API_KEY", "")
K2_API_KEY = os.environ.get("K2_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY", "")
MODEL_NAME = os.environ.get("MODEL_NAME", "gpt-4o")

# EchoLocate investigator chat model
NIPS_MODEL_NAME = os.environ.get("NIPS_MODEL_NAME", "gpt-4o")

if "gpt" in MODEL_NAME.lower():
    LLM_BASE_URL = None
    LLM_MODEL = MODEL_NAME
    LLM_API_KEY = OPENAI_API_KEY
elif "gemini" in MODEL_NAME.lower():
    LLM_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
    LLM_MODEL = MODEL_NAME
    LLM_API_KEY = GEMINI_API_KEY
elif "featherless" in FEATHERLESS_API_KEY or "deepseek" in MODEL_NAME.lower():
    LLM_BASE_URL = "https://api.featherless.ai/v1"
    LLM_MODEL = "deepseek-ai/DeepSeek-V3.2"
    LLM_API_KEY = FEATHERLESS_API_KEY
elif "grok" in MODEL_NAME.lower():
    LLM_BASE_URL = "https://api.x.ai/v1"
    LLM_MODEL = MODEL_NAME
    LLM_API_KEY = XAI_API_KEY
else:
    LLM_BASE_URL = "https://api.k2think.ai/v1"
    LLM_MODEL = "MBZUAI-IFM/K2-Think-v2"
    LLM_API_KEY = K2_API_KEY
