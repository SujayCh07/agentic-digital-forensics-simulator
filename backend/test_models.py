import sys, os, requests
from dotenv import load_dotenv
load_dotenv(".env")
key = os.environ.get("XAI_API_KEY")
res = requests.get("https://api.x.ai/v1/models", headers={"Authorization": f"Bearer {key}"})
print(res.json())
