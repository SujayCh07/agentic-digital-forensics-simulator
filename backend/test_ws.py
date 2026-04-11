import socketio
import asyncio

sio = socketio.AsyncClient()

@sio.event
async def connect():
    print("Connected to WebSocket!")
    import requests
    res = requests.post("http://localhost:8000/simulate", json={
        "primary_policy_source_id": None,
        "policy_source_ids": [],
        "notes_text": "hello this is a text containing enough characters to just bypass it honestly hopefully",
        "trend_source_ids": [],
        "num_rounds": 1,
        "num_npcs": 2,
        "objective": "",
        "map_id": "citypack"
    })
    sim_id = res.json()["simulation_id"]
    print(f"Starting sim: {sim_id}")
    await sio.emit("start_sim", {"simulation_id": sim_id})

@sio.event
async def sim_error(data):
    print("SIM ERROR:", data)

@sio.on("done")
async def handle_done(data):
    print("SIM COMPLETE!")

@sio.on("*")
async def catch_all(event, data):
    # Only print small slice to avoid log spam
    print(f"EVENT {event}")

async def main():
    try:
        await sio.connect("http://localhost:8000", transports=["websocket"])
        await asyncio.sleep(25)
        await sio.disconnect()
    except Exception as e:
        print("EXCEPTION:", e)

asyncio.run(main())
