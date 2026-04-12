import asyncio
import sys, os
from dotenv import load_dotenv
load_dotenv(".env")
sys.path.append(".")

from graph.llm import invoke_llm_json

async def main():
    try:
        res = await invoke_llm_json("Return a JSON array with one dict inside: [{\"hello\": \"world\"}]")
        print("SUCCESS:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
