"""LLM initialization and structured invocation logic."""

import logging
from typing import Any, TypeVar
import json

from pydantic import BaseModel
from langchain_openai import ChatOpenAI

from config import LLM_API_KEY, LLM_MODEL, LLM_BASE_URL

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

def get_llm(max_tokens: int | None = None, **kwargs: Any) -> ChatOpenAI:
    llm_kwargs: dict[str, Any] = {"model": LLM_MODEL, "api_key": LLM_API_KEY}
    if LLM_BASE_URL:
        llm_kwargs["base_url"] = LLM_BASE_URL
    if max_tokens is not None:
        llm_kwargs["max_tokens"] = max_tokens

    # Default to generic OpenAI base url if NONE
    return ChatOpenAI(**llm_kwargs, **kwargs)

async def invoke_llm_structured(
    prompt: str, response_model: type[T], llm: ChatOpenAI | None = None
) -> T:
    if llm is None:
        llm = get_llm()

    try:
        # LangChain magically binds the response_model mapping explicitly to OpenAI's structured JSON spec
        structured_llm = llm.with_structured_output(response_model)
        
        # Because we're natively hitting OpenAI, hallucinating enums never happen due to the native bounds!
        return await structured_llm.ainvoke(prompt)
    except Exception as e:
        logger.warning(
            "Failed OpenAI JSON structured verification for %s: %s\n",
            response_model.__name__,
            e
        )
        raise

async def invoke_llm_json(prompt: str, llm: ChatOpenAI | None = None) -> dict:
    if llm is None:
        llm = get_llm()

    # Generic un-typed JSON dump strategy using OpenAI Native Schema bounds
    json_llm = llm.bind(response_format={"type": "json_object"})
    try:
        response = await json_llm.ainvoke([
            {"role": "system", "content": "You are a professional simulation reasoner. Return pure, valid JSON."},
            {"role": "user", "content": prompt}
        ])

        content = str(response.content)
        
        # Strip potential manual text artifacts cleanly
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.endswith("```"):
            content = content[:-3]
            
        return json.loads(content.strip())
        
    except Exception as e:
        logger.warning(f"Failed OpenAI JSON dictionary verification: {e}")
        raise
